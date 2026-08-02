'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { useState, useEffect, useCallback } from 'react';
import type { Favorite } from '@/types';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites([]); setFavIds(new Set()); return; }
    setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('*, restaurant:restaurants(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setFavorites(data as Favorite[]);
      setFavIds(new Set(data.map((f: Favorite) => f.restaurant_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = async (restaurantId: string): Promise<boolean> => {
    if (!user) return false;
    if (favIds.has(restaurantId)) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);
      setFavIds(prev => { const n = new Set(prev); n.delete(restaurantId); return n; });
      setFavorites(prev => prev.filter(f => f.restaurant_id !== restaurantId));
      return false;
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, restaurant_id: restaurantId });
      setFavIds(prev => new Set(prev).add(restaurantId));
      await fetchFavorites();
      return true;
    }
  };

  const isFavorited = (restaurantId: string) => favIds.has(restaurantId);

  return { favorites, favIds, loading, toggleFavorite, isFavorited, refetch: fetchFavorites };
}
