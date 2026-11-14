import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

async function scrapeAmazonEgypt(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('#productTitle').text().trim() || $('h1').first().text().trim();
    if (!title) return null;

    const priceText = $('.a-price .a-offscreen').first().text() || $('.a-price-whole').first().text();
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    const image = $('#landingImage').attr('src') || $('img').first().attr('src') || '';

    const pageText = $.text();
    const isUnavailable = pageText.includes('غير متوفر حالياً') || 
                          pageText.includes('Currently Unavailable') || 
                          pageText.includes('لا نعرف متى أو فيما إذا كان هذا المنتج سيتوفر مرة أخرى');

    const inStock = price > 0 && !isUnavailable;

    return { title, price, image, inStock };
  } catch (error) {
    console.error('Amazon scrape error:', error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'my-secret-key-2026') {
    return NextResponse.json({ error: 'غير مصرح لك' }, { status: 401 });
  }

  try {
    const filePath = path.join(process.cwd(), 'src/data/products.json');
    let products: any[] = [];
    
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');
      products = JSON.parse(fileData);
    } catch {
      products = [];
    }

    const uniqueAsins = new Set<string>();
    const temporaryProducts: any[] = [];

    // 1. سحب 6 منتجات "تريند يومي" في المقدمة
    const bestSellerUrl = 'https://www.amazon.eg/-/ar/gp/bestsellers/';
    const bsResponse = await fetch(bestSellerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-EG,ar;q=0.9',
      },
    });

    if (bsResponse.ok) {
      const html = await bsResponse.text();
      const regex = /\/dp\/([A-Z0-9]{10})/g;
      let match;

      while ((match = regex.exec(html)) !== null && temporaryProducts.length < 6) {
        const asin = match[1].toLowerCase();
        if (uniqueAsins.has(asin)) continue;
        uniqueAsins.add(asin);

        const fullUrl = `https://www.amazon.eg/dp/${match[1]}`;
        const scraped = await scrapeAmazonEgypt(fullUrl);

        if (scraped && scraped.inStock && scraped.price > 0 && scraped.title) {
          temporaryProducts.push({
            slug: `product-trend-${asin}`,
            title: scraped.title,
            brand: 'تريند أمازون اليومي',
            image: scraped.image || 'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg',
            summary: 'تم رصد هذا المنتج وجلبه تلقائياً من قائمة الأكثر رواجاً اليوم.',
            specs: { 'المصدر': 'أمازون مصر', 'التصنيف': 'تريند يومي', 'الحالة': 'متوفر' },
            offers: [{ merchant: 'أمازون مصر', price: scraped.price, currency: 'ج.م', inStock: scraped.inStock, affiliateUrl: fullUrl }]
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    // 2. سحب 9 موبايلات من قسم الهواتف اللاسلكية
    const phonesUrl = 'https://www.amazon.eg/-/ar/gp/bestsellers/wireless/';
    const phResponse = await fetch(phonesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-EG,ar;q=0.9',
      },
    });

    if (phResponse.ok) {
      const html = await phResponse.text();
      const regex = /\/dp\/([A-Z0-9]{10})/g;
      let match;
      let phoneCount = 0;

      while ((match = regex.exec(html)) !== null && phoneCount < 9) {
        const asin = match[1].toLowerCase();
        if (uniqueAsins.has(asin)) continue;
        uniqueAsins.add(asin);

        const fullUrl = `https://www.amazon.eg/dp/${match[1]}`;
        const scraped = await scrapeAmazonEgypt(fullUrl);

        if (scraped && scraped.inStock && scraped.price > 0 && scraped.title) {
          temporaryProducts.push({
            slug: `product-phone-${asin}`,
            title: scraped.title,
            brand: 'موبايلات الأكثر طلباً',
            image: scraped.image || 'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg',
            summary: 'هاتف ذكي مطلوب بشدة في السوق المصري مع تحديث فوري للأسعار.',
            specs: { 'المصدر': 'أمازون مصر', 'التصنيف': 'موبايلات (طلب عالي)', 'الحالة': 'متوفر' },
            offers: [{ merchant: 'أمازون مصر', price: scraped.price, currency: 'ج.م', inStock: scraped.inStock, affiliateUrl: fullUrl }]
          });
          phoneCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    // 3. سحب 27 منتج من باقي المنتجات المطلوبة (من قسم الإلكترونيات والأجهزة)
    const electronicsUrl = 'https://www.amazon.eg/-/ar/gp/bestsellers/electronics/';
    const elResponse = await fetch(electronicsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'ar-EG,ar;q=0.9',
      },
    });

    if (elResponse.ok) {
      const html = await elResponse.text();
      const regex = /\/dp\/([A-Z0-9]{10})/g;
      let match;
      let elCount = 0;

      while ((match = regex.exec(html)) !== null && elCount < 27) {
        const asin = match[1].toLowerCase();
        if (uniqueAsins.has(asin)) continue;
        uniqueAsins.add(asin);

        const fullUrl = `https://www.amazon.eg/dp/${match[1]}`;
        const scraped = await scrapeAmazonEgypt(fullUrl);

        if (scraped && scraped.inStock && scraped.price > 0 && scraped.title) {
          temporaryProducts.push({
            slug: `product-demand-${asin}`,
            title: scraped.title,
            brand: 'أجهزة وإلكترونيات مطلوبة',
            image: scraped.image || 'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg',
            summary: 'منتج إلكتروني مطلوب وعالي البحث في السوق المصري.',
            specs: { 'المصدر': 'أمازون مصر', 'التصنيف': 'إلكترونيات وأجهزة (طلب عالي)', 'الحالة': 'متوفر' },
            offers: [{ merchant: 'أمازون مصر', price: scraped.price, currency: 'ج.م', inStock: scraped.inStock, affiliateUrl: fullUrl }]
          });
          elCount++;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    products = temporaryProducts;

    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf8');

    return NextResponse.json({
      success: true,
      message: `تم جلب المنتجات بنجاح. الإجمالي: ${products.length} (6 تريند + 9 موبايلات + 27 إلكترونيات)`,
      totalProducts: products.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'حدث خطأ في السيرفر' }, { status: 500 });
  }
}