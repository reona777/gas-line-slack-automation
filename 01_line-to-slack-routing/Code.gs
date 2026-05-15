// ============================================================
// LINE → Slack 自動ルーティング
// LINE Messaging API の Webhook を受信し、内容に応じて
// 適切な Slack チャンネルへ自動転送します。
// ============================================================

// ---- 設定値（実際の値に置き換えてください） ----------------
var CONFIG = {
  LINE_CHANNEL_SECRET: "YOUR_LINE_CHANNEL_SECRET",
  LINE_CHANNEL_ACCESS_TOKEN: "YOUR_LINE_CHANNEL_ACCESS_TOKEN",

  // Slack Incoming Webhook URLs（チャンネルごとに設定）
  SLACK_WEBHOOKS: {
    sales:   "https://hooks.slack.com/services/XXXX/YYYY/sales_dummy",
    support: "https://hooks.slack.com/services/XXXX/YYYY/support_dummy",
    general: "https://hooks.slack.com/services/XXXX/YYYY/general_dummy"
  }
};

// ---- キーワード → Slackチャンネル のルーティングマップ ----
var ROUTING_MAP = [
  { keywords: ["注文", "購入", "見積", "価格", "料金"],  channel: "sales"   },
  { keywords: ["問い合わせ", "不具合", "エラー", "返品"], channel: "support" }
  // 上記以外はすべて general へ
];

// ---- Webhook エントリポイント -------------------------------
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // LINE署名検証（本番では必ず有効化してください）
    // if (!verifySignature(e)) return ContentService.createTextOutput("NG");

    body.events.forEach(function(event) {
      if (event.type === "message" && event.message.type === "text") {
        handleTextMessage(event);
      }
    });
  } catch (err) {
    Logger.log("エラー: " + err.message);
  }

  return ContentService.createTextOutput("OK");
}

// ---- テキストメッセージ処理 ---------------------------------
function handleTextMessage(event) {
  var text    = event.message.text;
  var userId  = event.source.userId;
  var channel = resolveChannel(text);

  var payload = buildSlackPayload(text, userId, channel);
  postToSlack(CONFIG.SLACK_WEBHOOKS[channel], payload);
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
    payload: JSON.stringify(payload)
  };
  UrlFetchApp.fetch(webhookUrl, options);
}

// ---- LINE 署名検証（本番用） --------------------------------
function verifySignature(e) {
  var signature = e.parameter["x-line-signature"];
  var body      = e.postData.contents;
  var digest    = Utilities.computeHmacSha256Signature(
    body,
    CONFIG.LINE_CHANNEL_SECRET,
    Utilities.Charset.UTF_8
  );
  var hash = Utilities.base64Encode(digest);
  return hash === signature;
}
