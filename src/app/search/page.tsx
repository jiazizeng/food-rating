'use client';

import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { CUISINE_TYPES, ITEMS_PER_PAGE } from '@/lib/constants';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense, useMemo } from 'react';
import { cn } from '@/lib/utils';

const PRICE_OPTIONS = [
  { label: '全部价格', value: '' },
  { label: '¥50以下', value: 'low' },
  { label: '¥50-100', value: 'medium' },
  { label: '¥100-200', value: 'high' },
  { label: '¥200以上', value: 'luxury' },
];

const RATING_OPTIONS = [
  { label: '全部评分', value: 0 },
  { label: '4分以上', value: 4 },
  { label: '3.5分以上', value: 3.5 },
  { label: '3分以上', value: 3 },
];

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [cuisine, setCuisine] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest' | 'reviews'>('rating');
  const [priceRange, setPriceRange] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const { restaurants, loading, total } = useRestaurants({
    search: initialQuery || undefined,
    cuisine: cuisine || undefined,
    city: city || undefined,
    sort, page, limit: ITEMS_PER_PAGE,
    priceRange: priceRange || undefined,
    minRating: minRating || undefined,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const hasActiveFilters = cuisine || city || priceRange || minRating > 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const clearAllFilters = () => {
    setCuisine('');
    setCity('');
    setPriceRange('');
    setMinRating(0);
    setPage(1);
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
            className="w-full rounded-full border border-gray-200 bg-white pl-12 pr-5 py-3 text-sm shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
          />
        </form>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showFilters ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          筛选
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              {[cuisine, city, priceRange, minRating > 0 ? 1 : 0].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Quick filter chips */}
        {cuisine && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700">
            {cuisine}
            <button onClick={() => { setCuisine(''); setPage(1); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {city && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700">
            {city}
            <button onClick={() => { setCity(''); setPage(1); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {priceRange && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700">
            {PRICE_OPTIONS.find(o => o.value === priceRange)?.label}
            <button onClick={() => { setPriceRange(''); setPage(1); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {minRating > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700">
            {minRating}分以上
            <button onClick={() => { setMinRating(0); setPage(1); }}>
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            清除全部
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">菜系</label>
            <select value={cuisine} onChange={e => { setCuisine(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
              <option value="">全部菜系</option>
              {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">城市</label>
            <input value={city} onChange={e => { setCity(e.target.value); setPage(1); }}
              placeholder="输入城市..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">人均价格</label>
            <select value={priceRange} onChange={e => { setPriceRange(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
              {PRICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">最低评分</label>
            <select value={minRating} onChange={e => { setMinRating(Number(e.target.value)); setPage(1); }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
              {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">找到 {total} 个结果</p>
        <select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
          <option value="rating">评分最高</option>
          <option value="newest">最新添加</option>
          <option value="reviews">评价最多</option>
        </select>
      </div>

      {/* Results */}
      {loading ? <Loading /> : (
        <>
          {restaurants.length === 0 ? (
            <EmptyState title={initialQuery ? `没有找到"${initialQuery}"相关餐厅` : '没有找到相关餐厅'} description="试试其他关键词或放宽筛选条件" />
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
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />
      </div>
    }>
      <SearchPageInner />
    </Suspense>
  );
}
