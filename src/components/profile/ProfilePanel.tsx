'use client';

import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { createClient } from '@/lib/supabase/client';
import { formatDate, getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Review } from '@/types';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { StarRating } from '@/components/shared/StarRating';
import Link from 'next/link';
import { Heart, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

type Tab = 'reviews' | 'favorites' | 'contributions';

export function ProfilePanel() {
  const { user, profile } = useAuth();
  const { favorites } = useFavorites();
  const [activeTab, setActiveTab] = useState<Tab>('reviews');
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user || activeTab !== 'reviews') return;
    const fetchReviews = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reviews')
        .select('*, restaurant:restaurants(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyReviews(data as Review[]);
      setLoading(false);
    };
    fetchReviews();
  }, [user, activeTab]);

  if (!user || !profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'reviews', label: '我的评价', icon: <MessageSquare className="h-4 w-4" /> },
    { key: 'favorites', label: '我的收藏', icon: <Heart className="h-4 w-4" /> },
    { key: 'contributions', label: '我的贡献', icon: <ThumbsUp className="h-4 w-4" /> },
  ];

  const redCount = myReviews.filter(r => r.list_type === 'red').length;
  const blackCount = myReviews.filter(r => r.list_type === 'black').length;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-8 p-6 rounded-2xl bg-white border border-gray-100">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
          {getInitials(profile.display_name || profile.username || 'U')}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{profile.display_name || profile.username}</h2>
          <p className="text-sm text-gray-500">@{profile.username} · 加入于 {formatDate(profile.created_at)}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-500">{myReviews.length} 条评价</span>
            <span className="text-xs text-gray-500">{favorites.length} 个收藏</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'reviews' && (
        loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
        ) : myReviews.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>还没有发布过评价</p>
            <Link href="/red-list" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">去看看美食红黑榜</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myReviews.map(review => (
              <Link key={review.id} href={`/restaurant/${review.restaurant_id}`}
                className="block rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{review.restaurant?.name || '未知餐厅'}</span>
                    <span className={`ml-2 text-xs font-bold ${review.list_type === 'red' ? 'text-green-600' : 'text-red-600'}`}>
                      {review.list_type === 'red' ? '红榜' : '黑榜'}
                    </span>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.content && <p className="mt-2 text-sm text-gray-500 line-clamp-2">{review.content}</p>}
              </Link>
            ))}
          </div>
        )
      )}

      {activeTab === 'favorites' && (
        favorites.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>还没有收藏餐厅</p>
            <Link href="/red-list" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">去发现好餐厅</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {favorites.map(f => f.restaurant && (
              <RestaurantCard key={f.id} restaurant={f.restaurant} />
            ))}
          </div>
        )
      )}

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
            <p className="text-3xl font-bold text-blue-600">{favorites.length}</p>
            <p className="text-sm text-blue-500 mt-1">收藏餐厅</p>
          </div>
        </div>
      )}
    </div>
  );
}
