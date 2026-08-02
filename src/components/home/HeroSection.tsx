import Link from 'next/link';
import { Search, ThumbsUp, ThumbsDown } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
            美食<span className="text-green-500">红</span><span className="text-red-500">黑</span>榜
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            记录真实美食体验，分享红榜推荐与黑榜避雷。用味蕾投票，让好味道被看见。
          </p>

          {/* Action cards */}
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-lg mx-auto">
            <Link
              href="/red-list"
              className="group flex flex-col items-center rounded-2xl border border-green-200 bg-green-50/50 p-6 hover:bg-green-50 hover:border-green-300 transition-all"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white group-hover:scale-110 transition-transform">
                <ThumbsUp className="h-7 w-7" />
              </div>
              <span className="mt-3 font-bold text-green-700 text-lg">红榜推荐</span>
              <span className="mt-1 text-xs text-green-500">发现好味道</span>
            </Link>
            <Link
              href="/black-list"
              className="group flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/50 p-6 hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white group-hover:scale-110 transition-transform">
                <ThumbsDown className="h-7 w-7" />
              </div>
              <span className="mt-3 font-bold text-red-700 text-lg">黑榜避雷</span>
              <span className="mt-1 text-xs text-red-500">避开踩坑店</span>
            </Link>
          </div>

          {/* Search hint */}
          <Link
            href="/search"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors shadow-sm"
          >
            <Search className="h-4 w-4" />
            搜索餐厅、菜系、城市...
          </Link>
        </div>
      </div>
    </section>
  );
}
