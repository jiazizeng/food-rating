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
  MapPin, Phone, Globe, Clock, Heart, Share2, ExternalLink,
  Trash2, ArrowLeft, Clock as ClockIcon, XCircle,
  Star, Utensils,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Food, Review } from '@/types';

interface DimScores {
  taste: number;
  environment: number;
  service: number;
  value: number;
  wouldRevisit: number;
  total: number;
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { restaurant, loading } = useRestaurant(id);
  const { user, isAdmin } = useAuth();
  const { isFavorited, toggleFavorite } = useFavorites();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [dimScores, setDimScores] = useState<DimScores | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (user && id) {
      supabase.from('browse_history').insert({
        user_id: user.id,
        restaurant_id: id,
      }).then(() => { /* noop */ });
    }
  }, [user, id]);

  // Fetch dimensional scores from reviews
  useEffect(() => {
    if (!id) return;
    const fetchDimScores = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('taste_rating, environment_rating, service_rating, value_rating, would_revisit')
        .eq('restaurant_id', id)
        .eq('is_approved', true);

      if (data && data.length > 0) {
        const reviews = data as { taste_rating: number | null; environment_rating: number | null; service_rating: number | null; value_rating: number | null; would_revisit: boolean | null }[];
        const scores: DimScores = { taste: 0, environment: 0, service: 0, value: 0, wouldRevisit: 0, total: reviews.length };
        let tasteCount = 0, envCount = 0, servCount = 0, valCount = 0, revisitCount = 0;

        reviews.forEach(r => {
          if (r.taste_rating) { scores.taste += r.taste_rating; tasteCount++; }
          if (r.environment_rating) { scores.environment += r.environment_rating; envCount++; }
          if (r.service_rating) { scores.service += r.service_rating; servCount++; }
          if (r.value_rating) { scores.value += r.value_rating; valCount++; }
          if (r.would_revisit !== null) { scores.wouldRevisit += r.would_revisit ? 1 : 0; revisitCount++; }
        });

        scores.taste = tasteCount > 0 ? scores.taste / tasteCount : 0;
        scores.environment = envCount > 0 ? scores.environment / envCount : 0;
        scores.service = servCount > 0 ? scores.service / servCount : 0;
        scores.value = valCount > 0 ? scores.value / valCount : 0;
        scores.wouldRevisit = revisitCount > 0 ? scores.wouldRevisit / revisitCount : 0;

        setDimScores(scores);
      }
    };
    fetchDimScores();
  }, [id]);

  // Fetch foods for this restaurant
  useEffect(() => {
    if (!id) return;
    const fetchFoods = async () => {
      const { data } = await supabase
        .from('foods')
        .select('*')
        .eq('restaurant_id', id)
        .order('rating', { ascending: false })
        .limit(6);
      if (data) setFoods(data as Food[]);
    };
    fetchFoods();
  }, [id]);

  if (loading) return <PageLoading />;
  if (!restaurant) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <p className="text-xl text-gray-500">餐厅不存在</p>
        <Link href="/" className="mt-4 text-orange-600 hover:underline inline-block">返回首页</Link>
      </div>
    </div>
  );

  const favorited = isFavorited(id);
  const isRed = restaurant.list_type === 'red' || restaurant.avg_rating >= 3.5;

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

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 mb-6">
        <div className="relative aspect-[21/9] bg-gray-100">
          {restaurant.cover_image ? (
            <img src={restaurant.cover_image} alt={restaurant.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
              <span className="opacity-50">🍽️</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {restaurant.cuisine && (
                <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-xs">{restaurant.cuisine}</span>
              )}
              {restaurant.eaten_status && (
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur',
                  restaurant.eaten_status === 'eaten' ? 'bg-green-500/80' : 'bg-gray-500/60'
                )}>
                  {restaurant.eaten_status === 'eaten' ? '✅ 管理员已吃过' : '📋 管理员未吃过'}
                </span>
              )}
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur',
                isRed ? 'bg-green-500/80' : 'bg-red-500/80'
              )}>
                {isRed ? '👍 红榜推荐' : '👎 黑榜避雷'}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          </div>
        </div>

        <div className="p-6">
          {/* Status banner */}
          {(restaurant.status === 'pending' || restaurant.status === 'rejected') && (user?.id === restaurant.created_by || isAdmin) && (
            <div className={`mb-4 rounded-lg px-4 py-3 flex items-center gap-3 ${
              restaurant.status === 'pending' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'
            }`}>
              {restaurant.status === 'pending' ? (
                <>
                  <ClockIcon className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">审核中</p>
                    <p className="text-xs text-amber-600">你的提交正在等待管理员审核，通过后将对所有人可见。</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">已驳回</p>
                    <p className="text-xs text-red-600">此餐厅未通过管理员审核，不会公开展示。</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Rating & action bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={cn('h-5 w-5', s <= Math.round(restaurant.avg_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                ))}
              </div>
              <span className="text-2xl font-bold text-gray-900">{restaurant.avg_rating > 0 ? restaurant.avg_rating.toFixed(1) : '-'}</span>
              <span className="text-sm text-gray-400">({restaurant.review_count} 评价)</span>
            </div>
            {restaurant.avg_price && (
              <span className="text-sm font-medium text-gray-700 bg-gray-50 rounded-full px-3 py-1">{formatPrice(restaurant.avg_price)}/人</span>
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
                if (confirm('确定要删除这家餐厅吗？')) {
                  supabase.from('restaurants').delete().eq('id', id).then(() => {
                    toast.success('已删除');
                    window.location.href = '/';
                  });
                }
              }}
                className="rounded-full bg-red-50 p-2 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Info grid */}
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
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline truncate">{restaurant.website}</a>
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
              className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline">
              <ExternalLink className="h-3 w-3" /> 在地图中查看
            </a>
          )}
        </div>
      </div>

      {/* Stats row */}
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

      {/* Dimensional ratings */}
      {dimScores && dimScores.total > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">评价维度</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <DimScoreBar label="味道" emoji="🍜" score={dimScores.taste} />
            <DimScoreBar label="环境" emoji="🏠" score={dimScores.environment} />
            <DimScoreBar label="服务" emoji="👋" score={dimScores.service} />
            <DimScoreBar label="性价比" emoji="💰" score={dimScores.value} />
            <div className="text-center">
              <p className="text-2xl mb-1">{(dimScores.wouldRevisit * 100).toFixed(0)}%</p>
              <div className="flex justify-center gap-0.5 mb-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={cn('h-1.5 w-5 rounded-full', i <= Math.round(dimScores.wouldRevisit * 5) ? 'bg-green-400' : 'bg-gray-100')} />
                ))}
              </div>
              <p className="text-xs text-gray-400">愿意再来</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">基于 {dimScores.total} 条真实评价</p>
        </div>
      )}

      {/* Popular dishes */}
      {foods.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">推荐菜品</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {foods.map(food => (
              <div key={food.id} className="flex gap-3 p-3 rounded-xl bg-gray-50/50">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  {food.image ? (
                    <img src={food.image} alt={food.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl">🍱</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{food.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-amber-600">{food.rating.toFixed(1)}</span>
                  </div>
                  {food.description && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{food.description}</p>
                  )}
                  {food.price && (
                    <p className="text-xs text-gray-400 mt-0.5">¥{food.price}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">用户评价</h2>
          {user && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">
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

function DimScoreBar({ label, emoji, score }: { label: string; emoji: string; score: number }) {
  const pct = score > 0 ? (score / 10) * 100 : 0;
  return (
    <div className="text-center">
      <p className="text-xl mb-0.5">{emoji}</p>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-amber-400' : 'bg-red-400'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm font-bold mt-1 text-gray-700">{score > 0 ? score.toFixed(1) : '-'}</p>
    </div>
  );
}
