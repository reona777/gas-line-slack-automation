// ============================================================
// スプレッドシート自動同期
// スプレッドシートへの新規行追加を検知し、Slack へ通知します。
// また定期実行で前日分のサマリーを送信します。
// ============================================================

// ---- 設定値（実際の値に置き換えてください） ----------------
var CONFIG = {
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE",
  SHEET_NAME: "受注管理",

  SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/XXXX/YYYY/spreadsheet_dummy",
  SLACK_CHANNEL_NOTIFY:  "#営業通知",
  SLACK_CHANNEL_SUMMARY: "#日次レポート"
};

// スプレッドシートの列定義（A列=0始まり）
var COLUMNS = {
  DATE:       0,  // 受注日
  ORDER_ID:   1,  // 注文番号
  CUSTOMER:   2,  // 顧客名（ダミーデータを使用）
  PRODUCT:    3,  // 商品名
  QUANTITY:   4,  // 数量
  AMOUNT:     5,  // 金額
  STATUS:     6,  // ステータス
  ASSIGNEE:   7   // 担当者
};

// ---- onEdit トリガー（新規行追加を検知） --------------------
// GASエディタ上でこの関数を「編集時」トリガーに設定してください。
function onEditTrigger(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;

  // 新規行追加（A列に値が入った行のみ処理）
  var row = e.range.getRow();
  if (row <= 1) return; // ヘッダー行はスキップ

  var data = sheet.getRange(row, 1, 1, 8).getValues()[0];
  if (!data[COLUMNS.ORDER_ID]) return; // 注文番号が空なら無視

  notifyNewOrder(data);
}

// ---- 新規受注通知 -------------------------------------------
function notifyNewOrder(row) {
  var message = [
    ":new: *新規受注が登録されました*",
    "注文番号: `" + row[COLUMNS.ORDER_ID] + "`",
    "顧客名: " + row[COLUMNS.CUSTOMER],
    "商品: " + row[COLUMNS.PRODUCT] + " × " + row[COLUMNS.QUANTITY] + "個",
    "金額: ¥" + Number(row[COLUMNS.AMOUNT]).toLocaleString(),
    "担当: " + row[COLUMNS.ASSIGNEE],
    "ステータス: " + row[COLUMNS.STATUS]
  ].join("\n");

  postToSlack(CONFIG.SLACK_WEBHOOK_URL, {
    channel:    CONFIG.SLACK_CHANNEL_NOTIFY,
    username:   "受注管理Bot",
    icon_emoji: ":clipboard:",
    text:       message
  });
}

// ---- 日次サマリー（時間ベーストリガーで毎朝8時に実行） -----
// GASエディタ上で「時間ベース → 毎日 → 午前8時」に設定してください。
function sendDailySummary() {
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                            .getSheetByName(CONFIG.SHEET_NAME);
  var data  = sheet.getDataRange().getValues();

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yStr = Utilities.formatDate(yesterday, "Asia/Tokyo", "yyyy/MM/dd");

  var orders = data.slice(1).filter(function(row) {
    var d = row[COLUMNS.DATE];
    if (!d) return false;
    return Utilities.formatDate(new Date(d), "Asia/Tokyo", "yyyy/MM/dd") === yStr;
  });

  if (orders.length === 0) {
    postToSlack(CONFIG.SLACK_WEBHOOK_URL, {
      channel:  CONFIG.SLACK_CHANNEL_SUMMARY,
      username: "日次レポートBot",
      icon_emoji: ":bar_chart:",
      text: yStr + " の受注はありませんでした。"
    });
    return;
  }

  var total = orders.reduce(function(sum, row) {
    return sum + Number(row[COLUMNS.AMOUNT]);
  }, 0);

  var summary = [
    ":bar_chart: *日次受注サマリー（" + yStr + "）*",
    "件数: " + orders.length + "件",
    "合計金額: ¥" + total.toLocaleString(),
    "---"
  ];

  orders.forEach(function(row) {
    summary.push(
      "• " + row[COLUMNS.ORDER_ID] + " / " +
      row[COLUMNS.CUSTOMER] + " / ¥" +
      Number(row[COLUMNS.AMOUNT]).toLocaleString()
    );
  });

  postToSlack(CONFIG.SLACK_WEBHOOK_URL, {
    channel:    CONFIG.SLACK_CHANNEL_SUMMARY,
    username:   "日次レポートBot",
    icon_emoji: ":bar_chart:",
    text:       summary.join("\n")
  });
}

// ---- ステータス変更監視（定期実行：30分ごと推奨） -----------
function checkStatusChanges() {
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                            .getSheetByName(CONFIG.SHEET_NAME);
  var data  = sheet.getDataRange().getValues();

  // PropertiesServiceで前回チェック時のステータスと比較
  var props = PropertiesService.getScriptProperties();

  data.slice(1).forEach(function(row, index) {
    var orderId    = row[COLUMNS.ORDER_ID];
    var status     = row[COLUMNS.STATUS];
    if (!orderId) return;

    var key      = "status_" + orderId;
    var prevStatus = props.getProperty(key);

    if (prevStatus && prevStatus !== status) {
      postToSlack(CONFIG.SLACK_WEBHOOK_URL, {
        channel:    CONFIG.SLACK_CHANNEL_NOTIFY,
        username:   "受注管理Bot",
        icon_emoji: ":arrows_counterclockwise:",
        text: [
          ":arrows_counterclockwise: *ステータス変更*",
          "注文番号: `" + orderId + "`",
          prevStatus + " → *" + status + "*"
        ].join("\n")
      });
    }
    props.setProperty(key, status);
  });
}

// ---- Slack へ POST ------------------------------------------
function postToSlack(webhookUrl, payload) {
  var options = {
    method:      "post",
    contentType: "application/json",
    payload:     JSON.stringify(payload)
  };
  UrlFetchApp.fetch(webhookUrl, options);
}
