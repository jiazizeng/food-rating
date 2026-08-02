'use client';

import { useRestaurant } from '@/hooks/useRestaurants';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { createClient } from '@/lib/supabase/client';
import { StarRating } from '@/components/shared/StarRating';
import { ReviewForm } from '@/components/restaurant/ReviewForm';
import { ReviewList } from '@/components/restaurant/ReviewList';
import { PageLoading } from '@/components/shared/Loading';
import { formatPrice, cn, getMapUrl } from '@/lib/utils';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MapPin, Phone, Globe, Clock, Heart, Share2, ExternalLink, Trash2, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RestaurantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { restaurant, loading } = useRestaurant(id);
  const { user, isAdmin } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (user && id) {
      supabase.from('browse_history').insert({
        user_id: user.id,
        restaurant_id: id,
      }).then(() => { /* noop */ });
    }
  }, [user, id]);

  if (loading) return <PageLoading />;
  if (!restaurant) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <p className="text-xl text-gray-500">餐厅不存在</p>
        <Link href="/" className="mt-4 text-indigo-600 hover:underline inline-block">返回首页</Link>
      </div>
    </div>
  );

  const favorited = isFavorited(id);
  const isRed = restaurant.avg_rating >= 3.5;

  const handleFavorite = async () => {
    if (!user) { toast.error('请先登录'); return; }
    const added = await toggleFavorite(id);
    toast.success(added ? '已收藏' : '已取消收藏');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4" /> 返回
      </Link>

      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 mb-6">
        <div className="relative aspect-[21/9] bg-gray-100">
          {restaurant.cover_image ? (
            <img src={restaurant.cover_image} alt={restaurant.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl bg-gradient-to-br from-gray-50 to-gray-200">
              🍽️
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              {restaurant.cuisine && (
                <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-xs">{restaurant.cuisine}</span>
              )}
              {restaurant.eaten_status && (
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur',
                  restaurant.eaten_status === 'eaten'
                    ? 'bg-green-500/80 text-white'
                    : 'bg-gray-500/60 text-white'
                )}>
                  {restaurant.eaten_status === 'eaten' ? '✅ 管理员已吃过' : '📋 管理员未吃过'}
                </span>
              )}
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur',
                isRed ? 'bg-green-500/80' : 'bg-red-500/80'
              )}>
                {isRed ? '👍 红榜' : '👎 黑榜'}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <StarRating rating={Math.round(restaurant.avg_rating)} size="lg" showValue />
            <span className="text-sm text-gray-500">{restaurant.review_count} 条评价</span>
            {restaurant.avg_price && (
              <span className="text-sm font-medium text-gray-700">{formatPrice(restaurant.avg_price)}/人</span>
            )}
            <div className="flex-1" />
            <button onClick={handleFavorite}
              className={cn(
                'rounded-full p-2 transition-colors',
                favorited ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500'
              )}>
              <Heart className={cn('h-5 w-5', favorited && 'fill-red-500')} />
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('链接已复制'); }}
              className="rounded-full bg-gray-50 p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Share2 className="h-5 w-5" />
            </button>
            {isAdmin && (
              <button onClick={() => {
                if (confirm('确定要删除这家餐厅吗？所有评价和收藏也会被删除。')) {
                  supabase.from('restaurants').delete().eq('id', id).then(() => {
                    toast.success('已删除');
                    window.location.href = '/';
                  });
                }
              }}
                className="rounded-full bg-red-50 p-2 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="删除餐厅">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {restaurant.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-600">{restaurant.address}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">{restaurant.phone}</span>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">{restaurant.website}</a>
              </div>
            )}
            {restaurant.business_hours && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-600">{restaurant.business_hours}</span>
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-4">{restaurant.description}</p>
          )}

          {restaurant.latitude && restaurant.longitude && (
            <a href={getMapUrl(restaurant.latitude, restaurant.longitude)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <ExternalLink className="h-3 w-3" /> 在地图中查看
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-600">{restaurant.red_list_count}</p>
          <p className="text-xs text-green-500">红榜推荐</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600">{restaurant.black_list_count}</p>
          <p className="text-xs text-red-500">黑榜避雷</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{restaurant.review_count}</p>
          <p className="text-xs text-blue-500">总评价</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">用户评价</h2>
          {user && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
              写评价
            </button>
          )}
        </div>
        {showReviewForm && (
          <div className="mb-6">
            <ReviewForm restaurantId={id} onSuccess={() => setShowReviewForm(false)} onCancel={() => setShowReviewForm(false)} />
          </div>
        )}
        <ReviewList restaurantId={id} />
      </div>
    </div>
  );
}
