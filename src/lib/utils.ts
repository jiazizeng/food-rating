import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return formatDate(dateStr);
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '暂无';
  return `¥${price.toFixed(0)}`;
}

export function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function getRatingColor(rating: number): string {
  if (rating >= 4) return 'text-green-500';
  if (rating >= 3) return 'text-yellow-500';
  return 'text-red-500';
}

export function getRatingBgColor(rating: number): string {
  if (rating >= 4) return 'bg-green-500';
  if (rating >= 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}

export function getAvatarUrl(url: string | null | undefined): string {
  if (url) return url;
  return `https://ui-avatars.com/api/?name=User&background=6366f1&color=fff`;
}

export function getMapUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

export interface MapAppOption {
  name: string;
  label: string;
  icon: string;
  url: string;
}

export function getNavigationUrls(
  lat: number | null | undefined,
  lng: number | null | undefined,
  name?: string,
  address?: string
): MapAppOption[] {
  const searchText = name || address || '目的地';
  const encodedName = encodeURIComponent(searchText);

  // If we have coordinates, use precise navigation
  if (lat != null && lng != null) {
    return [
      {
        name: 'gaode',
        label: '高德地图',
        icon: '🗺️',
        url: `https://uri.amap.com/navigation?to=${lng},${lat},${encodedName}&mode=car&callnative=1`,
      },
      {
        name: 'baidu',
        label: '百度地图',
        icon: '📍',
        url: `https://api.map.baidu.com/direction?destination=latlng:${lat},${lng}|name:${encodedName}&mode=driving&output=html&src=food-rating`,
      },
      {
        name: 'apple',
        label: 'Apple 地图',
        icon: '🧭',
        url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      },
      {
        name: 'google',
        label: 'Google 地图',
        icon: '🌐',
        url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      },
    ];
  }

  // Fallback: use address/keyword search
  const fullAddress = [name, address].filter(Boolean).join(' ');
  const encodedAddr = encodeURIComponent(fullAddress || searchText);
  return [
    {
      name: 'gaode',
      label: '高德地图搜索',
      icon: '🗺️',
      url: `https://uri.amap.com/search?keyword=${encodedAddr}&callnative=1`,
    },
    {
      name: 'baidu',
      label: '百度地图搜索',
      icon: '📍',
      url: `https://map.baidu.com/search/${encodedAddr}`,
    },
    {
      name: 'apple',
      label: 'Apple 地图',
      icon: '🧭',
      url: `https://maps.apple.com/?q=${encodedAddr}`,
    },
    {
      name: 'google',
      label: 'Google 地图',
      icon: '🌐',
      url: `https://www.google.com/maps/search/${encodedAddr}`,
    },
  ];
}
