# GAS × LINE × Slack 業務自動化デモ

> Google Apps Script（GAS）を使った中小企業向け業務効率化のサンプル集です。
> コードのコピー＆カスタマイズだけで、LINE・Slack・スプレッドシートを連携した業務自動化を導入できます。

---

## デモ概要

| サンプル | 機能 | 使用サービス |
|---|---|---|
| [01 LINE→Slack自動ルーティング](./01_line-to-slack-routing/) | LINEメッセージをキーワードで自動振り分け | LINE Messaging API / Slack |
| [02 スプレッドシート自動同期](./02_spreadsheet-auto-sync/) | 受注登録・ステータス変更を即時Slack通知 | Google Sheets / Slack |
| [03 繰り返し作業の自動化](./03_recurring-automation/) | 朝礼チェックリスト・期限アラート・月次レポート | Google Sheets / Slack |

---

## 想定する活用シーン

- **小売・EC**：注文入力と同時に担当者へSlack通知、LINEお問い合わせを部門別に振り分け
- **製造・卸売**：在庫管理シートの更新を自動で営業チームに共有
- **士業・コンサル**：タスク期限のリマインダーと月次実績レポートを自動送信
- **飲食・サービス**：LINEからの予約・問い合わせを担当者のSlackへ即時転送

---

## 共通セットアップ手順

### 必要なもの

- Google アカウント
- LINE Developers アカウント（サンプル01使用時）
- Slack ワークスペース（Incoming Webhook 設定済み）
- Node.js（claspを使う場合）

### Clasp のインストール（任意）

ローカルからGASへデプロイする場合は [clasp](https://github.com/google/clasp) を使います。

```bash
npm install -g @google/clasp
clasp login
```

### 各サンプルの基本的な導入手順

1. [Google Apps Script](https://script.google.com/) で新しいプロジェクトを作成
2. サンプルの `Code.gs` をコピー＆ペースト
3. `CONFIG` オブジェクトの `YOUR_***` を実際の値に置き換え
4. 必要なトリガーを設定（各サンプルのREADMEを参照）
5. Webアプリとしてデプロイ（サンプル01のみ）

> **注意**: APIキー・Webhook URLなどのシークレット情報は `PropertiesService` を使って管理することを推奨します。コードに直接書かないでください。

---

## PropertiesService を使った安全な設定管理

各サンプルの `CONFIG` 内の値は、本番運用では以下のように `PropertiesService` で管理することを推奨します。

```javascript
// GASエディタの「プロジェクトのプロパティ」にキーと値を登録しておく
var props = PropertiesService.getScriptProperties();
var SLACK_WEBHOOK = props.getProperty("SLACK_WEBHOOK_URL");
```

---

## ディレクトリ構成

```
gas-line-slack-automation/
├── README.md
├── .gitignore
├── 01_line-to-slack-routing/   # LINE→Slack自動ルーティング
│   ├── .clasp.json
│   ├── appsscript.json
│   └── Code.gs
├── 02_spreadsheet-auto-sync/   # スプレッドシート自動同期
│   ├── .clasp.json
│   ├── appsscript.json
│   └── Code.gs
└── 03_recurring-automation/    # 繰り返し作業の自動化
    ├── .clasp.json
    ├── appsscript.json
    └── Code.gs
```

---

## サンプル別 詳細

### 01 LINE → Slack 自動ルーティング

LINEへのメッセージをキーワード解析し、「営業」「サポート」「総合」の各Slackチャンネルへ自動転送します。

**主な機能**
- キーワードマッチによるルーティング（カスタマイズ可能）
- LINE署名検証によるセキュリティ対応
- 送信者ID・転送先チャンネルをSlack通知に付与

**トリガー設定**
- Webアプリとしてデプロイし、URLをLINE DevelopersのWebhook URLに登録

---

### 02 スプレッドシート自動同期

スプレッドシートへの受注データ入力を検知し、リアルタイムでSlackへ通知します。

**主な機能**
- 新規行追加時の即時Slack通知（onEditトリガー）
- ステータス変更の検知・通知（定期実行）
- 前日分の受注サマリーを毎朝自動送信

**トリガー設定**

| 関数名 | トリガー種別 | タイミング |
|---|---|---|
| `onEditTrigger` | スプレッドシートから → 編集時 | 入力即時 |
| `sendDailySummary` | 時間ベース → 毎日 | 午前8時 |
| `checkStatusChanges` | 時間ベース → 分ベース | 30分ごと |

---

### 03 繰り返し作業の自動化

毎日・毎週・毎月の定型業務をGASで完全自動化するサンプルです。

**主な機能**
- 朝のデイリーチェックリスト（月曜は追加項目あり）
- タスク期限アラート（3日前・当日・超過を色分け通知）
- 月次売上レポートの自動集計・Slack送信

**トリガー設定**

| 関数名 | トリガー種別 | タイミング |
|---|---|---|
| `sendMorningChecklist` | 時間ベース → 毎日 | 午前9時 |
| `sendDeadlineReminders` | 時間ベース → 毎日 | 正午 |
| `sendMonthlyReport` | 時間ベース → 月ベース | 毎月1日 午前10時 |

---

## よくある質問

**Q. 無料で使えますか？**
GAS・LINE Messaging API（友だち数1,000人以下）・Slack（無料プラン）の組み合わせであれば、基本的に無料で運用できます。

**Q. プログラミング経験がなくても使えますか？**
各サンプルの `CONFIG` 部分を書き換えるだけで動作するよう設計しています。GASエディタの操作方法を把握していれば導入可能です。

**Q. 複数のLINEアカウントに対応できますか？**
`CONFIG` の `ROUTING_MAP` を複数設定するか、アカウントごとにGASプロジェクトを分けることで対応できます。

---

## ライセンス

MIT License — 商用・社内利用ともに自由にご活用ください。

---

## 貢献・フィードバック

Issue・Pull Request 歓迎です。「このケースにも使いたい」「こう改善できる」といったご意見もお待ちしています。
