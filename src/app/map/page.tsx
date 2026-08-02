'use client';

import { createClient } from '@/lib/supabase/client';
import { RestaurantMap } from '@/components/map/RestaurantMap';
import { Loading } from '@/components/shared/Loading';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import type { Restaurant } from '@/types';
import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('status', 'approved')
        .not('latitude', 'is', null)
        .order('avg_rating', { ascending: false })
        .limit(100);
      if (data) setRestaurants(data as Restaurant[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">美食地图</h1>
        </div>
        <p className="text-sm text-gray-500">在地图上探索附近的餐厅</p>
      </div>

      <div className="mb-8">
        <RestaurantMap restaurants={restaurants} className="h-[500px] w-full rounded-xl border border-gray-200" />
      </div>

      {restaurants.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">地图上的餐厅</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {restaurants.slice(0, 8).map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}
