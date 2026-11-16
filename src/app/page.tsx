import fs from 'fs';
import path from 'path';

const AFFILIATE_TAG = 'abdelkhaliqst-21';

interface Offer {
  merchant?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  affiliateUrl?: string;
  url?: string;
}

interface Product {
  slug?: string;
  asin?: string;
  title: string;
  brand?: string;
  image?: string;
  summary?: string;
  price?: number;
  affiliateUrl?: string;
  url?: string;
  specs?: Record<string, string>;
  offers?: Offer[];
}

function extractAsinFromProduct(product: Product): string | null {
  if (product.asin && /^[A-Z0-9]{10}$/i.test(product.asin.trim())) {
    return product.asin.trim().toUpperCase();
  }

  const sources = [
    product.slug,
    product.affiliateUrl,
    product.url,
    ...(product.offers?.flatMap((o) => [o.affiliateUrl, o.url]) || []),
  ].filter(Boolean) as string[];

  for (const src of sources) {
    const dpMatch = src.match(/\/dp\/([A-Z0-9]{10})/i);
    if (dpMatch) return dpMatch[1].toUpperCase();

    const slugMatch = src.match(/product-([a-z0-9]{10})/i);
    if (slugMatch) return slugMatch[1].toUpperCase();
  }

  return null;
}

function getDirectAmazonUrl(product: Product): string {
  const bestOffer =
    product.offers?.find((o) => o.inStock !== false && (o.affiliateUrl || o.url)) ||
    product.offers?.[0];

  const candidateUrl =
    bestOffer?.affiliateUrl ||
    bestOffer?.url ||
    product.affiliateUrl ||
    product.url;

  if (candidateUrl) {
    try {
      const parsed = new URL(candidateUrl);
      parsed.searchParams.set('tag', AFFILIATE_TAG);
      return parsed.toString();
    } catch {
      const cleanUrl = candidateUrl.split('?')[0];
      return `${cleanUrl}?tag=${AFFILIATE_TAG}`;
    }
  }

  const asin = extractAsinFromProduct(product);
  if (asin) {
    return `https://www.amazon.eg/dp/${asin}?tag=${AFFILIATE_TAG}`;
  }

  return `https://www.amazon.eg/s?k=${encodeURIComponent(product.title)}&tag=${AFFILIATE_TAG}`;
}

function getLowestPrice(product: Product): number {
  if (Array.isArray(product.offers) && product.offers.length > 0) {
    const validPrices = product.offers
      .map((o) => Number(o.price))
      .filter((p) => !Number.isNaN(p) && p > 0);

    if (validPrices.length > 0) {
      return Math.min(...validPrices);
    }
  }

  return typeof product.price === 'number' && product.price > 0 ? product.price : 0;
}

function getProducts(): Product[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/products.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ProductCard({ product, fallbackKey }: { product: Product; fallbackKey: string }) {
  const lowestPrice = getLowestPrice(product);
  const amazonUrl = getDirectAmazonUrl(product);
  const imageSrc =
    product.image || 'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg';

  return (
    <div
      key={product.slug || fallbackKey}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
    >
      <div>
        <div className="relative h-56 bg-gray-100 flex items-center justify-center p-4">
          <img
            src={imageSrc}
            alt={product.title}
            className="object-contain h-full w-full"
          />
        </div>
        <div className="p-5">
          {product.brand && (
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
              {product.brand}
            </span>
          )}
          <h2 className="text-lg font-bold text-gray-900 mt-3 line-clamp-1">
            {product.title}
          </h2>
          {product.summary && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {product.summary}
            </p>
          )}
        </div>
      </div>

      <div className="p-5 pt-0 border-t border-gray-50 mt-4 flex items-center justify-between gap-2">
        <div>
          <span className="text-xs text-gray-400 block">يبدأ من</span>
          <span className="text-lg font-black text-green-600">
            {lowestPrice.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-normal">ج.م</span>
          </span>
        </div>

        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0"
        >
          قارن الأسعار 🔍
        </a>
      </div>
    </div>
  );
}

function CategorySection({
  title,
  items,
  prefix,
}: {
  title: string;
  items: Product[];
  prefix: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-5">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((product, index) => (
          <ProductCard
            key={`${prefix}-${product.slug || index}`}
            fallbackKey={`${prefix}-${index}`}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const products = getProducts();

  const trendProducts = products.filter(
    (p) =>
      p.slug?.startsWith('product-trend-') ||
      p.brand?.includes('تريند') ||
      p.specs?.['التصنيف']?.includes('تريند')
  );

  const phoneProducts = products.filter(
    (p) =>
      p.slug?.startsWith('product-phone-') ||
      p.brand?.includes('موبايلات') ||
      p.specs?.['التصنيف']?.includes('موبايلات')
  );

  const assigned = new Set<Product>([...trendProducts, ...phoneProducts]);
  const electronicsProducts = products.filter((p) => !assigned.has(p));

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            مقارنة أسعار المنتجات في مصر 🛒
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            اعرف أرخص سعر لمنتجك ووفر فلوسك مع كل عملية شراء.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
            لا توجد منتجات متاحة حالياً.
          </div>
        ) : (
          <>
            <CategorySection
              title="🔥 تريند أمازون اليومي"
              items={trendProducts}
              prefix="trend"
            />
            <CategorySection
              title="📱 موبايلات الأكثر طلباً"
              items={phoneProducts}
              prefix="phones"
            />
            <CategorySection
              title="⚡ أجهزة وإلكترونيات مطلوبة"
              items={electronicsProducts}
              prefix="electronics"
            />
          </>
        )}
      </div>
    </main>
  );
}