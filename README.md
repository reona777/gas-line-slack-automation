# gas-line-slack-automation

> Google Apps ScriptでLINE・Slack・スプレッドシートを連携した業務自動化サンプル集

LINEメッセージの自動振り分け・受注通知・定期レポート・Webスクレイピングまで、中小企業の現場でそのまま使えるサンプルを4本収録。コードのカスタマイズだけで導入できるよう設計しています。

## 収録サンプル

| サンプル | 機能 | 使用サービス |
|---|---|---|
| [01 LINE→Slack自動ルーティング](./01_line-to-slack-routing/) | キーワードでSlackチャンネルへ自動振り分け＋双方向返信 | LINE Messaging API / Slack |
| [02 スプレッドシート自動同期](./02_spreadsheet-auto-sync/) | 受注入力を即時Slack通知・前日サマリーを毎朝送信 | Google Sheets / Slack |
| [03 繰り返し作業の自動化](./03_recurring-automation/) | 朝礼チェックリスト・期限アラート・月次レポートを自動送信 | Google Sheets / Slack |
| [04 Playwright スクレイピング→スプレッドシート同期](./04_playwright-scraping-to-sheets/) | Web商品情報を自動収集しスプレッドシートへ差分同期 | Playwright / Python / Google Sheets API |

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
LINE Webhook → GAS doPost()
  ↓  キーワードマッチ（ROUTING_MAP）
Slack 各チャンネルへ転送
  ↓  /line-reply コマンドで担当者が返信
LINEユーザーへ Push メッセージ
```

## 設計上のポイント

- 認証情報を `PropertiesService` で管理し、コードへの直書きを全サンプルで排除
- `ROUTING_MAP` の追加・変更だけでルールを拡張できるデータドリブン設計（サンプル01）
- onEditトリガー（即時）と定期実行トリガーを組み合わせた二段構えの通知設計（サンプル02）
- GAS単体では難しいヘッドレスブラウザ処理をPython + Playwrightで補完（サンプル04）

## セットアップ

```bash
npm install -g @google/clasp
clasp login
```

各サンプルの `Code.gs` を [Google Apps Script](https://script.google.com/) にコピー＆ペーストし、`CONFIG` 内の `YOUR_***` を実際の値に置き換えてください。

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

## ライセンス

MIT License
