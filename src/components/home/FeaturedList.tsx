'use client';

import { useRestaurants } from '@/hooks/useRestaurants';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function FeaturedRedList() {
  const { restaurants, loading } = useRestaurants({ listType: 'red', limit: 4 });

  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔥 红榜推荐</h2>
            <p className="text-sm text-gray-500 mt-1">高分好评餐厅，值得一试</p>
          </div>
          <Link href="/red-list" className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700">
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} listType="red" />)}
          </div>
        )}
      </div>
    </section>
  );
}

export function FeaturedBlackList() {
  const { restaurants, loading } = useRestaurants({ listType: 'black', limit: 4 });

  return (
    <section className="py-12 bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">⚠️ 黑榜避雷</h2>
            <p className="text-sm text-gray-500 mt-1">差评最多餐厅，谨慎选择</p>
          </div>
          <Link href="/black-list" className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} listType="black" />)}
          </div>
        )}
      </div>
    </section>
  );
}
