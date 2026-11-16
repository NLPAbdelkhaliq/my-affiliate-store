import * as cheerio from 'cheerio';

export const AFFILIATE_TAG = 'abdelkhaliqst-21';

export interface ScrapedProduct {
  title: string;
  price: number;
  image: string;
  inStock: boolean;
}

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
};

export function withAffiliateTag(url: string, tag: string = AFFILIATE_TAG): string {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('tag', tag);
    return parsed.toString();
  } catch {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?tag=${tag}`;
  }
}

export function extractAsin(urlOrText: string): string | null {
  const match = urlOrText.match(/\/dp\/([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

export async function scrapeAmazonEgypt(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('#productTitle').text().trim() ||
      $('h1').first().text().trim();
    if (!title) return null;

    const priceText =
      $('.a-price .a-offscreen').first().text() ||
      $('.a-price-whole').first().text() ||
      '';
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;

    const image =
      $('#landingImage').attr('src') ||
      $('#imgBlkFront').attr('src') ||
      $('img').first().attr('src') ||
      '';

    const pageText = $.text();
    const isUnavailable =
      pageText.includes('غير متوفر حالياً') ||
      pageText.includes('Currently Unavailable') ||
      pageText.includes('لا نعرف متى أو فيما إذا كان هذا المنتج سيتوفر مرة أخرى');

    const inStock = price > 0 && !isUnavailable;

    return {
      title,
      price,
      image,
      inStock,
    };
  } catch (error) {
    console.error('Amazon Egypt scraping failed:', error);
    return null;
  }
}

export async function scrapeAmazonBestSellers(
  sourceUrl: string,
  limit: number = 10
): Promise<Array<ScrapedProduct & { asin: string; url: string; affiliateUrl: string }>> {
  try {
    const response = await fetch(sourceUrl, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) return [];

    const html = await response.text();
    const regex = /\/dp\/([A-Z0-9]{10})/g;
    const seen = new Set<string>();
    const results: Array<ScrapedProduct & { asin: string; url: string; affiliateUrl: string }> = [];

    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null && results.length < limit) {
      const asin = match[1].toUpperCase();
      if (seen.has(asin)) continue;
      seen.add(asin);

      const url = `https://www.amazon.eg/dp/${asin}`;
      const affiliateUrl = withAffiliateTag(url);
      const scraped = await scrapeAmazonEgypt(url);

      if (scraped && scraped.inStock && scraped.price > 0) {
        results.push({
          ...scraped,
          asin,
          url,
          affiliateUrl,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    return results;
  } catch (error) {
    console.error('Amazon best sellers scraping failed:', error);
    return [];
  }
}

export async function scrapeNoonEgypt(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim();
    if (!title) return null;

    const image =
      $('img[data-qa="product-image"]').attr('src') ||
      $('img').first().attr('src') ||
      '';

    const priceText =
      $('div[data-qa="price-value"]').text() ||
      $('.amount').first().text() ||
      '';
    const finalPrice = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;

    const inStock =
      !html.includes('Currently Unavailable') &&
      !html.includes('غير متوفر');

    return {
      title,
      price: finalPrice,
      image,
      inStock,
    };
  } catch (error) {
    console.error('Noon Egypt scraping failed:', error);
    return null;
  }
}