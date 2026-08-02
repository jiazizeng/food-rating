'use client';

import { createClient } from '@/lib/supabase/client';
import { RestaurantMap } from '@/components/map/RestaurantMap';
import { Loading } from '@/components/shared/Loading';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import type { Restaurant } from '@/types';
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants';
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, Search, Navigation, X, LocateFixed, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_DEFAULT_CENTER);
  const [mapKey, setMapKey] = useState(0);
  const [searchResult, setSearchResult] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5&accept-language=zh`
      );
      const results = await res.json();

      if (results.length === 0) {
        toast.error('未找到该地点，试试更具体的关键词');
        return;
      }

      const first = results[0];
      const lat = parseFloat(first.lat);
      const lng = parseFloat(first.lon);

      setSearchResult({
        name: first.display_name.split(',')[0],
        lat,
        lng,
      });
      setMapCenter([lat, lng]);
      setMapKey(prev => prev + 1);
      toast.success(`已定位到 ${first.display_name.split(',')[0]}`);
    } catch {
      toast.error('搜索失败，请稍后重试');
    } finally {
      setSearching(false);
    }
  };

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('你的浏览器不支持定位功能');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setUserLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setSearchResult({
          name: '我的位置',
          lat,
          lng,
        });
        setMapKey(prev => prev + 1);
        setLocating(false);
        toast.success('已定位到你的当前位置');
      },
      (error) => {
        setLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('定位被拒绝，请在浏览器设置中允许定位权限');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('无法获取位置信息，请检查网络');
            break;
          case error.TIMEOUT:
            toast.error('定位超时，请重试');
            break;
          default:
            toast.error('定位失败，请稍后重试');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const handleResetMap = () => {
    setSearchResult(null);
    setSearchQuery('');
    setUserLocation(null);
    setMapCenter(MAP_DEFAULT_CENTER);
    setMapKey(prev => prev + 1);
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">美食地图</h1>
        </div>
        <p className="text-sm text-gray-500">
          搜索地点、使用定位功能或在地图上探索附近的餐厅
        </p>
      </div>

      {/* Search bar + locate me */}
      <div className="mb-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索地点，例如：三里屯、南京西路..."
              className="w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <Navigation className="h-4 w-4" />
            {searching ? '搜索中...' : '定位'}
          </button>

          {/* Locate Me button */}
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 disabled:opacity-50 transition-colors"
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {locating ? '定位中...' : '我的位置'}
          </button>

          {searchResult && (
            <button
              type="button"
              onClick={handleResetMap}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" /> 重置
            </button>
          )}
        </form>
        {searchResult && (
          <p className="mt-2 text-xs text-gray-500">
            当前定位：
            <span className="font-medium text-gray-700">
              {searchResult.name}
            </span>
          </p>
        )}
      </div>

      {/* Map */}
      <div className="mb-8">
        <RestaurantMap
          key={mapKey}
          restaurants={restaurants}
          center={mapCenter}
          zoom={searchResult ? 15 : MAP_DEFAULT_ZOOM}
          userLocation={userLocation}
          className="h-[500px] w-full rounded-xl border border-gray-200"
        />
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
