'use client';

import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { CUISINE_TYPES, ITEMS_PER_PAGE } from '@/lib/constants';
import { Search } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [cuisine, setCuisine] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest' | 'reviews'>('rating');
  const [page, setPage] = useState(1);

  const { restaurants, loading, total } = useRestaurants({
    search: initialQuery || undefined,
    cuisine: cuisine || undefined,
    city: city || undefined,
    sort, page, limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">搜索美食</h1>
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索餐厅、菜系或城市..."
            className="w-full rounded-full border border-gray-200 bg-white pl-12 pr-5 py-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={cuisine} onChange={e => { setCuisine(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="">全部菜系</option>
          {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={city} onChange={e => { setCity(e.target.value); setPage(1); }}
          placeholder="城市..." className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
        <select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
          <option value="rating">评分最高</option>
          <option value="newest">最新添加</option>
          <option value="reviews">评价最多</option>
        </select>
      </div>

      {/* Results */}
      {loading ? <Loading /> : (
        <>
          <p className="text-sm text-gray-500 mb-4">找到 {total} 个结果</p>
          {restaurants.length === 0 ? (
            <EmptyState title="没有找到相关餐厅" description="试试其他关键词" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  );
}


export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" /></div>}>
      <SearchPageInner />
    </Suspense>
  );
}
