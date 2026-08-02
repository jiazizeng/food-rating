'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { StatsData } from '@/types';
import { Loading } from '@/components/shared/Loading';
import { StarRating } from '@/components/shared/StarRating';
import { Trophy, TrendingUp, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { data: topRed }, { data: topBlack }, { data: cities },
        { count: totalR }, { count: totalRev },
      ] = await Promise.all([
        supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: false }).limit(10),
        supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: true }).limit(10),
        supabase.from('restaurants').select('city, avg_rating').eq('status', 'approved'),
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
      ]);

      // City rankings
      const cityMap: Record<string, { count: number; totalRating: number }> = {};
      (cities || []).forEach((r: { city: string | null; avg_rating: number }) => {
        const city = r.city || '未知';
        if (!cityMap[city]) cityMap[city] = { count: 0, totalRating: 0 };
        cityMap[city].count++;
        cityMap[city].totalRating += r.avg_rating;
      });
      const cityRankings = Object.entries(cityMap)
        .map(([city, data]) => ({ city, count: data.count, avg_rating: data.totalRating / data.count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        topRedRestaurants: (topRed || []) as StatsData['topRedRestaurants'],
        topBlackRestaurants: (topBlack || []) as StatsData['topBlackRestaurants'],
        cityRankings,
        topContributors: [],
        totalRestaurants: totalR || 0,
        totalReviews: totalRev || 0,
        totalUsers: 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">数据统计</h1>
        <p className="text-sm text-gray-500 mt-1">美食红黑榜数据总览</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white">
          <p className="text-3xl font-bold">{stats?.totalRestaurants || 0}</p>
          <p className="text-sm text-orange-100 mt-1">收录餐厅</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white">
          <p className="text-3xl font-bold">{stats?.totalReviews || 0}</p>
          <p className="text-sm text-amber-100 mt-1">用户评价</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white">
          <p className="text-3xl font-bold">{stats?.cityRankings.length || 0}</p>
          <p className="text-sm text-rose-100 mt-1">覆盖城市</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top red */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">红榜 TOP 10</h2>
          </div>
          <div className="space-y-3">
            {stats?.topRedRestaurants.map((r, i) => (
              <Link key={r.id} href={`/restaurant/${r.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                <span className="text-2xl font-bold text-gray-300 w-8 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={Math.round(r.avg_rating)} size="sm" />
                    <span className="text-xs text-gray-400">{r.review_count} 评价</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">{r.avg_rating.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Top black */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold text-gray-900">黑榜 TOP 10</h2>
          </div>
          <div className="space-y-3">
            {stats?.topBlackRestaurants.map((r, i) => (
              <Link key={r.id} href={`/restaurant/${r.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                <span className="text-2xl font-bold text-gray-300 w-8 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={Math.round(r.avg_rating)} size="sm" />
                    <span className="text-xs text-gray-400">{r.review_count} 评价</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-red-600">{r.avg_rating.toFixed(1)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* City rankings */}
      {stats?.cityRankings && stats.cityRankings.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">城市美食排行</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stats.cityRankings.slice(0, 12).map(city => (
              <div key={city.city} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
                <p className="font-bold text-gray-900">{city.city}</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{city.count}</p>
                <p className="text-xs text-gray-400">{city.avg_rating.toFixed(1)} 平均分</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
