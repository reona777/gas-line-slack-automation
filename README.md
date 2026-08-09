# gas-line-slack-automation

> Google Apps ScriptでLINE・Slack・スプレッドシートを連携した業務自動化サンプル集

LINEメッセージの自動振り分け・受注通知・定期レポート・Webスクレイピングまで、中小企業の現場でそのまま使えるサンプルを4本収録。設定値を入れるだけで導入できるよう設計しています。

## 収録サンプル

| サンプル | 機能 | 使用サービス |
|---|---|---|
| [01 LINE→Slack自動ルーティング](./01_line-to-slack-routing/) | キーワードでSlackチャンネルへ自動振り分け（合言葉認証・再送の排除つき） | LINE Messaging API / Slack |
| [02 スプレッドシート自動同期](./02_spreadsheet-auto-sync/) | 受注入力を即時Slack通知・前日サマリーを毎朝送信 | Google Sheets / Slack |
| [03 繰り返し作業の自動化](./03_recurring-automation/) | 朝礼チェックリスト・期限アラート・月次レポートを自動送信 | Google Sheets / Slack |
| [04 Playwright スクレイピング→スプレッドシート同期](./04_playwright-scraping-to-sheets/) | Web商品情報を自動収集しスプレッドシートへ差分同期 | Playwright / Python / Google Sheets API |

## 背景・導入経緯

業務自動化に取り組む中で、LINE・Slack・スプレッドシートを組み合わせたパターンを繰り返し実装する機会があった。毎回ゼロから書き直すのではなく、再利用できる形でまとめておくことを目的に作成した。

GASはサーバー不要・Googleサービスとの連携が容易という点で中小企業や個人の業務自動化に適しており、実務で動かしたパターンを汎用化してテンプレート集にしている。GAS単体では難しいヘッドレスブラウザ処理はPython + Playwrightで補完する構成もサンプルとして収録した。

## 技術スタック

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)
![LINE](https://img.shields.io/badge/LINE-00C300?style=flat&logo=line&logoColor=white)
![Slack](https://img.shields.io/badge/Slack-4A154B?style=flat&logo=slack&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)

## アーキテクチャ（サンプル01）

```
LINEユーザー
  ↓  メッセージ送信
LINE Webhook（?token=合言葉）
  ↓
GAS doPost() ─ 合言葉を照合 → 再送を CacheService で排除
  ↓  キーワードマッチ（ROUTING_MAP）
Slack 各チャンネルへ転送
```

## 設計上のポイント

- 認証情報を `PropertiesService` で管理し、コードへの直書きを全サンプルで排除
- `ROUTING_MAP` の追加・変更だけでルールを拡張できるデータドリブン設計（サンプル01）
- Webhookの再送を `CacheService` で冪等に処理し、同じメッセージが何度も流れるのを防止（サンプル01）
- onEditトリガー（即時）と定期実行トリガーを組み合わせた二段構えの通知設計（サンプル02）
- GAS単体では難しいヘッドレスブラウザ処理をPython + Playwrightで補完（サンプル04）

## GASでWebhookを受けるときに知っておくこと

サンプル01は単なる転送ではなく、GASでWebhookを受ける際に実際に問題になる2点に対処しています。

**GASの `doPost` はリクエストヘッダーを読めない。**
そのため、LINEの `x-line-signature` を使った署名検証はGAS単体では実装できません（`e` に渡ってくるのは `parameter` と `postData` などで、ヘッダーは含まれません）。代わりに、推測できない合言葉をクエリ文字列に付けて呼ばせ、GAS側で照合しています。

```
Webhook URL: https://script.google.com/macros/s/xxxx/exec?token=<合言葉>
```

署名検証が要件なら、GASの前段に検証できる実行環境を置く必要があります。**「本番では署名検証を有効にしてください」とコメントしておくだけでは、有効にできません。**

**Webhookは再送される。**
応答が遅れると、LINEもSlackも同じイベントを再送します。何もしないと同じ内容がSlackに何度も流れます。イベントIDを `CacheService` に記録して弾きますが、**「確認」と「記録」の間に再送が割り込むと二重投稿になる**ため、スクリプトロックで原子的に行います。

このとき**ロックの中でスプレッドシートを触らないこと**。シートのI/Oは分単位でかかることがあり、その間ロックを握り続けると、後続の再送がロック待ちで落ちて逆に届かなくなります。判定は `CacheService` だけで完結させ、記録が必要ならロックの外に出します。

## セットアップ

```bash
npm install -g @google/clasp
clasp login
```

各サンプルの `Code.gs` を [Google Apps Script](https://script.google.com/) にコピー＆ペーストし、**「プロジェクトの設定 → スクリプトプロパティ」に値を登録**してください。コードの書き換えは不要です。

### サンプル01

| プロパティ名 | 説明 |
|---|---|
| `WEBHOOK_TOKEN` | Webhook URLに付ける合言葉（未設定なら検証しない） |
| `SLACK_WEBHOOK_SALES` | 営業チャンネルの Incoming Webhook URL |
| `SLACK_WEBHOOK_SUPPORT` | サポートチャンネルの Incoming Webhook URL |
| `SLACK_WEBHOOK_GENERAL` | 総合チャンネルの Incoming Webhook URL |

### サンプル02

| プロパティ名 | 説明 |
|---|---|
| `SPREADSHEET_ID` | 対象スプレッドシートのID |
| `SHEET_NAME` | シート名（既定: `受注管理`） |
| `SLACK_WEBHOOK_URL` | Incoming Webhook URL |
| `SLACK_CHANNEL_NOTIFY` | 即時通知先（既定: `#営業通知`） |
| `SLACK_CHANNEL_SUMMARY` | サマリー送信先（既定: `#日次レポート`） |

### サンプル03

| プロパティ名 | 説明 |
|---|---|
| `SPREADSHEET_ID` | 対象スプレッドシートのID |
| `SLACK_WEBHOOK_URL` | Incoming Webhook URL |
| `SLACK_CHANNEL_REMINDER` | 期限リマインダー送信先（既定: `#リマインダー`） |
| `SLACK_CHANNEL_REPORT` | 月次レポート送信先（既定: `#月次レポート`） |
| `SLACK_CHANNEL_CHECKLIST` | 朝礼チェックリスト送信先（既定: `#朝会`） |

サンプル04はPythonなので、[04のREADME](./04_playwright-scraping-to-sheets/) を参照してください。

## ディレクトリ構成

```
gas-line-slack-automation/
├── 01_line-to-slack-routing/   # LINE→Slack自動ルーティング
│   ├── .clasp.json
│   ├── appsscript.json
│   └── Code.gs
├── 02_spreadsheet-auto-sync/   # スプレッドシート自動同期
│   ├── .clasp.json
│   ├── appsscript.json
│   └── Code.gs
├── 03_recurring-automation/    # 繰り返し作業の自動化
│   ├── .clasp.json
│   ├── appsscript.json
│   └── Code.gs
└── 04_playwright-scraping-to-sheets/   # スクレイピング→スプレッドシート同期
    ├── main.py
    ├── scraper.py
    ├── sheets_sync.py
    ├── requirements.txt
    └── README.md
```

各サンプルは独立したGASプロジェクトです（それぞれに `.clasp.json` があります）。

## ライセンス

MIT License
