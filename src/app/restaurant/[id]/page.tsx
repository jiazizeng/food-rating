'use client';

import { useRestaurant } from '@/hooks/useRestaurants';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { createClient } from '@/lib/supabase/client';
import { StarRating } from '@/components/shared/StarRating';
import { ReviewForm } from '@/components/restaurant/ReviewForm';
import { ReviewList } from '@/components/restaurant/ReviewList';
import { PageLoading } from '@/components/shared/Loading';
import { formatPrice, cn, getNavigationUrls } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MapPin, Phone, Globe, Clock, Heart, Share2,
  Trash2, ArrowLeft, Clock as ClockIcon, XCircle,
  Star, Utensils, Plus, ImagePlus, X, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Food, DishFavorite } from '@/types';

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
  const [showAddDish, setShowAddDish] = useState(false);
  const [dishFavIds, setDishFavIds] = useState<Set<string>>(new Set());

  // New dish form state
  const [newDish, setNewDish] = useState({ name: '', description: '', price: '', rating: '5' });
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishPreview, setDishPreview] = useState<string | null>(null);
  const [submittingDish, setSubmittingDish] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (user && id) {
      supabase.from('browse_history').insert({
        user_id: user.id,
        restaurant_id: id,
      }); void 0; // fire and forget
    }
  }, [user, id]);

  // Fetch dimensional scores
  useEffect(() => {
    if (!id) return;
    const fetchDimScores = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('taste_rating, environment_rating, service_rating, value_rating, would_revisit')
        .eq('restaurant_id', id)
        .eq('is_approved', true);
      if (data && data.length > 0) {
        const reviews = data as any[];
        const scores: DimScores = { taste: 0, environment: 0, service: 0, value: 0, wouldRevisit: 0, total: reviews.length };
        let tc = 0, ec = 0, sc = 0, vc = 0, rc = 0;
        reviews.forEach(r => {
          if (r.taste_rating) { scores.taste += r.taste_rating; tc++; }
          if (r.environment_rating) { scores.environment += r.environment_rating; ec++; }
          if (r.service_rating) { scores.service += r.service_rating; sc++; }
          if (r.value_rating) { scores.value += r.value_rating; vc++; }
          if (r.would_revisit !== null) { scores.wouldRevisit += r.would_revisit ? 1 : 0; rc++; }
        });
        scores.taste = tc > 0 ? scores.taste / tc : 0;
        scores.environment = ec > 0 ? scores.environment / ec : 0;
        scores.service = sc > 0 ? scores.service / sc : 0;
        scores.value = vc > 0 ? scores.value / vc : 0;
        scores.wouldRevisit = rc > 0 ? scores.wouldRevisit / rc : 0;
        setDimScores(scores);
      }
    };
    fetchDimScores();
  }, [id]);

  // Fetch foods + dish favorites
  const fetchFoods = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('foods')
      .select('*')
      .eq('restaurant_id', id)
      .order('rating', { ascending: false });
    if (data) {
      const foodsList = data as Food[];
      // Fetch dish favorites for current user
      if (user) {
        const foodIds = foodsList.map(f => f.id);
        const { data: favs } = await supabase
          .from('dish_favorites')
          .select('food_id')
          .eq('user_id', user.id)
          .in('food_id', foodIds);
        if (favs) {
          const favSet = new Set((favs as { food_id: string }[]).map(f => f.food_id));
          setDishFavIds(favSet);
          foodsList.forEach(f => { f.is_favorited = favSet.has(f.id); });
        }
      }
      setFoods(foodsList);
    }
  }, [id, user]);

  useEffect(() => { fetchFoods(); }, [fetchFoods]);

  // Add dish
  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('请先登录'); return; }
    if (!newDish.name.trim()) { toast.error('请输入菜品名称'); return; }
    setSubmittingDish(true);
    try {
      let imageUrl: string | null = null;
      if (dishImage) {
        const fileName = `${user.id}/foods/${Date.now()}-${dishImage.name}`;
        const { data: upData, error: upErr } = await supabase.storage.from('review-images').upload(fileName, dishImage);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(upData.path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('foods').insert({
        restaurant_id: id,
        name: newDish.name.trim(),
        description: newDish.description || null,
        price: newDish.price ? parseFloat(newDish.price) : null,
        rating: parseFloat(newDish.rating) || 5,
        image: imageUrl,
      });
      if (error) throw error;
      toast.success('菜品添加成功');
      setNewDish({ name: '', description: '', price: '', rating: '5' });
      setDishImage(null);
      setDishPreview(null);
      setShowAddDish(false);
      fetchFoods();
    } catch (err: any) {
      toast.error(err.message || '添加失败');
    } finally {
      setSubmittingDish(false);
    }
  };

  // Toggle dish favorite
  const toggleDishFavorite = async (foodId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    const isFav = dishFavIds.has(foodId);
    if (isFav) {
      await supabase.from('dish_favorites').delete().eq('user_id', user.id).eq('food_id', foodId);
      setDishFavIds(prev => { const n = new Set(prev); n.delete(foodId); return n; });
      toast.success('已取消收藏菜品');
    } else {
      await supabase.from('dish_favorites').insert({ user_id: user.id, food_id: foodId });
      setDishFavIds(prev => new Set(prev).add(foodId));
      toast.success('已收藏菜品');
    }
  };

  const handleDishImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('图片不能超过5MB'); return; }
    setDishImage(file);
    setDishPreview(URL.createObjectURL(file));
  };

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
              {restaurant.cuisine && <span className="rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-xs">{restaurant.cuisine}</span>}
              {restaurant.eaten_status && (
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur', restaurant.eaten_status === 'eaten' ? 'bg-green-500/80' : 'bg-gray-500/60')}>
                  {restaurant.eaten_status === 'eaten' ? '✅ 管理员已吃过' : '📋 管理员未吃过'}
                </span>
              )}
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold backdrop-blur', isRed ? 'bg-green-500/80' : 'bg-red-500/80')}>
                {isRed ? '👍 红榜推荐' : '👎 黑榜避雷'}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
          </div>
        </div>

        <div className="p-6">
          {/* Status banner */}
          {(restaurant.status === 'pending' || restaurant.status === 'rejected') && (user?.id === restaurant.created_by || isAdmin) && (
            <div className={cn('mb-4 rounded-lg px-4 py-3 flex items-center gap-3', restaurant.status === 'pending' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200')}>
              {restaurant.status === 'pending' ? (
                <>
                  <ClockIcon className="h-5 w-5 text-amber-500 shrink-0" />
                  <div><p className="text-sm font-medium text-amber-800">审核中</p><p className="text-xs text-amber-600">你的提交正在等待管理员审核。</p></div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div><p className="text-sm font-medium text-red-800">已驳回</p><p className="text-xs text-red-600">此餐厅未通过管理员审核。</p></div>
                </>
              )}
            </div>
          )}

          {/* Rating bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={cn('h-5 w-5', s <= Math.round(restaurant.avg_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />)}</div>
              <span className="text-2xl font-bold text-gray-900">{restaurant.avg_rating > 0 ? restaurant.avg_rating.toFixed(1) : '-'}</span>
              <span className="text-sm text-gray-400">({restaurant.review_count} 评价)</span>
            </div>
            {restaurant.avg_price && <span className="text-sm font-medium text-gray-700 bg-gray-50 rounded-full px-3 py-1">{formatPrice(restaurant.avg_price)}/人</span>}
            <div className="flex-1" />
            <button onClick={async () => { if (!user) { toast.error('请先登录'); return; } const added = await toggleFavorite(id); toast.success(added ? '已收藏' : '已取消收藏'); }}
              className={cn('rounded-full p-2 transition-colors', favorited ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:text-red-500')}>
              <Heart className={cn('h-5 w-5', favorited && 'fill-red-500')} />
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('链接已复制'); }}
              className="rounded-full bg-gray-50 p-2 text-gray-400 hover:text-gray-600 transition-colors"><Share2 className="h-5 w-5" /></button>
            {isAdmin && (
              <button onClick={() => { if (confirm('确定删除？')) { supabase.from('restaurants').delete().eq('id', id).then(() => { toast.success('已删除'); window.location.href = '/'; }); } }}
                className="rounded-full bg-red-50 p-2 text-red-400 hover:bg-red-100 transition-colors"><Trash2 className="h-5 w-5" /></button>
            )}
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {restaurant.address && <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" /><span className="text-gray-600">{restaurant.address}</span></div>}
            {restaurant.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-gray-400 shrink-0" /><span className="text-gray-600">{restaurant.phone}</span></div>}
            {restaurant.website && <div className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-gray-400 shrink-0" /><a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline truncate">{restaurant.website}</a></div>}
            {restaurant.business_hours && <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-gray-400 shrink-0" /><span className="text-gray-600">{restaurant.business_hours}</span></div>}
          </div>
          {restaurant.description && <p className="text-sm text-gray-600 leading-relaxed mb-4">{restaurant.description}</p>}
          {restaurant.latitude && restaurant.longitude && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">导航到此处：</span>
              {getNavigationUrls(restaurant.latitude, restaurant.longitude, restaurant.name).slice(0, 3).map(app => (
                <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">{app.icon} {app.label}</a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-center"><p className="text-2xl font-bold text-green-600">{restaurant.red_list_count}</p><p className="text-xs text-green-500">红榜推荐</p></div>
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-center"><p className="text-2xl font-bold text-red-600">{restaurant.black_list_count}</p><p className="text-xs text-red-500">黑榜避雷</p></div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-center"><p className="text-2xl font-bold text-blue-600">{restaurant.review_count}</p><p className="text-xs text-blue-500">总评价</p></div>
      </div>

      {/* Dim scores */}
      {dimScores && dimScores.total > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">评价维度</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <DimScoreBar label="味道" emoji="🍜" score={dimScores.taste} />
            <DimScoreBar label="环境" emoji="🏠" score={dimScores.environment} />
            <DimScoreBar label="服务" emoji="👋" score={dimScores.service} />
            <DimScoreBar label="性价比" emoji="💰" score={dimScores.value} />
            <div className="text-center"><p className="text-2xl mb-1">{(dimScores.wouldRevisit * 100).toFixed(0)}%</p><div className="flex justify-center gap-0.5 mb-1">{[1,2,3,4,5].map(i => <div key={i} className={cn('h-1.5 w-5 rounded-full', i <= Math.round(dimScores.wouldRevisit * 5) ? 'bg-green-400' : 'bg-gray-100')} />)}</div><p className="text-xs text-gray-400">愿意再来</p></div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">基于 {dimScores.total} 条真实评价</p>
        </div>
      )}

      {/* Dish management */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">菜品</h2>
            <span className="text-xs text-gray-400">({foods.length})</span>
          </div>
          {user && (
            <button onClick={() => setShowAddDish(!showAddDish)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 transition-colors">
              <Plus className="h-3.5 w-3.5" /> 添加菜品
            </button>
          )}
        </div>

        {/* Add dish form */}
        {showAddDish && (
          <form onSubmit={handleAddDish} className="mb-5 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <input type="text" value={newDish.name} onChange={e => setNewDish(p => ({ ...p, name: e.target.value }))}
                placeholder="菜品名称 *" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
              <div className="flex gap-2">
                <input type="number" value={newDish.price} onChange={e => setNewDish(p => ({ ...p, price: e.target.value }))}
                  placeholder="价格" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" />
                <select value={newDish.rating} onChange={e => setNewDish(p => ({ ...p, rating: e.target.value }))}
                  className="w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none">
                  {[10,9.5,9,8.5,8,7.5,7,6.5,6,5.5,5,4,3,2,1].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <input type="text" value={newDish.description} onChange={e => setNewDish(p => ({ ...p, description: e.target.value }))}
              placeholder="简短描述（选填）" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none mb-3" />
            <div className="flex items-center gap-3">
              {dishPreview ? (
                <div className="relative h-16 w-16 rounded-lg overflow-hidden"><img src={dishPreview} alt="" className="h-full w-full object-cover" /><button type="button" onClick={() => { setDishImage(null); setDishPreview(null); }} className="absolute top-0 right-0 rounded-full bg-black/50 p-0.5 text-white"><X className="h-3 w-3" /></button></div>
              ) : (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 transition-colors"><ImagePlus className="h-5 w-5" /><input type="file" accept="image/*" onChange={handleDishImageChange} className="hidden" /></label>
              )}
              <button type="submit" disabled={submittingDish} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors">{submittingDish ? '添加中...' : '添加菜品'}</button>
              <button type="button" onClick={() => { setShowAddDish(false); setDishImage(null); setDishPreview(null); }} className="text-sm text-gray-400 hover:text-gray-600">取消</button>
            </div>
          </form>
        )}

        {/* Dish list */}
        {foods.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">还没有菜品</p>
            {user && <button onClick={() => setShowAddDish(true)} className="text-orange-600 text-xs hover:underline mt-1">添加第一个菜品</button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {foods.map(food => (
              <div key={food.id} className="flex gap-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors group">
                <div className="relative h-16 w-16 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                  {food.image ? <img src={food.image} alt={food.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">🍱</div>}
                  {user && (
                    <button onClick={() => toggleDishFavorite(food.id)}
                      className="absolute top-0.5 right-0.5 rounded-full bg-white/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className={cn('h-3 w-3', dishFavIds.has(food.id) ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{food.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-amber-600">{food.rating.toFixed(1)}</span>
                  </div>
                  {food.description && <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{food.description}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {food.price && <p className="text-xs text-gray-500">¥{food.price}</p>}
                    {dishFavIds.has(food.id) && <span className="text-[10px] text-red-400">❤ 已收藏</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">用户评价</h2>
          {user && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">写评价</button>
          )}
        </div>
        {showReviewForm && <div className="mb-6"><ReviewForm restaurantId={id} onSuccess={() => setShowReviewForm(false)} onCancel={() => setShowReviewForm(false)} /></div>}
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
        <div className={cn('h-full rounded-full transition-all duration-500', score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm font-bold mt-1 text-gray-700">{score > 0 ? score.toFixed(1) : '-'}</p>
    </div>
  );
}
