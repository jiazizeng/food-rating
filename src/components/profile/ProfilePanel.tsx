'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatRelativeTime, getInitials, cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import type { Review, Restaurant, Favorite, BrowseHistory, Food, DishFavorite } from '@/types';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { StarRating } from '@/components/shared/StarRating';
import Link from 'next/link';
import {
  Heart, MessageSquare, ThumbsUp, ThumbsDown, FileText,
  Clock, CheckCircle, XCircle, Eye, Star, Utensils,
} from 'lucide-react';

type Tab = 'reviews' | 'favorites' | 'contributions' | 'submissions' | 'history' | 'dishFavs';

export function ProfilePanel() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('reviews');

  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewRestaurants, setReviewRestaurants] = useState<Record<string, Restaurant>>({});

  const [myFavorites, setMyFavorites] = useState<Favorite[]>([]);
  const [favRestaurants, setFavRestaurants] = useState<Restaurant[]>([]);

  const [mySubmissions, setMySubmissions] = useState<Restaurant[]>([]);

  // History tab
  const [history, setHistory] = useState<BrowseHistory[]>([]);
  const [historyRestaurants, setHistoryRestaurants] = useState<Record<string, Restaurant>>({});

  // Dish favorites tab
  const [dishFavs, setDishFavs] = useState<DishFavorite[]>([]);
  const [dishFavFoods, setDishFavFoods] = useState<Record<string, Food>>({});
  const [dishFavRestName, setDishFavRestName] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    if (activeTab === 'reviews') {
      const { data } = await supabase.from('reviews').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const reviews = data as Review[];
        setMyReviews(reviews);
        const ids = [...new Set(reviews.map(r => r.restaurant_id))];
        const { data: rData } = await supabase.from('restaurants').select('id, name').in('id', ids);
        const map: Record<string, Restaurant> = {};
        (rData || []).forEach((r: any) => { map[r.id] = r as Restaurant; });
        setReviewRestaurants(map);
      } else { setMyReviews([]); setReviewRestaurants({}); }
    }

    if (activeTab === 'favorites') {
      const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const favs = data as Favorite[];
        setMyFavorites(favs);
        const ids = [...new Set(favs.map(f => f.restaurant_id))];
        const { data: rData } = await supabase.from('restaurants').select('*').in('id', ids).eq('status', 'approved');
        setFavRestaurants((rData || []) as Restaurant[]);
      } else { setMyFavorites([]); setFavRestaurants([]); }
    }

    if (activeTab === 'submissions') {
      const { data } = await supabase.from('restaurants').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
      setMySubmissions((data || []) as Restaurant[]);
    }

    if (activeTab === 'history') {
      const { data } = await supabase.from('browse_history').select('*').eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(30);
      if (data && data.length > 0) {
        const hist = data as BrowseHistory[];
        // Deduplicate by restaurant_id
        const seen = new Set<string>();
        const unique = hist.filter(h => {
          if (seen.has(h.restaurant_id)) return false;
          seen.add(h.restaurant_id);
          return true;
        });
        setHistory(unique);
        const ids = [...new Set(unique.map(h => h.restaurant_id))];
        const { data: rData } = await supabase.from('restaurants').select('id, name, cover_image, avg_rating, review_count, city, cuisine').in('id', ids);
        const map: Record<string, Restaurant> = {};
        (rData || []).forEach((r: any) => { map[r.id] = r as Restaurant; });
        setHistoryRestaurants(map);
      } else { setHistory([]); setHistoryRestaurants({}); }
    }

    if (activeTab === 'dishFavs') {
      const { data } = await supabase.from('dish_favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const dfavs = data as DishFavorite[];
        setDishFavs(dfavs);
        const foodIds = [...new Set(dfavs.map(d => d.food_id))];
        const { data: fData } = await supabase.from('foods').select('*').in('id', foodIds);
        const foodMap: Record<string, Food> = {};
        const restIds = new Set<string>();
        (fData || []).forEach((f: any) => { foodMap[f.id] = f as Food; restIds.add(f.restaurant_id); });
        setDishFavFoods(foodMap);
        if (restIds.size > 0) {
          const { data: rData } = await supabase.from('restaurants').select('id, name').in('id', [...restIds]);
          const rMap: Record<string, string> = {};
          (rData || []).forEach((r: any) => { rMap[r.id] = r.name; });
          setDishFavRestName(rMap);
        }
      } else { setDishFavs([]); setDishFavFoods({}); setDishFavRestName({}); }
    }

    setLoading(false);
  }, [user, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!user || !profile) {
    return <div className="text-center py-20"><p className="text-gray-500">请先登录</p></div>;
  }

  const redCount = myReviews.filter(r => r.list_type === 'red').length;
  const blackCount = myReviews.filter(r => r.list_type === 'black').length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'reviews', label: '我的评价', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'favorites', label: '收藏餐厅', icon: <Heart className="h-4 w-4" /> },
    { key: 'dishFavs', label: '收藏菜品', icon: <Utensils className="h-4 w-4" /> },
    { key: 'submissions', label: '我的提交', icon: <FileText className="h-4 w-4" /> },
    { key: 'contributions', label: '我的贡献', icon: <ThumbsUp className="h-4 w-4" /> },
    { key: 'history', label: '最近查看', icon: <Eye className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-white border border-gray-100">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-xl font-bold text-white">
          {getInitials(profile.display_name || profile.username || 'U')}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{profile.display_name || profile.username}</h2>
          <p className="text-sm text-gray-500">@{profile.username} · 加入于 {formatDate(profile.created_at)}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-500">{myReviews.length} 条评价</span>
            <span className="text-xs text-gray-500">{myFavorites.length} 个收藏</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0',
              activeTab === tab.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        loading ? <SkeletonList /> : myReviews.length === 0 ? (
          <EmptyTab msg="还没有发布过评价" link="/red-list" linkLabel="去看看美食红黑榜" />
        ) : (
          <div className="space-y-3">
            {myReviews.map(review => {
              const restaurant = reviewRestaurants[review.restaurant_id];
              return (
                <Link key={review.id} href={`/restaurant/${review.restaurant_id}`}
                  className="block rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{restaurant?.name || '未知餐厅'}</span>
                      <span className={cn('ml-2 text-xs font-bold', review.list_type === 'red' ? 'text-green-600' : 'text-red-600')}>
                        {review.list_type === 'red' ? '红榜' : '黑榜'}
                      </span>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {(review.title || review.content) && <p className="mt-2 text-sm text-gray-500 line-clamp-2">{review.title || review.content}</p>}
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Favorites tab */}
      {activeTab === 'favorites' && (
        loading ? <SkeletonGrid /> : favRestaurants.length === 0 ? (
          <EmptyTab msg="还没有收藏餐厅" link="/red-list" linkLabel="去发现好餐厅" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {favRestaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
          </div>
        )
      )}

      {/* Dish Favorites tab */}
      {activeTab === 'dishFavs' && (
        loading ? <SkeletonList /> : dishFavs.length === 0 ? (
          <EmptyTab msg="还没有收藏菜品" link="/red-list" linkLabel="去发现好餐厅" />
        ) : (
          <div className="space-y-3">
            {dishFavs.map(df => {
              const food = dishFavFoods[df.food_id];
              const restName = food ? dishFavRestName[food.restaurant_id] || '' : '';
              if (!food) return null;
              return (
                <Link key={df.id} href={`/restaurant/${food.restaurant_id}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                    {food.image ? <img src={food.image} alt={food.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🍱</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{food.name}</p>
                    <p className="text-xs text-gray-400 truncate">{restName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-amber-600">{food.rating.toFixed(1)}</span>
                      {food.price && <span className="text-xs text-gray-400">¥{food.price}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        loading ? <SkeletonList /> : mySubmissions.length === 0 ? (
          <EmptyTab msg="还没有提交过餐厅" link="/add-restaurant" linkLabel="去添加餐厅" />
        ) : (
          <div className="space-y-3">
            {mySubmissions.map(r => (
              <Link key={r.id} href={`/restaurant/${r.id}`} className="block rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xl">
                      {r.cover_image ? <img src={r.cover_image} alt="" className="h-full w-full object-cover" /> : '🍽️'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.status === 'pending' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"><Clock className="h-3 w-3" /> 待审核</span>}
                        {r.status === 'approved' && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"><CheckCircle className="h-3 w-3" /> 已通过</span>}
                        {r.status === 'rejected' && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"><XCircle className="h-3 w-3" /> 已驳回</span>}
                        {r.eaten_status && <span className="text-[10px] text-gray-400">{r.eaten_status === 'eaten' ? '管理员已吃过' : '管理员未吃过'}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(r.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Contributions tab */}
      {activeTab === 'contributions' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-green-100 bg-green-50/30 p-6 text-center">
            <ThumbsUp className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-green-600">{redCount}</p>
            <p className="text-sm text-green-500 mt-1">红榜贡献</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/30 p-6 text-center">
            <ThumbsDown className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-3xl font-bold text-red-600">{blackCount}</p>
            <p className="text-sm text-red-500 mt-1">黑榜贡献</p>
          </div>
          <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/30 p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{myFavorites.length}</p>
            <p className="text-sm text-blue-500 mt-1">收藏餐厅</p>
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        loading ? <SkeletonList /> : history.length === 0 ? (
          <EmptyTab msg="还没有浏览记录" link="/red-list" linkLabel="去逛逛" />
        ) : (
          <div className="space-y-3">
            {history.map(h => {
              const r = historyRestaurants[h.restaurant_id];
              if (!r) return null;
              return (
                <Link key={h.id} href={`/restaurant/${h.restaurant_id}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                    {r.cover_image ? <img src={r.cover_image} alt={r.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl">🍽️</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{r.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StarRating rating={Math.round(r.avg_rating)} size="sm" />
                      <span className="text-xs text-gray-400">{r.review_count} 评价</span>
                      {r.city && <span className="text-xs text-gray-400">· {r.city}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{formatRelativeTime(h.viewed_at)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function EmptyTab({ msg, link, linkLabel }: { msg: string; link: string; linkLabel: string }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p>{msg}</p>
      <Link href={link} className="text-orange-600 text-sm hover:underline mt-2 inline-block">{linkLabel}</Link>
    </div>
  );
}

function SkeletonList() {
  return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>;
}

function SkeletonGrid() {
  return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />)}</div>;
}
