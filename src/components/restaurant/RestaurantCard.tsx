'use client';

import type { Restaurant } from '@/types';
import { formatPrice, formatRelativeTime, cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Heart, MapPin, Star, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface RestaurantCardProps {
  restaurant: Restaurant;
  listType?: 'red' | 'black';
}

export function RestaurantCard({ restaurant, listType }: RestaurantCardProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const favorited = isFavorited(restaurant.id);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (restaurant.created_by) {
      supabase.from('profiles').select('display_name, username').eq('id', restaurant.created_by).single()
        .then(({ data }) => {
          if (data) setCreatorName(data.display_name || data.username);
        });
    }
  }, [restaurant.created_by]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('请先登录'); return; }
    const added = await toggleFavorite(restaurant.id);
    toast.success(added ? '已收藏' : '已取消收藏');
  };

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group block rounded-2xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {restaurant.cover_image ? (
          <img src={restaurant.cover_image} alt={restaurant.name} loading="lazy"
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-400" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50">
            <span className="opacity-60">🍽️</span>
          </div>
        )}
        {restaurant.list_type && (
          <div className={cn('absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-sm',
            restaurant.list_type === 'red' ? 'bg-green-500' : 'bg-red-500')}>
            {restaurant.list_type === 'red' ? '👍 红榜' : '👎 黑榜'}
          </div>
        )}
        <button onClick={handleFavorite}
          className="absolute top-2.5 right-2.5 rounded-full bg-white/90 p-2 shadow-sm hover:bg-white hover:scale-110 transition-all">
          <Heart className={cn('h-4 w-4 transition-colors', favorited ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
        </button>
        {restaurant.avg_price && (
          <div className="absolute bottom-2.5 right-2.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white">
            ¥{restaurant.avg_price}/人
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          {restaurant.cuisine ? (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">{restaurant.cuisine}</span>
          ) : (
            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">未分类</span>
          )}
          <span className="text-[10px] text-gray-400">{restaurant.review_count} 评价</span>
        </div>

        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors text-sm leading-tight line-clamp-1">
          {restaurant.name}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={cn('h-3 w-3', s <= Math.round(restaurant.avg_rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
            ))}
          </div>
          <span className="text-xs font-bold text-amber-600">{restaurant.avg_rating > 0 ? restaurant.avg_rating.toFixed(1) : '-'}</span>
        </div>

        {/* City + submitter */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1 truncate">
            {restaurant.city ? <><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{restaurant.city}</span></> : null}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {creatorName ? <><User className="h-3 w-3" /><span className="truncate max-w-[60px]">{creatorName}</span></> : null}
            <span>{formatRelativeTime(restaurant.created_at)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
