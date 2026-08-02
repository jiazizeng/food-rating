'use client';

import { cn } from '@/lib/utils';
import { SearchX, Utensils, MessageSquare, Heart } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'search' | 'food' | 'review' | 'heart';
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

const icons = {
  search: SearchX,
  food: Utensils,
  review: MessageSquare,
  heart: Heart,
};

export function EmptyState({
  title = '暂无内容',
  description,
  icon = 'food',
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 mb-5">
        <Icon className="h-10 w-10 text-gray-300" />
      </div>
      <p className="text-lg font-medium text-gray-500">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-gray-400 max-w-xs">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
