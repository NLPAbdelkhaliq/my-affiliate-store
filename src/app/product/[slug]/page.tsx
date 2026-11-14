import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const AFFILIATE_TAG = 'abdelkhaliqst-21';

interface Offer {
  merchant: string;
  price: number;
  currency: string;
  inStock: boolean;
  affiliateUrl: string;
}

interface Product {
  slug: string;
  title: string;
  brand: string;
  image: string;
  summary: string;
  specs: Record<string, string>;
  offers: Offer[];
}

function getProducts(): Product[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/products.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch {
    return [];
  }
}

function withAffiliateTag(url: string): string {
  if (!url) return '#';
  const cleanUrl = url.split('?')[0];
  return `${cleanUrl}?tag=${AFFILIATE_TAG}`;
}

export default function Home() {
  const products = getProducts();

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* عنوان الموقع */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
            مقارنة أسعار المنتجات في مصر 🛒
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            اعرف أرخص سعر لمنتجك ووفر فلوسك مع كل عملية شراء من أمازون مصر.
          </p>
        </div>

        {/* شبكة عرض المنتجات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const bestOffer =
              product.offers && product.offers.length > 0 ? product.offers[0] : null;

            return (
              <div
                key={product.slug}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  {/* صورة المنتج */}
                  <div className="relative h-64 bg-gray-100 overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={
                        product.image ||
                        'https://m.media-amazon.com/images/I/619oqSJVY5L._AC_SL1500_.jpg'
                      }
                      alt={product.title}
                      className="object-contain h-full w-full transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* تفاصيل المنتج */}
                  <div className="p-5">
                    <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full inline-block mb-2">
                      {product.brand}
                    </span>
                    <h2 className="text-base font-bold text-gray-900 line-clamp-2 mb-2">
                      {product.title}
                    </h2>
                    <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                      {product.summary}
                    </p>
                  </div>
                </div>

                {/* السعر وزر الشراء المباشر */}
                <div className="p-5 pt-0 border-t border-gray-50 mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block">يبدأ من</span>
                    <span className="text-xl font-black text-gray-900">
                      {bestOffer ? bestOffer.price.toLocaleString() : 'غير متوفر'}{' '}
                      <span className="text-xs font-normal text-gray-600">
                        {bestOffer ? bestOffer.currency : ''}
                      </span>
                    </span>
                  </div>

                  {/* زر قارن الأسعار ليفتح رابط أمازون بالأفلييت مباشرة */}
                  {bestOffer && bestOffer.affiliateUrl ? (
                    <a
                      href={withAffiliateTag(bestOffer.affiliateUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-xl transition shadow-sm"
                    >
                      🔍 قارن الأسعار
                    </a>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">غير متاح حالياً</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}