'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { Review, Restaurant, Favorite } from '@/types';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { StarRating } from '@/components/shared/StarRating';
import Link from 'next/link';
import { Heart, MessageSquare, ThumbsUp, ThumbsDown, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

type Tab = 'reviews' | 'favorites' | 'contributions' | 'submissions';

export function ProfilePanel() {
  const { user, profile } = useAuth();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('reviews');

  // Reviews tab
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [reviewRestaurants, setReviewRestaurants] = useState<Record<string, Restaurant>>({});

  // Favorites tab
  const [myFavorites, setMyFavorites] = useState<Favorite[]>([]);
  const [favRestaurants, setFavRestaurants] = useState<Restaurant[]>([]);

  // Submissions tab
  const [mySubmissions, setMySubmissions] = useState<Restaurant[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (activeTab === 'reviews') {
      setLoading(true);
      supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const reviews = data as Review[];
            setMyReviews(reviews);
            // Fetch restaurant names in a second query
            const ids = [...new Set(reviews.map(r => r.restaurant_id))];
            supabase.from("restaurants").select("id, name").in("id", ids).then(({ data: rData }) => {
              const map: Record<string, Restaurant> = {};
              (rData || []).forEach((r: any) => { map[r.id] = r as Restaurant; });
              setReviewRestaurants(map);
            });
          } else {
            setMyReviews([]);
            setReviewRestaurants({});
          }
          setLoading(false);
        });
    }

    if (activeTab === 'favorites') {
      setLoading(true);
      supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            const favs = data as Favorite[];
            setMyFavorites(favs);
            const ids = [...new Set(favs.map(f => f.restaurant_id))];
            supabase.from('restaurants').select('*').in('id', ids).eq('status', 'approved').then(({ data: rData }) => {
              setFavRestaurants((rData || []) as Restaurant[]);
            });
          } else {
            setMyFavorites([]);
            setFavRestaurants([]);
          }
          setLoading(false);
        });
    }

    if (activeTab === 'submissions') {
      setLoading(true);
      supabase
        .from('restaurants')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setMySubmissions((data || []) as Restaurant[]);
          setLoading(false);
        });
    }
  }, [user, activeTab]);

  if (!user || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }

  const redCount = myReviews.filter(r => r.list_type === 'red').length;
  const blackCount = myReviews.filter(r => r.list_type === 'black').length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'reviews', label: '我的评价', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'favorites', label: '我的收藏', icon: <Heart className="h-4 w-4" /> },
    { key: 'contributions', label: '我的贡献', icon: <ThumbsUp className="h-4 w-4" /> },
    { key: 'submissions', label: '我的提交', icon: <FileText className="h-4 w-4" /> },
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
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${
              activeTab === tab.key
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : myReviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>还没有发布过评价</p>
            <Link href="/red-list" className="text-orange-600 text-sm hover:underline mt-2 inline-block">去看看美食红黑榜</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myReviews.map(review => {
              const restaurant = reviewRestaurants[review.restaurant_id];
              return (
                <Link key={review.id} href={`/restaurant/${review.restaurant_id}`}
                  className="block rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{restaurant?.name || `餐厅 ${review.restaurant_id.slice(0, 8)}`}</span>
                      <span className={`ml-2 text-xs font-bold ${review.list_type === 'red' ? 'text-green-600' : 'text-red-600'}`}>
                        {review.list_type === 'red' ? '红榜' : '黑榜'}
                      </span>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {(review.title || review.content) && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{review.title || review.content}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Favorites tab */}
      {activeTab === 'favorites' && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : favRestaurants.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>还没有收藏餐厅</p>
            <Link href="/red-list" className="text-orange-600 text-sm hover:underline mt-2 inline-block">去发现好餐厅</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {favRestaurants.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
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

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : mySubmissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>还没有提交过餐厅</p>
            <Link href="/add-restaurant" className="text-orange-600 text-sm hover:underline mt-2 inline-block">去添加餐厅</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {mySubmissions.map(r => (
              <Link key={r.id} href={`/restaurant/${r.id}`}
                className="block rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xl">
                      {r.cover_image ? <img src={r.cover_image} alt="" className="h-full w-full object-cover" /> : '🍽️'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            <Clock className="h-3 w-3" /> 待审核
                          </span>
                        )}
                        {r.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" /> 已通过
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            <XCircle className="h-3 w-3" /> 已驳回
                          </span>
                        )}
                        {r.eaten_status && (
                          <span className="text-[10px] text-gray-400">
                            {r.eaten_status === 'eaten' ? '管理员已吃过' : '管理员未吃过'}
                          </span>
                        )}
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
    </div>
  );
}
