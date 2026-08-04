'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatRelativeTime, cn, getInitials } from '@/lib/utils';
import { StarRating } from '@/components/shared/StarRating';
import { Loading } from '@/components/shared/Loading';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Check, X, Trash2, Utensils, MessageSquare, Clock, Pencil,
  ChevronDown, User, MapPin, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Restaurant, Review, EatenStatus, Profile } from '@/types';

type TabKey = 'restaurants' | 'reviews';

export default function AdminPage() {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('restaurants');
  const [pendingRestaurants, setPendingRestaurants] = useState<Restaurant[]>([]);
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
      toast.error('无管理员权限');
    }
  }, [authLoading, isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rRes, revRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false }),
    ]);
    if (rRes.data) setPendingRestaurants(rRes.data as Restaurant[]);
    if (revRes.data && revRes.data.length > 0) {
      const reviews = revRes.data as Review[];
      // Fetch user profiles
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const restaurantIds = [...new Set(reviews.map(r => r.restaurant_id))];
      const [profRes, restRes] = await Promise.all([
        supabase.from('profiles').select('*').in('id', userIds),
        supabase.from('restaurants').select('id, name').in('id', restaurantIds),
      ]);
      const profileMap: Record<string, Profile> = {};
      (profRes.data || []).forEach((p: Profile) => { profileMap[p.id] = p; });
      const restaurantMap: Record<string, { id: string; name: string }> = {};
      (restRes.data || []).forEach((r: { id: string; name: string }) => { restaurantMap[r.id] = r; });
      // Merge data
      const enriched = reviews.map(r => ({
        ...r,
        user: profileMap[r.user_id] || undefined,
        restaurant: restaurantMap[r.restaurant_id] ? { id: r.restaurant_id, name: restaurantMap[r.restaurant_id].name } as unknown as Review['restaurant'] : undefined,
      }));
      setPendingReviews(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin, fetchData]);

  const handleApproveRestaurant = async (id: string, eaten: EatenStatus) => {
    const { error } = await supabase
      .from('restaurants')
      .update({
        status: 'approved',
        is_approved: true,
        eaten_status: eaten,
        reviewed_by: user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) { toast.error('操作失败'); return; }
    toast.success(`已审核通过（${eaten === 'eaten' ? '已吃过' : '未吃过'}）`);
    setPendingRestaurants(prev => prev.filter(r => r.id !== id));
  };

  const handleRejectRestaurant = async (id: string) => {
    const { error } = await supabase
      .from('restaurants')
      .update({
        status: 'rejected',
        reviewed_by: user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) { toast.error('操作失败'); return; }
    toast.success('已驳回');
    setPendingRestaurants(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm('确定要永久删除这家餐厅吗？所有相关评价、收藏也会被删除，此操作不可恢复。')) return;
    const { error } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (error) { toast.error('删除失败'); return; }
    toast.success('已删除');
    setPendingRestaurants(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateEatenStatus = async (id: string, eaten: EatenStatus) => {
    const { error } = await supabase
      .from('restaurants')
      .update({
        eaten_status: eaten,
        reviewed_by: user!.id,
      })
      .eq('id', id);

    if (error) { toast.error('更新失败'); return; }
    toast.success(`已更新为「${eaten === 'eaten' ? '已吃过' : '未吃过'}」`);
    setPendingRestaurants(prev => prev.map(r =>
      r.id === id ? { ...r, eaten_status: eaten } : r
    ));
  };

  const handleApproveReview = async (id: string, eaten: EatenStatus) => {
    const { error } = await supabase
      .from('reviews')
      .update({
        is_approved: true,
        eaten_status: eaten,
        reviewed_by: user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) { toast.error('操作失败'); return; }

    // Update restaurant stats
    const review = pendingReviews.find(r => r.id === id);
    if (review) {
      await supabase.rpc('update_restaurant_stats', { restaurant_id: review.restaurant_id });
    }

    toast.success(`评价已通过（${eaten === 'eaten' ? '已吃过' : '未吃过'}）`);
    setPendingReviews(prev => prev.filter(r => r.id !== id));
  };

  const handleRejectReview = async (id: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({
        is_approved: false,
        reviewed_by: user!.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) { toast.error('操作失败'); return; }
    toast.success('评价已驳回');
    setPendingReviews(prev => prev.filter(r => r.id !== id));
  };

  if (authLoading) return <Loading />;
  if (!isAdmin) return null;

  const pendingCount = pendingRestaurants.filter(r => r.status === 'pending').length;
  const rejectedCount = pendingRestaurants.filter(r => r.status === 'rejected').length;
  const approvedCount = pendingRestaurants.filter(r => r.status === 'approved').length;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Shield className="h-5 w-5 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">管理面板</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">审核餐厅和评价内容</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-gray-500">待审核餐厅</span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">已通过餐厅</span>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-red-500" />
            <span className="text-xs text-gray-500">待审核评价</span>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{pendingReviews.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'restaurants'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <Utensils className="h-4 w-4" /> 餐厅审核
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'reviews'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          <MessageSquare className="h-4 w-4" /> 评价审核
          {pendingReviews.length > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
              {pendingReviews.length}
            </span>
          )}
        </button>
      </div>

      {loading ? <Loading /> : (
        <>
          {/* Restaurant approval list */}
          {activeTab === 'restaurants' && (
            pendingRestaurants.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">没有待处理的餐厅</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRestaurants.map(r => (
                  <RestaurantApprovalCard
                    key={r.id}
                    restaurant={r}
                    onApprove={handleApproveRestaurant}
                    onReject={handleRejectRestaurant}
                    onDelete={handleDeleteRestaurant}
                    onUpdateEaten={handleUpdateEatenStatus}
                  />
                ))}
              </div>
            )
          )}

          {/* Review approval list */}
          {activeTab === 'reviews' && (
            pendingReviews.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">没有待审核的评价</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingReviews.map(r => (
                  <ReviewApprovalCard
                    key={r.id}
                    review={r}
                    onApprove={handleApproveReview}
                    onReject={handleRejectReview}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// === Sub-components ===

function EatenStatusSelect({ value, onChange }: { value: EatenStatus | null; onChange: (v: EatenStatus) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          value === 'eaten'
            ? 'border-green-300 bg-green-50 text-green-700'
            : value === 'not_eaten'
            ? 'border-gray-300 bg-gray-50 text-gray-600'
            : 'border-gray-200 text-gray-500'
        )}
      >
        {value === 'eaten' ? '✅ 已吃过' : value === 'not_eaten' ? '📋 未吃过' : '选择...'}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-36 rounded-lg border border-gray-100 bg-white shadow-lg py-1 z-20">
            <button
              onClick={() => { onChange('eaten'); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
            >
              ✅ 已吃过
            </button>
            <button
              onClick={() => { onChange('not_eaten'); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              📋 未吃过
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RestaurantApprovalCard({
  restaurant, onApprove, onReject, onDelete, onUpdateEaten,
}: {
  restaurant: Restaurant;
  onApprove: (id: string, eaten: EatenStatus) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateEaten: (id: string, eaten: EatenStatus) => void;
}) {
  const [eatenStatus, setEatenStatus] = useState<EatenStatus | null>(null);

  const isPending = restaurant.status === 'pending';
  const isRejected = restaurant.status === 'rejected';

  return (
    <div className={cn(
      'rounded-xl border bg-white p-5',
      isPending ? 'border-amber-200' : isRejected ? 'border-red-100 bg-red-50/30' : 'border-green-100'
    )}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex gap-4 flex-1 min-w-0">
          {/* Cover thumbnail */}
          <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-100 overflow-hidden">
            {restaurant.cover_image ? (
              <img src={restaurant.cover_image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl">🍽️</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Link href={`/restaurant/${restaurant.id}`} className="font-semibold text-gray-900 hover:text-orange-600 truncate">
                {restaurant.name}
              </Link>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                isPending ? 'bg-amber-100 text-amber-700' :
                isRejected ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              )}>
                {isPending ? '待审核' : isRejected ? '已驳回' : '已通过'}
              </span>
              {restaurant.eaten_status && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  {restaurant.eaten_status === 'eaten' ? '已吃过' : '未吃过'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
              {restaurant.cuisine && <span>{restaurant.cuisine}</span>}
              {restaurant.city && (
                <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{restaurant.city}</span>
              )}
              {restaurant.avg_price && <span>¥{restaurant.avg_price}/人</span>}
            </div>

            {restaurant.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{restaurant.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {restaurant.created_by ? restaurant.created_by.slice(0, 8) + '...' : '匿名'}
              </span>
              <span>{formatRelativeTime(restaurant.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <EatenStatusSelect value={eatenStatus} onChange={setEatenStatus} />
            <button
              onClick={() => {
                if (!eatenStatus) { toast.error('请先选择"已吃过"或"未吃过"'); return; }
                onApprove(restaurant.id, eatenStatus);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              <Check className="h-4 w-4" /> 通过
            </button>
            <button
              onClick={() => onReject(restaurant.id)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" /> 驳回
            </button>
          </div>
        )}

        {!isPending && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
            <Link
              href={`/restaurant/${restaurant.id}`}
              className="flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" /> 编辑
            </Link>
            <span className="text-[10px] text-gray-300">|</span>
            <button
              onClick={() => onUpdateEaten(restaurant.id, 'eaten')}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                restaurant.eaten_status === 'eaten'
                  ? 'bg-green-500 text-white'
                  : 'border border-green-200 text-green-600 hover:bg-green-50'
              }`}
            >
              ✅ 已吃过
            </button>
            <button
              onClick={() => onUpdateEaten(restaurant.id, 'not_eaten')}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                restaurant.eaten_status === 'not_eaten'
                  ? 'bg-gray-500 text-white'
                  : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              📋 未吃过
            </button>
            <span className="text-[10px] text-gray-300">|</span>
            <button
              onClick={() => onDelete(restaurant.id)}
              className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewApprovalCard({
  review, onApprove, onReject,
}: {
  review: Review;
  onApprove: (id: string, eaten: EatenStatus) => void;
  onReject: (id: string) => void;
}) {
  const [eatenStatus, setEatenStatus] = useState<EatenStatus | null>(null);

  return (
    <div className="rounded-xl border border-amber-200 bg-white p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-600">
              {getInitials(review.user?.display_name || review.user?.username || 'U')}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {review.user?.display_name || review.user?.username || '匿名'}
            </span>
            <span className="text-xs text-gray-400">评价了</span>
            <Link href={`/restaurant/${review.restaurant_id}`} className="text-sm font-medium text-orange-600 hover:underline">
              {review.restaurant?.name || '未知餐厅'}
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <StarRating rating={review.rating} size="sm" />
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold',
              review.list_type === 'red' ? 'bg-green-100 text-green-700' : review.list_type === 'black' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            )}>
              {review.list_type === 'red' ? '红榜' : review.list_type === 'black' ? '黑榜' : '灰榜'}
            </span>
          </div>

          {review.title && <p className="font-medium text-gray-900 text-sm mb-0.5">{review.title}</p>}
          {review.content && <p className="text-sm text-gray-500 line-clamp-3">{review.content}</p>}

          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-2">
              {review.images.slice(0, 3).map((img, i) => (
                <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">{formatRelativeTime(review.created_at)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          <EatenStatusSelect value={eatenStatus} onChange={setEatenStatus} />
          <button
            onClick={() => {
              if (!eatenStatus) { toast.error('请先选择"已吃过"或"未吃过"'); return; }
              onApprove(review.id, eatenStatus);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          >
            <Check className="h-4 w-4" /> 通过
          </button>
          <button
            onClick={() => onReject(review.id)}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="h-4 w-4" /> 驳回
          </button>
        </div>
      </div>
    </div>
  );
}
