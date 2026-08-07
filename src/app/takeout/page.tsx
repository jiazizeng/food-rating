'use client';

import { createClient } from '@/lib/supabase/client';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { Loading } from '@/components/shared/Loading';
import { EmptyState } from '@/components/shared/EmptyState';
import { CUISINE_TYPES } from '@/lib/constants';
import { Bike, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { Restaurant } from '@/types';

export default function TakeoutPage() {
  const [tab, setTab] = useState<'all' | 'red' | 'gray' | 'black'>('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState('');
  const [city, setCity] = useState('');
  const supabase = createClient();

  const fetchTakeout = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('restaurants')
      .select('*')
      .eq('status', 'approved')
      .eq('is_takeout', true)
      .order('created_at', { ascending: false });

    if (tab === 'red') {
      query = query.eq('list_type', 'red');
    } else if (tab === 'gray') {
      query = query.eq('list_type', 'gray');
    } else if (tab === 'black') {
      query = query.eq('list_type', 'black');
    }
    if (cuisine) query = query.eq('cuisine', cuisine);
    if (city) query = query.ilike('city', `%${city}%`);

    const { data } = await query.limit(50);
    if (data) setRestaurants(data as Restaurant[]);
    setLoading(false);
  }, [tab, cuisine, city]);

  useEffect(() => { fetchTakeout(); }, [fetchTakeout]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
            <Bike className="h-5 w-5 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">外卖专栏</h1>
        </div>
        <p className="text-sm text-gray-500">外卖红黑榜，点外卖不再踩雷</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all', label: '全部外卖', icon: '🛵' },
          { key: 'red', label: '外卖红榜', icon: '👍' },
          { key: 'gray', label: '外卖灰榜', icon: '📝' },
          { key: 'black', label: '外卖黑榜', icon: '👎' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key
                ? ((t.key === 'red' ? 'bg-green-500 text-white' : t.key === 'gray' ? 'bg-gray-500 text-white' : t.key === 'black' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'))
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={cuisine} onChange={e => setCuisine(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none">
          <option value="">全部菜系</option>
          {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="筛选城市..." className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none" />
      </div>

      {loading ? <Loading /> : restaurants.length === 0 ? (
        <EmptyState
          title="暂无外卖记录"
          description="还没有人分享外卖体验，快去添加第一个吧！"
          actionLabel="添加外卖" actionHref="/add-restaurant"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
        </div>
      )}
    </div>
  );
}
