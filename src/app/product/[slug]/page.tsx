import fs from 'fs';
import path from 'path';

const AFFILIATE_TAG = 'abdelkhaliqst-21';

interface Offer {
  merchant?: string;
  price?: number;
  currency?: string;
  inStock?: boolean;
  affiliateUrl?: string;
}

interface Product {
  slug?: string;
  title: string;
  brand?: string;
  image?: string;
  summary?: string;
  price?: number;
  affiliateUrl?: string;
  specs?: Record<string, string>;
  offers?: Offer[];
}

function getDirectAmazonUrl(product: Product): string {
  const bestOffer =
    product.offers?.find((o) => o.inStock && o.affiliateUrl) ||
    product.offers?.[0];

  const rawUrl = bestOffer?.affiliateUrl || product.affiliateUrl || '';
  if (!rawUrl) return '#';

  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set('tag', AFFILIATE_TAG);
    return parsed.toString();
  } catch {
    const cleanUrl = rawUrl.split('?')[0];
    return `${cleanUrl}?tag=${AFFILIATE_TAG}`;
  }
}

function getProductPrice(product: Product): number {
  const bestOffer =
    product.offers?.find((o) => o.inStock && typeof o.price === 'number') ||
    product.offers?.[0];

  return bestOffer?.price ?? product.price ?? 0;
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

function ProductCard({ product }: { product: Product }) {
  const amazonUrl = getDirectAmazonUrl(product);
  const price = getProductPrice(product);
  const imageSrc =
    product.image || 'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="h-44 flex items-center justify-center mb-3 bg-gray-50 rounded-xl p-2 overflow-hidden">
          <img
            src={imageSrc}
            alt={product.title}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {product.brand && (
          <span className="inline-block text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full mb-2">
            {product.brand}
          </span>
        )}

        <h2 className="text-sm font-bold text-gray-900 line-clamp-2 mb-1.5">
          {product.title}
        </h2>

        {product.summary && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {product.summary}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          {price > 0 ? (
            <span className="text-base font-extrabold text-emerald-700">
              {price.toLocaleString('ar-EG')} ج.م
            </span>
          ) : (
            <span className="text-xs text-gray-500">راجع السعر على أمازون</span>
          )}
        </div>

        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-xl transition shrink-0"
        >
          🔍 قارن الأسعار
        </a>
      </div>
    </div>
  );
}

function SectionGrid({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Product[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((product, index) => (
          <ProductCard
            key={product.slug || `${title}-${index}`}
            product={product}
          />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
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

  const categorizedIds = new Set([
    ...trendProducts,
    ...phoneProducts,
  ]);

  const demandProducts = products.filter((p) => !categorizedIds.has(p));

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            مقارنة أسعار المنتجات في مصر 🛒
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            اعرف أرخص سعر لمنتجك ووفر فلوسك مع كل عملية شراء من أمازون مصر.
          </p>
        </header>

        {products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-600">
            لا توجد منتجات معروضة حالياً. شغّل مسار تحديث المنتجات لجلب أحدث العروض.
          </div>
        ) : (
          <>
            <SectionGrid
              title="🔥 تريند أمازون اليومي"
              subtitle="أكثر المنتجات رواجاً في السوق المصري اليوم"
              items={trendProducts}
            />

            <SectionGrid
              title="📱 موبايلات الأكثر طلباً"
              subtitle="أحدث الهواتف الذكية المطلوبة مع تحديث فوري للأسعار"
              items={phoneProducts}
            />

            <SectionGrid
              title="⚡ أجهزة وإلكترونيات مطلوبة"
              subtitle="منتجات إلكترونية عالية الطلب في مصر"
              items={demandProducts}
            />
          </>
        )}
      </div>
    </main>
  );
}