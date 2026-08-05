'use client';

import { createClient } from '@/lib/supabase/client';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { StarRating } from '@/components/shared/StarRating';
import { Loading } from '@/components/shared/Loading';
import { formatRelativeTime, cn } from '@/lib/utils';
import { CUISINE_TYPES } from '@/lib/constants';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Restaurant, Review, Food } from '@/types';
import {
  Search, MapPin, AlertTriangle, ArrowRight,
  Flame, Utensils, MessageSquare, Sparkles, Star,
} from 'lucide-react';

export default function HomePage() {
  const [topRestaurants, setTopRestaurants] = useState<Restaurant[]>([]);
  const [grayRestaurants, setGrayRestaurants] = useState<Restaurant[]>([]);
  const [blackRestaurants, setBlackRestaurants] = useState<Restaurant[]>([]);
  const [latestReviews, setLatestReviews] = useState<Review[]>([]);
  const [reviewProfiles, setReviewProfiles] = useState<Record<string, { display_name?: string; username?: string }>>({});
  const [popularFoods, setPopularFoods] = useState<Food[]>([]);
  const [foodRestaurants, setFoodRestaurants] = useState<Record<string, string>>({});
  const [reviewRestaurantNames, setReviewRestaurantNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchAll = async () => {
      const [topR, grayR2, blackR2, revR, foodR] = await Promise.all([
        supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: false }).limit(6),
        supabase.from('restaurants').select('*').eq('status', 'approved').eq('list_type', 'gray').order('created_at', { ascending: false }).limit(6),
        supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: true }).limit(4),
        supabase.from('reviews').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('foods').select('*').order('rating', { ascending: false }).limit(6),
      ]);

      if (topR.data) setTopRestaurants(topR.data as Restaurant[]);
      if (grayR2.data) setGrayRestaurants(grayR2.data as Restaurant[]);
      if (blackR2.data) setBlackRestaurants(blackR2.data as Restaurant[]);

      if (foodR.data && foodR.data.length > 0) {
        const foods = foodR.data as Food[];
        setPopularFoods(foods);
        const restIds = [...new Set(foods.map(f => f.restaurant_id))];
        const { data: rests } = await supabase.from('restaurants').select('id, name').in('id', restIds);
        const rMap: Record<string, string> = {};
        (rests || []).forEach((r: { id: string; name: string }) => { rMap[r.id] = r.name; });
        setFoodRestaurants(rMap);
      }

      if (revR.data && revR.data.length > 0) {
        const reviews = revR.data as Review[];
        setLatestReviews(reviews);
        const userIds = [...new Set(reviews.map(r => r.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, display_name, username').in('id', userIds);
        const map: Record<string, { display_name?: string; username?: string }> = {};
        (profiles || []).forEach((p: { id: string; display_name?: string; username?: string }) => { map[p.id] = p; });
        setReviewProfiles(map);
        const restaurantIds = [...new Set(reviews.map(r => r.restaurant_id))];
        const { data: rests } = await supabase.from('restaurants').select('id, name').in('id', restaurantIds);
        const rMap: Record<string, string> = {};
        (rests || []).forEach((r: { id: string; name: string }) => { rMap[r.id] = r.name; });
        setReviewRestaurantNames(rMap);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Hero section */}
      <section className="relative bg-gradient-to-b from-orange-50 via-orange-50/80 to-[#faf7f2] overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-14 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100/60 px-4 py-1.5 text-sm text-orange-700 mb-6">
            <Sparkles className="h-3.5 w-3.5" /> 真实食客评价 · 帮你找到值得吃的地方
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
            今天<span className="text-orange-500">吃什么</span>？
          </h1>
          <p className="mt-4 text-gray-500 text-lg max-w-md mx-auto">
            找餐厅、看评价、避坑踩雷，吃货们都在这里分享真实体验
          </p>

          <form onSubmit={handleSearch} className="mt-8 relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索餐厅、菜系、菜品或地区..."
              className="w-full rounded-2xl border border-gray-200 bg-white pl-14 pr-28 py-4 text-base shadow-lg shadow-orange-100/50 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
              搜索
            </button>
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['火锅', '日料', '烧烤', '中餐', '甜品', '咖啡', '海鲜', '西餐'].map(cuisine => (
              <button
                key={cuisine}
                onClick={() => router.push(`/search?q=${cuisine}`)}
                className="rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-sm text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all"
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-100/30 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-50/40 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none" />
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 space-y-14">

        {/* 今日红榜 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100">
                <Flame className="h-[18px] w-[18px] text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">今日红榜</h2>
                <p className="text-xs text-gray-400 mt-0.5">高分好评，不吃后悔</p>
              </div>
            </div>
            <Link href="/red-list" className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium group">
              查看全部 <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {topRestaurants.slice(0, 6).map(r => <RestaurantCard key={r.id} restaurant={r} listType="red" />)}
          </div>
        </section>

        {/* 避雷提醒 */}
        {/* Gray section */}
        {grayRestaurants.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                  <span className="text-[18px]">📝</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">灰榜记录</h2>
                  <p className="text-xs text-gray-400">待尝试或中等评价</p>
                </div>
              </div>
              <Link href="/gray-list" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium group">
                查看全部 <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {grayRestaurants.slice(0, 6).map(r => <RestaurantCard key={r.id} restaurant={r} listType="gray" />)}
            </div>
          </section>
        )}

        {blackRestaurants.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                  <AlertTriangle className="h-[18px] w-[18px] text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">避雷提醒</h2>
                  <p className="text-xs text-gray-400 mt-0.5">真实体验，帮你避开踩坑店</p>
                </div>
              </div>
              <Link href="/black-list" className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium group">
                查看全部 <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {blackRestaurants.slice(0, 4).map(r => <RestaurantCard key={r.id} restaurant={r} listType="black" />)}
            </div>
          </section>
        )}

        {/* 热门菜品 */}
        {popularFoods.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <Utensils className="h-[18px] w-[18px] text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">热门菜品</h2>
                  <p className="text-xs text-gray-400 mt-0.5">大家都在推荐的好菜</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {popularFoods.map(food => (
                <Link key={food.id} href={`/restaurant/${food.restaurant_id}`}
                  className="group rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-md transition-all">
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {food.image ? (
                      <img src={food.image} alt={food.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl bg-gradient-to-br from-amber-50 to-orange-50">🍱</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm truncate">{food.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{foodRestaurants[food.restaurant_id] || ''}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-amber-600">{food.rating.toFixed(1)}</span>
                      {food.price && <span className="text-xs text-gray-400 ml-auto">¥{food.price}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 最新评价 + 快捷操作 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <MessageSquare className="h-[18px] w-[18px] text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">最新评价</h2>
                  <p className="text-xs text-gray-400 mt-0.5">看看大家都在说什么</p>
                </div>
              </div>
              {latestReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-12 text-center">
                  <MessageSquare className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-400">还没有评价</p>
                  <p className="text-xs text-gray-300 mt-1">成为第一个分享体验的人</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {latestReviews.map(review => {
                    const profile = reviewProfiles[review.user_id];
                    const rName = reviewRestaurantNames[review.restaurant_id] || '未知餐厅';
                    return (
                      <Link key={review.id} href={`/restaurant/${review.restaurant_id}`}
                        className="rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 shrink-0">
                            {(profile?.display_name || profile?.username || 'U').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">{profile?.display_name || profile?.username || '用户'}</span>
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0', review.list_type === 'red' ? 'bg-green-100 text-green-700' : review.list_type === 'black' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>
                                {review.list_type === 'red' ? '推荐' : review.list_type === 'black' ? '避雷' : '记录'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">评价了 {rName}</p>
                          </div>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                        {review.content && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-3 leading-relaxed">{review.content}</p>
                        )}
                        <p className="text-xs text-gray-300 mt-2">{formatRelativeTime(review.created_at)}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">快捷操作</h3>
              <div className="space-y-2.5">
                <Link href="/add-restaurant"
                  className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3.5 text-sm font-semibold text-white hover:from-orange-600 hover:to-red-600 transition-all shadow-sm shadow-orange-200">
                  <Utensils className="h-5 w-5" /> 添加餐厅
                </Link>
                <Link href="/map"
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all">
                  <MapPin className="h-5 w-5" /> 查看美食地图
                </Link>
                <Link href="/search"
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all">
                  <Search className="h-5 w-5" /> 搜索美食
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
