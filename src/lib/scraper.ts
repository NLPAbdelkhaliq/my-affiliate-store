import * as cheerio from 'cheerio';

export interface ScrapedProduct {
  title: string;
  price: number;
  image: string;
  inStock: boolean;
}

// ... (دوال أمازون القديمة موجودة زي ما هي)

// دالة سحب بيانات منتج من نون مصر
export async function scrapeNoonEgypt(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // سحب عنوان المنتج من نون
    const title = $('h1').first().text().trim();
    if (!title) return null;

    // سحب صورة المنتج الرئيسية من نون
    const image = $('img[data-qa="product-image"]').attr('src') || $('img').first().attr('src') || '';

    // سحب السعر من نون (نون بيستخدم كلاسات خاصة بالأسعار)
    const priceText = $('div[data-qa="price-value"]').text() || $('.amount').first().text();
    const finalPrice = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;

    // التحقق من توفر المنتج
    const inStock = !html.includes('Currently Unavailable') && !html.includes('غير متوفر');

    return {
      title,
      price: finalPrice,
      image,
      inStock,
    };
  } catch (error) {
    console.error('Noon scraping failed:', error);
    return null;
  }
}