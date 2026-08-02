'use client';

import type { Restaurant } from '@/types';
import { formatPrice, cn } from '@/lib/utils';
import { StarRating } from '@/components/shared/StarRating';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Heart, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface RestaurantCardProps {
  restaurant: Restaurant;
  listType?: 'red' | 'black';
}

export function RestaurantCard({ restaurant, listType }: RestaurantCardProps) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const { user } = useAuth();
  const favorited = isFavorited(restaurant.id);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('请先登录'); return; }
    const added = await toggleFavorite(restaurant.id);
    toast.success(added ? '已收藏' : '已取消收藏');
  };

  const isRed = listType === 'red';
  const isBlack = listType === 'black';

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className="group block rounded-xl border border-gray-100 bg-white overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {restaurant.cover_image ? (
          <img
            src={restaurant.cover_image}
            alt={restaurant.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl bg-gradient-to-br from-gray-50 to-gray-100">
            🍽️
          </div>
        )}
        {/* Badge */}
        {(restaurant.list_type) && (
          <div className={cn(
            'absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold text-white',
            restaurant.list_type === 'red' ? 'bg-green-500' : 'bg-red-500'
          )}>
            {restaurant.list_type === 'red' ? '👍 红榜' : '👎 黑榜'}
          </div>
        )}
        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 rounded-full bg-white/90 p-2 shadow-sm hover:bg-white transition-colors"
        >
          <Heart
            className={cn(
              'h-4 w-4 transition-colors',
              favorited ? 'fill-red-500 text-red-500' : 'text-gray-400'
            )}
          />
        </button>
      </div>

      <div className="p-4">
        {/* Category & price */}
        <div className="flex items-center gap-2 mb-1.5">
          {restaurant.cuisine && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
              {restaurant.cuisine}
            </span>
          )}
          {restaurant.avg_price && (
            <span className="text-xs text-gray-400">{formatPrice(restaurant.avg_price)}/人</span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
          {restaurant.name}
        </h3>

        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-2">
          <StarRating rating={Math.round(restaurant.avg_rating)} size="sm" />
          <span className="text-xs text-gray-400">{restaurant.review_count} 条评价</span>
        </div>

        {/* Address */}
        {restaurant.city && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" /> {restaurant.city}{restaurant.address ? ` · ${restaurant.address.slice(0, 15)}` : ''}
          </div>
        )}
      </div>
    </Link>
  );
}
