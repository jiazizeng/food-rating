'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { cn, getInitials } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Menu, X, Search, User, LogOut, PlusCircle, Heart, MinusCircle,
  BarChart3, MapPin, ThumbsUp, ThumbsDown, ChevronDown, Bike,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: '红榜', href: '/red-list', icon: ThumbsUp, color: 'text-green-600' },
  { label: '灰榜', href: '/gray-list', icon: MinusCircle, color: 'text-gray-600' },
  { label: '黑榜', href: '/black-list', icon: ThumbsDown, color: 'text-red-600' },
  { label: '外卖', href: '/takeout', icon: Bike, color: 'text-yellow-600' },
  { label: '地图', href: '/map', icon: MapPin, color: 'text-blue-600' },
  { label: '统计', href: '/stats', icon: BarChart3, color: 'text-purple-600' },
];

export function Header() {
  const { user, profile, isAdmin, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (count !== null) setPendingCount(count);
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900 shrink-0">
          <span className="text-2xl">🍜</span>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/add-restaurant"
              className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors ml-2"
            >
              <PlusCircle className="h-4 w-4" />
              添加餐厅
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/search" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Search className="h-5 w-5" />
          </Link>

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : user && profile ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white">
                  {getInitials(profile.display_name || profile.username || 'U')}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {profile.display_name || profile.username}
                </span>
                <ChevronDown className="hidden sm:block h-3 w-3 text-gray-400" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white shadow-lg py-1 z-20">
                    <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}><User className="h-4 w-4" /> 个人中心</Link>
                    <Link href="/profile?tab=favorites" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}><Heart className="h-4 w-4" /> 我的收藏</Link>
                    {isAdmin && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <BarChart3 className="h-4 w-4" /> 管理面板
                        {pendingCount > 0 && (
                          <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingCount}</span>
                        )}
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button onClick={() => { setProfileOpen(false); signOut(); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="h-4 w-4" /> 退出登录
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors">登录</Link>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <nav className="flex flex-col p-3 gap-1">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  pathname === item.href ? 'bg-gray-100 text-gray-900' : 'text-gray-600')}>
                <item.icon className={cn('h-4 w-4', item.color)} />{item.label}
              </Link>
            ))}
            {user && (
              <Link href="/add-restaurant" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2.5 text-sm font-medium text-white mt-1">
                <PlusCircle className="h-4 w-4" /> 添加餐厅
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
