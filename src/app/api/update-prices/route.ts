import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const AFFILIATE_TAG = 'abdelkhaliqst-21';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
};

function withAffiliateTag(url: string): string {
  if (!url) return '#';
  const cleanUrl = url.split('?')[0];
  return `${cleanUrl}?tag=${AFFILIATE_TAG}`;
}

async function scrapeAmazonEgypt(url: string) {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('#productTitle').text().trim() || $('h1').first().text().trim();
    if (!title) return null;

    const priceText =
      $('.a-price .a-offscreen').first().text() || $('.a-price-whole').first().text();
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    const image = $('#landingImage').attr('src') || $('img').first().attr('src') || '';

    const pageText = $.text();
    const isUnavailable =
      pageText.includes('غير متوفر حالياً') ||
      pageText.includes('Currently Unavailable') ||
      pageText.includes('لا نعرف متى أو فيما إذا كان هذا المنتج سيتوفر مرة أخرى');

    const inStock = price > 0 && !isUnavailable;

    return { title, price, image, inStock };
  } catch (error) {
    console.error('Amazon scrape error:', error);
    return null;
  }
}

async function collectProductsFromSection(params: {
  sourceUrl: string;
  limit: number;
  uniqueAsins: Set<string>;
  targetList: any[];
  brand: string;
  summary: string;
  categoryLabel: string;
}) {
  const { sourceUrl, limit, uniqueAsins, targetList, brand, summary, categoryLabel } = params;

  const response = await fetch(sourceUrl, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) return;

  const html = await response.text();
  const regex = /\/dp\/([A-Z0-9]{10})/g;
  let match: RegExpExecArray | null;
  let addedCount = 0;

  while ((match = regex.exec(html)) !== null && addedCount < limit) {
    const asin = match[1].toLowerCase();
    if (uniqueAsins.has(asin)) continue;
    uniqueAsins.add(asin);

    const fullUrl = `https://www.amazon.eg/dp/${match[1]}`;
    const affiliateUrl = withAffiliateTag(fullUrl);
    const scraped = await scrapeAmazonEgypt(fullUrl);

    if (scraped && scraped.inStock && scraped.price > 0 && scraped.title) {
      targetList.push({
        slug: `product-${asin}`,
        title: scraped.title,
        brand,
        image:
          scraped.image ||
          'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg',
        summary,
        specs: {
          المصدر: 'أمازون مصر',
          التصنيف: categoryLabel,
          الحالة: 'متوفر',
        },
        offers: [
          {
            merchant: 'أمازون مصر',
            price: scraped.price,
            currency: 'ج.م',
            inStock: scraped.inStock,
            affiliateUrl,
          },
        ],
      });
      addedCount++;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'my-secret-key-2026') {
    return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
  }

  try {
    const uniqueAsins = new Set<string>();
    const temporaryProducts: any[] = [];

    // 1. سحب 6 منتجات "تريند يومي" في المقدمة
    await collectProductsFromSection({
      sourceUrl: 'https://www.amazon.eg/-/ar/gp/bestsellers/',
      limit: 6,
      uniqueAsins,
      targetList: temporaryProducts,
      brand: 'تريند أمازون اليومي',
      summary: 'تم رصد هذا المنتج وجلبه تلقائياً من قائمة الأكثر رواجاً اليوم.',
      categoryLabel: 'تريند يومي',
    });

    // 2. سحب 9 موبايلات من قسم الهواتف اللاسلكية
    await collectProductsFromSection({
      sourceUrl: 'https://www.amazon.eg/-/ar/gp/bestsellers/wireless/',
      limit: 9,
      uniqueAsins,
      targetList: temporaryProducts,
      brand: 'موبايلات الأكثر طلباً',
      summary: 'هاتف ذكي مطلوب بشدة في السوق المصري مع تحديث فوري للأسعار.',
      categoryLabel: 'موبايلات (طلب عالي)',
    });

    // 3. سحب 27 منتج من قسم الإلكترونيات والأجهزة
    await collectProductsFromSection({
      sourceUrl: 'https://www.amazon.eg/-/ar/gp/bestsellers/electronics/',
      limit: 27,
      uniqueAsins,
      targetList: temporaryProducts,
      brand: 'أجهزة وإلكترونيات مطلوبة',
      summary: 'منتج إلكتروني مطلوب وعالي البحث في السوق المصري.',
      categoryLabel: 'إلكترونيات وأجهزة (طلب عالي)',
    });

    const filePath = path.join(process.cwd(), 'src/data/products.json');
    try {
      fs.writeFileSync(filePath, JSON.stringify(temporaryProducts, null, 2), 'utf8');
    } catch (writeError) {
      console.warn('Could not write products.json at runtime:', writeError);
    }

    return NextResponse.json({
      success: true,
      message: `تم جلب المنتجات بنجاح. الإجمالي: ${temporaryProducts.length} (6 تريند + 9 موبايلات + 27 إلكترونيات)`,
      totalProducts: temporaryProducts.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'حدث خطأ في السيرفر' }, { status: 500 });
  }
}