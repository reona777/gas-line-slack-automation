// ============================================================
// 繰り返し作業の自動化サンプル
// 定期レポート送信・期限リマインダー・月次集計を自動化します。
// ============================================================

// ---- 設定値（実際の値に置き換えてください） ----------------
var CONFIG = {
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID_HERE",

  SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/XXXX/YYYY/recurring_dummy",
  SLACK_CHANNELS: {
    reminder: "#リマインダー",
    report:   "#月次レポート",
    checklist:"#朝会"
  }
};

// ---- ダミータスクデータ（実運用ではスプレッドシートから取得） --
var DUMMY_TASKS = [
  { id: "T001", title: "請求書送付",         deadline: "2026-05-20", assignee: "山田 太郎", priority: "高" },
  { id: "T002", title: "在庫確認レポート提出", deadline: "2026-05-17", assignee: "佐藤 花子", priority: "中" },
  { id: "T003", title: "取引先ミーティング準備", deadline: "2026-05-16", assignee: "鈴木 一郎", priority: "高" },
  { id: "T004", title: "月次売上集計",         deadline: "2026-05-31", assignee: "田中 恵子", priority: "低" }
];

// ---- 朝のデイリーチェックリスト送信（毎朝9時に実行） --------
// GASエディタ：時間ベーストリガー → 毎日 → 午前9時
function sendMorningChecklist() {
  var today   = Utilities.formatDate(new Date(), "Asia/Tokyo", "M月d日（E）");
  var dayOfW  = new Date().getDay();
  var isMonday = dayOfW === 1;

  var items = [
    ":white_check_mark: メール・LINE確認",
    ":white_check_mark: 当日スケジュール確認",
    ":white_check_mark: 在庫状況チェック"
  ];

  if (isMonday) {
    items.push(":white_check_mark: 週次売上レポート確認（月曜追加項目）");
    items.push(":white_check_mark: 週次目標の確認・共有");
  }

  var message = [
    ":sunny: *" + today + " のデイリーチェックリスト*"
  ].concat(items).join("\n");

  postToSlack({
    channel:    CONFIG.SLACK_CHANNELS.checklist,
    username:   "チェックリストBot",
    icon_emoji: ":clipboard:",
    text:       message
  });
}

// ---- 期限リマインダー（毎日正午に実行） ---------------------
// GASエディタ：時間ベーストリガー → 毎日 → 正午
function sendDeadlineReminders() {
  var today    = new Date();
  var todayStr = Utilities.formatDate(today, "Asia/Tokyo", "yyyy-MM-dd");

  // 実運用ではスプレッドシートからタスクを取得
  var tasks = getTasksFromSheet() || DUMMY_TASKS;

  var alerts = [];

  tasks.forEach(function(task) {
    var deadlineDate = new Date(task.deadline);
    var diffDays     = Math.floor((deadlineDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      alerts.push({ task: task, type: "overdue", days: Math.abs(diffDays) });
    } else if (diffDays <= 3) {
      alerts.push({ task: task, type: "near",    days: diffDays });
    }
  });

  if (alerts.length === 0) return;

  var lines = [":alarm_clock: *期限アラート*"];

  alerts.forEach(function(alert) {
    var t = alert.task;
    if (alert.type === "overdue") {
      lines.push(
        ":red_circle: *[期限超過 " + alert.days + "日]* " + t.title +
        "  担当: " + t.assignee + "  優先度: " + t.priority
      );
    } else {
      var mark = alert.days === 0 ? ":rotating_light: *[本日期限]*" :
                 ":yellow_circle: *[残り" + alert.days + "日]*";
      lines.push(mark + " " + t.title + "  担当: " + t.assignee);
    }
  });

  postToSlack({
    channel:    CONFIG.SLACK_CHANNELS.reminder,
    username:   "リマインダーBot",
    icon_emoji: ":alarm_clock:",
    text:       lines.join("\n")
  });
}

// ---- 月次集計レポート（毎月1日午前10時に実行） --------------
// GASエディタ：時間ベーストリガー → 月ベース → 毎月1日
function sendMonthlyReport() {
  var now       = new Date();
  var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var label     = Utilities.formatDate(lastMonth, "Asia/Tokyo", "yyyy年M月");

  // 実運用ではスプレッドシートの実データを集計
  var stats = getMonthlyStatsFromSheet(lastMonth) || getDummyMonthlyStats(label);

  var lines = [
    ":chart_with_upwards_trend: *" + label + " 月次レポート*",
    "受注件数: *" + stats.orderCount + "件*",
    "売上合計: *¥" + stats.totalAmount.toLocaleString() + "*",
    "前月比: " + (stats.growthRate >= 0 ? "+" : "") + stats.growthRate + "%",
    "新規顧客: " + stats.newCustomers + "社",
    "---",
    "*カテゴリ別売上*"
  ];

  stats.breakdown.forEach(function(item) {
    var bar = "█".repeat(Math.round(item.ratio / 10));
    lines.push(item.label + ": " + bar + " " + item.ratio + "%");
  });

  lines.push("---");
  lines.push("詳細はスプレッドシートをご確認ください。");

  postToSlack({
    channel:    CONFIG.SLACK_CHANNELS.report,
    username:   "月次レポートBot",
    icon_emoji: ":chart_with_upwards_trend:",
    text:       lines.join("\n")
  });
}

// ---- スプレッドシートからタスク取得（実運用用） --------------
function getTasksFromSheet() {
  try {
    var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
                              .getSheetByName("タスク管理");
    if (!sheet) return null;

    var rows = sheet.getDataRange().getValues().slice(1);
    return rows.map(function(row) {
      return {
        id:       row[0],
        title:    row[1],
        deadline: Utilities.formatDate(new Date(row[2]), "Asia/Tokyo", "yyyy-MM-dd"),
        assignee: row[3],
        priority: row[4]
      };
    }).filter(function(t) { return t.id; });
  } catch (err) {
    Logger.log("シート取得エラー（ダミーデータを使用）: " + err.message);
    return null;
  }
}

// ---- スプレッドシートから月次統計取得（実運用用） ------------
function getMonthlyStatsFromSheet(targetMonth) {
  // 実装例：スプレッドシートの受注データを集計する
  // 本デモではダミーデータを返す
  return null;
}

// ---- ダミー月次統計データ ------------------------------------
function getDummyMonthlyStats(label) {
  return {
    orderCount:   47,
    totalAmount:  3850000,
    growthRate:   12.3,
    newCustomers: 5,
    breakdown: [
      { label: "製品A", ratio: 42 },
      { label: "製品B", ratio: 31 },
      { label: "サービス", ratio: 18 },
      { label: "その他", ratio: 9 }
    ]
  };
}

// ---- Slack へ POST ------------------------------------------
function postToSlack(payload) {
  var options = {
    method:      "post",
    contentType: "application/json",
    payload:     JSON.stringify(payload)
  };
  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
}
