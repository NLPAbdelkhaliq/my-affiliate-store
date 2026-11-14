import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import Image from 'next/image';

interface Offer {
  merchant: string;
  price: number;
  currency: string;
}

interface Product {
  slug: string;
  title: string;
  brand: string;
  image: string;
  summary: string;
  offers: Offer[];
}

// دالة لجلب المنتجات لعرضها في الصفحة الرئيسية
function getProducts(): Product[] {
  try {
    const filePath = path.join(process.cwd(), 'src/data/products.json');
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch {
    return [];
  }
}

export default function Home() {
  const products = getProducts();

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        {/* رأس الصفحة */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            مقارنة أسعار المنتجات في مصر 🛒
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            اعرف أرخص سعر لمنتجك ووفر فلوسك مع كل عملية شراء.
          </p>
        </div>

        {/* شبكة المنتجات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => {
            // حساب أرخص سعر متاح للمنتج لعرضه سريعاً
            const lowestPrice = product.offers.length > 0 
              ? Math.min(...product.offers.map(o => o.price)) 
              : 0;

            return (
              <div 
                key={product.slug}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-56 bg-gray-100 flex items-center justify-center p-4">
                    <img src={product.image} alt={product.title} className="object-contain h-full w-full" />
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                      {product.brand}
                    </span>
                    <h2 className="text-lg font-bold text-gray-900 mt-3 line-clamp-1">{product.title}</h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.summary}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-gray-50 mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block">يبدأ من</span>
                    <span className="text-lg font-black text-green-600">
                      {lowestPrice.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                    </span>
                  </div>
                  <Link
                    href={`/product/${product.slug}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    قارن الأسعار 🔍
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}