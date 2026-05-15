# 04 Playwright × Python スクレイピング → スプレッドシート自動同期

Playwright でWebページから商品情報を取得し、Google Sheets API でスプレッドシートへ自動同期するサンプルです。
差分更新対応（既存行は上書き更新・新規行は追記）なので定期実行にも使えます。

---

## 処理フロー

```
Playwright（Chromium）
  ↓  ページネーションを辿りながら商品情報を収集
scraper.py
  ↓  Product データクラスのリストとして返す
sheets_sync.py
  ↓  既存行は更新・新規行は追記（差分同期）
Google スプレッドシート
```

---

## ファイル構成

```
04_playwright-scraping-to-sheets/
├── main.py           # エントリポイント・CLI引数処理
├── scraper.py        # Playwright スクレイピング処理・ダミーデータ定義
├── sheets_sync.py    # Google Sheets API 差分同期処理
└── requirements.txt  # 依存パッケージ
```

---

## セットアップ

### 1. 仮想環境を作成して依存パッケージをインストール

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### 2. Google Cloud でサービスアカウントを作成

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」→「ライブラリ」で **Google Sheets API** を有効化
3. 「認証情報」→「サービスアカウント」を作成し、JSONキーをダウンロード
4. ダウンロードしたJSONを `credentials.json` としてこのディレクトリに配置
   （`.gitignore` で除外済み — Gitにコミットしないこと）

### 3. スプレッドシートの共有設定

サービスアカウントのメールアドレス（`xxxxx@your-project.iam.gserviceaccount.com`）を
対象スプレッドシートに「編集者」として共有する。

---

## 実行方法

### ダミーデータで動作確認（スクレイピング不要）

```bash
python main.py --dummy --spreadsheet-id YOUR_SPREADSHEET_ID
```

### 実サイトをスクレイピングして同期

```bash
python main.py --spreadsheet-id YOUR_SPREADSHEET_ID
```

### オプション一覧

| オプション | 説明 | デフォルト |
|---|---|---|
| `--dummy` | ダミーデータを使用（スクレイピングをスキップ） | off |
| `--spreadsheet-id` | 同期先スプレッドシートID | 環境変数 `SPREADSHEET_ID` |
| `--sheet-name` | 書き込み先のシート名 | `商品一覧` |
| `--credentials` | サービスアカウントJSONのパス | `credentials.json` |
| `--no-headless` | ブラウザを表示して実行（デバッグ用） | off |

環境変数でスプレッドシートIDを渡すこともできます。

```bash
export SPREADSHEET_ID=your_spreadsheet_id
python main.py --dummy
```

---

## 同期後のスプレッドシート構成

| 商品ID | 商品名 | カテゴリ | 価格（円） | 在庫数 | 在庫状態 | URL | 最終更新日時 |
|---|---|---|---|---|---|---|---|
| P001 | ビジネスバッグ A4対応 | バッグ | 12800 | 15 | 在庫あり | https://... | 2026/05/15 09:00:00 |
| P005 | 保温タンブラー 500ml | キッチン | 2800 | 0 | 在庫切れ | https://... | 2026/05/15 09:00:00 |

---

## スクレイピング対象のカスタマイズ

`scraper.py` の `_parse_product` メソッド内のCSSセレクタを、実際のサイト構造に合わせて変更してください。

```python
# 変更例：セレクタをサイトに合わせる
name = await item.locator(".your-site__product-title").inner_text()
price_text = await item.locator(".your-site__price").inner_text()
```

`get_dummy_products()` のデータを書き換えればダミーデータのカスタマイズも可能です。

---

## 定期実行の設定例

### cron（Linux / Mac）

```cron
0 9 * * 1-5 /path/to/venv/bin/python /path/to/main.py --spreadsheet-id YOUR_ID
```

### タスクスケジューラ（Windows）

`python main.py --spreadsheet-id YOUR_ID` を平日9時に実行するタスクを登録。

### GitHub Actions

```yaml
on:
  schedule:
    - cron: "0 0 * * 1-5"  # 平日9時JST（UTC 0時）

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r 04_playwright-scraping-to-sheets/requirements.txt
      - run: playwright install chromium
      - run: python 04_playwright-scraping-to-sheets/main.py --dummy
        env:
          SPREADSHEET_ID: ${{ secrets.SPREADSHEET_ID }}
```
