'use client';

import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { PageLoading } from '@/components/shared/Loading';
import { MinusCircle } from 'lucide-react';

export default function GrayListPage() {
  const { restaurants, loading } = useRestaurants({ listType: 'gray', limit: 50 });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <MinusCircle className="h-5 w-5 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">灰榜</h1>
        </div>
        <p className="text-sm text-gray-500">待尝试或中等水平的餐厅记录，不褒不贬</p>
      </div>

      {loading ? <PageLoading /> : restaurants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无灰榜餐厅</p>
          <p className="text-sm mt-1">灰榜收录待尝试或中等评价的餐厅</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} listType="gray" />)}
        </div>
      )}
    </div>
  );
}
