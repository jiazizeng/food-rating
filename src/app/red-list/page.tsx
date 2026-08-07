'use client';

import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { CUISINE_TYPES, ITEMS_PER_PAGE } from '@/lib/constants';
import { ThumbsUp } from 'lucide-react';
import { useState } from 'react';

export default function RedListPage() {
  const [cuisine, setCuisine] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<'rating' | 'newest' | 'reviews'>('rating');
  const [page, setPage] = useState(1);

  const { restaurants, loading, total } = useRestaurants({
    listType: 'red', cuisine: cuisine || undefined, city: city || undefined,
    sort, page, limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <ThumbsUp className="h-5 w-5 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">美食红榜</h1>
        </div>
        <p className="text-sm text-gray-500">高分好评餐厅推荐，每一家都值得尝试</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={cuisine} onChange={e => { setCuisine(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none">
          <option value="">全部菜系</option>
          {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={city} onChange={e => { setCity(e.target.value); setPage(1); }}
          placeholder="筛选城市..." className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" />
        <select value={sort} onChange={e => { setSort(e.target.value as typeof sort); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none">
          <option value="rating">评分最高</option>
          <option value="newest">最新添加</option>
          <option value="reviews">评价最多</option>
        </select>
      </div>

      {loading ? <Loading /> : restaurants.length === 0 ? (
        <EmptyState title="暂无红榜餐厅" description="还没有足够评价来生成红榜" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} listType="red" />)}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
