"""Playwright を使ったWebスクレイピングモジュール"""
import asyncio
from dataclasses import dataclass
from typing import Optional

from playwright.async_api import async_playwright, Page


@dataclass
class Product:
    product_id: str
    name: str
    category: str
    price: int
    stock: int
    url: str


class ProductScraper:
    """商品情報スクレイパー（ダミーECサイト対応）"""

    BASE_URL = "https://dummy-ec-site.example.com"  # 架空のダミーURL

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def scrape_all(self) -> list[Product]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            page = await browser.new_page()
            products = await self._scrape_pages(page)
            await browser.close()
        return products

    async def _scrape_pages(self, page: Page) -> list[Product]:
        products = []
        current_page = 1

        while True:
            url = f"{self.BASE_URL}/products?page={current_page}"
            await page.goto(url, wait_until="networkidle")

            items = await self._scrape_page(page)
            if not items:
                break

            products.extend(items)

            # 次ページボタンが無ければ終了
            next_btn = page.locator("a.pagination__next")
            if not await next_btn.is_visible():
                break

            current_page += 1

        return products

    async def _scrape_page(self, page: Page) -> list[Product]:
        products = []
        items = page.locator(".product-card")
        count = await items.count()

        for i in range(count):
            product = await self._parse_product(items.nth(i))
            if product:
                products.append(product)

        return products

    async def _parse_product(self, item) -> Optional[Product]:
        try:
            product_id = await item.get_attribute("data-product-id") or ""
            name = await item.locator(".product-card__name").inner_text()
            category = await item.locator(".product-card__category").inner_text()
            price_text = await item.locator(".product-card__price").inner_text()
            stock_text = await item.locator(".product-card__stock").inner_text()
            href = await item.locator("a").get_attribute("href") or ""

            price = int(price_text.replace("¥", "").replace(",", "").strip())
            stock = int(stock_text.replace("在庫:", "").replace("個", "").strip())

            return Product(
                product_id=product_id,
                name=name.strip(),
                category=category.strip(),
                price=price,
                stock=stock,
                url=f"{self.BASE_URL}{href}",
            )
        except Exception:
            return None


def get_dummy_products() -> list[Product]:
    """テスト・デモ用のダミー商品データを返す"""
    return [
        Product("P001", "ビジネスバッグ A4対応", "バッグ", 12800, 15,
                "https://dummy-ec-site.example.com/products/P001"),
        Product("P002", "ワイヤレスイヤホン Pro", "家電", 8900, 42,
                "https://dummy-ec-site.example.com/products/P002"),
        Product("P003", "デスクオーガナイザー", "文具", 3200, 8,
                "https://dummy-ec-site.example.com/products/P003"),
        Product("P004", "ノートPC スタンド 折りたたみ", "PC周辺機器", 5500, 27,
                "https://dummy-ec-site.example.com/products/P004"),
        Product("P005", "保温タンブラー 500ml", "キッチン", 2800, 0,
                "https://dummy-ec-site.example.com/products/P005"),
        Product("P006", "USBハブ 7ポート", "PC周辺機器", 4200, 19,
                "https://dummy-ec-site.example.com/products/P006"),
        Product("P007", "ケーブル収納ボックス", "文具", 1980, 33,
                "https://dummy-ec-site.example.com/products/P007"),
        Product("P008", "メカニカルキーボード", "PC周辺機器", 15800, 6,
                "https://dummy-ec-site.example.com/products/P008"),
    ]
