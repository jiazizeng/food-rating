'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
}

export function StarRating({
  rating, maxRating = 5, size = 'md', interactive = false,
  onChange, showValue = false,
}: StarRatingProps) {
  const sizeMap = { sm: 'h-3.5 w-3.5', md: 'h-5 w-5', lg: 'h-7 w-7' };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => {
        const filled = i < rating;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                'transition-colors',
                filled ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
              )}
            />
          </button>
        );
      })}
      {showValue && rating > 0 && (
        <span className={cn(
          'ml-1.5 font-semibold',
          size === 'sm' ? 'text-xs' : 'text-sm',
          rating >= 4 ? 'text-green-600' : rating >= 3 ? 'text-amber-600' : 'text-red-600'
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
