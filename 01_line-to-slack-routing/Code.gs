// ============================================================
// LINE → Slack 自動ルーティング
// LINE Messaging API の Webhook を受信し、内容に応じて
// 適切な Slack チャンネルへ自動転送します。
// ============================================================

// ---- 設定値 --------------------------------------------------
// 「プロジェクトの設定 → スクリプトプロパティ」に登録してください。
// コードに直接書くと、リポジトリを共有した時点で漏れます。
var PROPS = PropertiesService.getScriptProperties();

var CONFIG = {
  // Webアプリを守る合言葉。Webhook URL に ?token=... を付けて呼ばせる（下記参照）
  WEBHOOK_TOKEN: PROPS.getProperty("WEBHOOK_TOKEN"),

  // Slack Incoming Webhook URLs（チャンネルごとに設定）
  SLACK_WEBHOOKS: {
    sales:   PROPS.getProperty("SLACK_WEBHOOK_SALES"),
    support: PROPS.getProperty("SLACK_WEBHOOK_SUPPORT"),
    general: PROPS.getProperty("SLACK_WEBHOOK_GENERAL")
  }
};

// ---- キーワード → Slackチャンネル のルーティングマップ ----
var ROUTING_MAP = [
  { keywords: ["注文", "購入", "見積", "価格", "料金"],  channel: "sales"   },
  { keywords: ["問い合わせ", "不具合", "エラー", "返品"], channel: "support" }
  // 上記以外はすべて general へ
];

// 処理済みイベントを覚えておく時間。LINEの再送ウィンドウより十分長く取る
var EVENT_TTL_SEC = 21600;   // 6時間

// ---- Webhook エントリポイント -------------------------------
function doPost(e) {
  try {
    if (!isAuthorized(e)) {
      Logger.log("合言葉が一致しないリクエストを拒否しました");
      return ContentService.createTextOutput("NG");
    }

    var body = JSON.parse(e.postData.contents);

    (body.events || []).forEach(function(event) {
      if (event.type !== "message" || event.message.type !== "text") return;

      // 応答が遅れると LINE は同じイベントを再送してくる。
      // 何もしないと同じ内容が Slack に何度も流れる。
      if (!claimEvent(eventKey(event))) return;

      handleTextMessage(event);
    });
  } catch (err) {
    Logger.log("エラー: " + err.message);
  }

  return ContentService.createTextOutput("OK");
}

// ---- 呼び出し元の確認 ---------------------------------------
// GAS の doPost はリクエストヘッダーを読めないため、
// LINE の x-line-signature による署名検証はGAS単体では実装できない。
// 代わりに、推測できない合言葉をクエリ文字列に付けて呼ばせる。
//
//   Webhook URL: https://script.google.com/macros/s/xxxx/exec?token=<合言葉>
//
// 署名検証が必須の要件なら、GAS の前段に検証できる実行環境を置く。
function isAuthorized(e) {
  if (!CONFIG.WEBHOOK_TOKEN) return true;   // 未設定なら検証しない（開発用）
  var given = (e && e.parameter) ? e.parameter.token : "";
  return String(given || "") === CONFIG.WEBHOOK_TOKEN;
}

// ---- 再送の排除 ---------------------------------------------
function eventKey(event) {
  // webhookEventId があればそれを使う。無ければメッセージIDで代用する
  return event.webhookEventId || (event.message && event.message.id) || "";
}

/**
 * このイベントを処理してよければ true を返す。
 * 「確認」と「記録」の間に再送が割り込むと二重投稿になるため、
 * スクリプトロックで原子的に行う。
 *
 * ロックの中でスプレッドシートを触らないこと。シートのI/Oは分単位でかかることがあり、
 * その間ロックを握り続けると、後続の再送がロック待ちで落ちて逆に届かなくなる。
 * 判定は CacheService だけで完結させる。
 */
function claimEvent(key) {
  if (!key) return true;   // 判定材料が無いときは通す（取りこぼすより重複のほうがまし）

  var cache = CacheService.getScriptCache();
  var lock  = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    Logger.log("ロック取得に失敗: " + key);
    return false;
  }
  try {
    if (cache.get(key)) return false;   // 処理済み
    cache.put(key, "1", EVENT_TTL_SEC);
    return true;
  } finally {
    lock.releaseLock();
  }
}

// ---- テキストメッセージ処理 ---------------------------------
function handleTextMessage(event) {
  var text    = event.message.text;
  var userId  = event.source.userId;
  var channel = resolveChannel(text);

  var webhookUrl = CONFIG.SLACK_WEBHOOKS[channel];
  if (!webhookUrl) {
    Logger.log("Slack Webhook URL が未設定です: " + channel);
    return;
  }

  postToSlack(webhookUrl, buildSlackPayload(text, userId, channel));
}

// ---- ルーティング判定 ---------------------------------------
function resolveChannel(text) {
  for (var i = 0; i < ROUTING_MAP.length; i++) {
    var rule = ROUTING_MAP[i];
    for (var j = 0; j < rule.keywords.length; j++) {
      if (text.indexOf(rule.keywords[j]) !== -1) {
        return rule.channel;
      }
    }
  }
  return "general";
}

// ---- Slack メッセージ組み立て --------------------------------
function buildSlackPayload(text, userId, channel) {
  var channelLabel = {
    sales:   ":moneybag: 営業チャンネル",
    support: ":wrench: サポートチャンネル",
    general: ":speech_balloon: 総合チャンネル"
  };

  return {
    username: "LINE Bot",
    icon_emoji: ":line:",
    text: [
      "*LINEメッセージ受信*",
      "送信者ID: `" + userId + "`",
      "転送先: " + (channelLabel[channel] || channel),
      "---",
      text
    ].join("\n")
  };
}

// ---- Slack へ POST ------------------------------------------
function postToSlack(webhookUrl, payload) {
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var res = UrlFetchApp.fetch(webhookUrl, options);
  if (res.getResponseCode() !== 200) {
    Logger.log("Slack送信失敗: HTTP " + res.getResponseCode() + " / " + res.getContentText());
  }
  return res;
}
