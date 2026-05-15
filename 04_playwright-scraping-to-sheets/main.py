"""Playwright スクレイピング → スプレッドシート自動同期 エントリポイント"""
import argparse
import asyncio
import os
import sys

from scraper import ProductScraper, get_dummy_products
from sheets_sync import SheetsSync


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="商品情報をスクレイピングしてスプレッドシートへ同期します"
    )
    parser.add_argument(
        "--dummy",
        action="store_true",
        help="ダミーデータを使用（スクレイピングをスキップ）",
    )
    parser.add_argument(
        "--spreadsheet-id",
        default=os.getenv("SPREADSHEET_ID"),
        help="同期先スプレッドシートID",
    )
    parser.add_argument(
        "--sheet-name",
        default="商品一覧",
        help="シート名（デフォルト: 商品一覧）",
    )
    parser.add_argument(
        "--credentials",
        default="credentials.json",
        help="サービスアカウントJSONのパス（デフォルト: credentials.json）",
    )
    parser.add_argument(
        "--no-headless",
        action="store_true",
        help="ブラウザを表示して実行（デバッグ用）",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    if not args.spreadsheet_id:
        print("エラー: --spreadsheet-id または環境変数 SPREADSHEET_ID を指定してください")
        sys.exit(1)

    # スクレイピング
    if args.dummy:
        print("ダミーデータを使用します（スクレイピングをスキップ）")
        products = get_dummy_products()
    else:
        print("スクレイピングを開始します...")
        scraper = ProductScraper(headless=not args.no_headless)
        products = await scraper.scrape_all()

    print(f"取得件数: {len(products)} 件")

    # スプレッドシート同期
    print("スプレッドシートへ同期中...")
    syncer = SheetsSync(
        spreadsheet_id=args.spreadsheet_id,
        sheet_name=args.sheet_name,
        credentials_path=args.credentials,
    )
    syncer.ensure_header()
    result = syncer.sync(products)

    print(
        f"同期完了: 追加 {result['appended']} 件 / "
        f"更新 {result['updated']} 件 / "
        f"合計 {result['total']} 件"
    )


if __name__ == "__main__":
    asyncio.run(main())
