'use client';

import type { Review, Comment, Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StarRating } from '@/components/shared/StarRating';
import { formatRelativeTime, cn, getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Flag, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewListProps {
  restaurantId: string;
}

export function ReviewList({ restaurantId }: ReviewListProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReply, setActiveReply] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const supabase = createClient();

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const reviews = data as Review[];
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      const profileMap: Record<string, Profile> = {};
      (profiles || []).forEach((p: Profile) => { profileMap[p.id] = p; });

      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .in('review_id', reviews.map(r => r.id));
      const commentMap: Record<string, Comment[]> = {};
      (comments || []).forEach((c: Comment) => {
        if (!commentMap[c.review_id]) commentMap[c.review_id] = [];
        commentMap[c.review_id].push(c);
      });

      const mapped = reviews.map(r => ({
        ...r,
        user: profileMap[r.user_id] || undefined,
        comments: (commentMap[r.id] || []).map(c => ({
          ...c,
          user: profileMap[c.user_id] || undefined,
        })),
        liked_by_me: false,
      })) as unknown as Review[];
      setReviews(mapped);
    } else {
      setReviews([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, [restaurantId]);

  const handleLike = async (reviewId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    const { data: existing } = await supabase
      .from('review_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
      .single();
    if (existing) {
      await supabase.from('review_likes').delete().eq('id', existing.id);
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, likes_count: r.likes_count - 1, liked_by_me: false } : r
      ));
    } else {
      await supabase.from('review_likes').insert({ user_id: user.id, review_id: reviewId });
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, likes_count: r.likes_count + 1, liked_by_me: true } : r
      ));
    }
  };

  const handleReply = async (reviewId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    if (!replyContent.trim()) return;
    await supabase.from('comments').insert({
      user_id: user.id,
      review_id: reviewId,
      content: replyContent.trim(),
    });
    toast.success('回复成功');
    setReplyContent('');
    setActiveReply(null);
    fetchReviews();
  };

  const handleReport = async (reviewId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'review',
      target_id: reviewId,
      reason: '用户举报',
    });
    toast.success('举报已提交');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-gray-100 mb-2" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white/50 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mx-auto mb-4">
          <MessageCircle className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">成为第一个分享体验的人</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
          写下你的真实用餐体验，帮助更多人找到值得吃的地方
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className={cn(
          'rounded-2xl border p-5 transition-all',
          review.list_type === 'red' ? 'border-green-100 bg-white hover:border-green-200' : 'border-red-100 bg-white hover:border-red-200'
        )}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600 shrink-0">
                {review.user ? getInitials(review.user.display_name || review.user.username || 'U') : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {review.user?.display_name || review.user?.username || '匿名用户'}
                  </span>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold',
                    review.list_type === 'red' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {review.list_type === 'red' ? '👍 推荐' : '👎 避雷'}
                  </span>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(review.created_at)}</span>
          </div>

          {/* Dimension scores if available */}
          {(review.taste_rating || review.environment_rating || review.service_rating || review.value_rating) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 p-3 rounded-xl bg-gray-50/50">
              {review.taste_rating && (
                <span className="text-xs text-gray-600">🍜 味道 <span className="font-bold text-gray-800">{review.taste_rating}</span>/10</span>
              )}
              {review.environment_rating && (
                <span className="text-xs text-gray-600">🏠 环境 <span className="font-bold text-gray-800">{review.environment_rating}</span>/10</span>
              )}
              {review.service_rating && (
                <span className="text-xs text-gray-600">👋 服务 <span className="font-bold text-gray-800">{review.service_rating}</span>/10</span>
              )}
              {review.value_rating && (
                <span className="text-xs text-gray-600">💰 性价比 <span className="font-bold text-gray-800">{review.value_rating}</span>/10</span>
              )}
              {review.would_revisit !== undefined && (
                <span className={cn('text-xs font-medium', review.would_revisit ? 'text-green-600' : 'text-red-500')}>
                  {review.would_revisit ? '👍 愿意再来' : '👎 不再来了'}
                </span>
              )}
            </div>
          )}

          {/* Title & Content */}
          {review.title && <h4 className="font-medium text-gray-900 mb-1.5">{review.title}</h4>}
          {review.content && <p className="text-sm text-gray-600 leading-relaxed">{review.content}</p>}

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {review.images.map((img, i) => (
                <img key={i} src={img} alt="" loading="lazy" className="h-24 w-24 rounded-xl object-cover shrink-0" />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
            <button onClick={() => handleLike(review.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Heart className={cn('h-3.5 w-3.5', review.liked_by_me && 'fill-red-500 text-red-500')} />
              {review.likes_count || 0}
            </button>
            <button onClick={() => setActiveReply(activeReply === review.id ? null : review.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" /> 回复
            </button>
            <button onClick={() => handleReport(review.id)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors">
              <Flag className="h-3.5 w-3.5" /> 举报
            </button>
          </div>

          {/* Comments */}
          {(review as Review & { comments?: Comment[] }).comments && (review as Review & { comments?: Comment[] }).comments!.length > 0 && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-orange-100">
              {(review as Review & { comments?: Comment[] }).comments!.map(comment => (
                <div key={comment.id} className="text-sm">
                  <span className="font-medium text-gray-700 mr-1">{(comment.user as Profile)?.display_name || '匿名'}:</span>
                  <span className="text-gray-500">{comment.content}</span>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {activeReply === review.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text" value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                onKeyDown={e => { if (e.key === 'Enter') handleReply(review.id); }}
              />
              <button onClick={() => handleReply(review.id)} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700 transition-colors">
                发送
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
