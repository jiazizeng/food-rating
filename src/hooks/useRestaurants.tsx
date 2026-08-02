'use client';

import { createClient } from '@/lib/supabase/client';
import type { Restaurant } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { ITEMS_PER_PAGE } from '@/lib/constants';

interface UseRestaurantsOptions {
  listType?: 'red' | 'black';
  cuisine?: string;
  city?: string;
  search?: string;
  sort?: 'rating' | 'newest' | 'reviews';
  page?: number;
  limit?: number;
}

export function useRestaurants(options: UseRestaurantsOptions = {}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  const {
    listType, cuisine, city, search, sort = 'rating',
    page = 1, limit = ITEMS_PER_PAGE,
  } = options;

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('restaurants')
      .select('*, profiles:created_by(*)', { count: 'exact' })
      .eq('status', 'approved');

    if (listType === 'red') {
      query = query.gt('avg_rating', 3.5).order('avg_rating', { ascending: false });
    } else if (listType === 'black') {
      query = query.lt('avg_rating', 2.5).order('avg_rating', { ascending: true });
    }

    if (cuisine) query = query.eq('cuisine', cuisine);
    if (city) query = query.ilike('city', `%${city}%`);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (sort === 'reviews') query = query.order('review_count', { ascending: false });
    else query = query.order('avg_rating', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count } = await query.range(from, to);

    if (data) {
      const mapped = data.map((r: Record<string, unknown>) => ({
        ...r,
        created_by_profile: r.profiles,
      })) as unknown as Restaurant[];
      setRestaurants(mapped);
    }
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [listType, cuisine, city, search, sort, page, limit]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return { restaurants, loading, total, refetch: fetchRestaurants };
}

export function useRestaurant(id: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!id) return;
    const fetchRestaurant = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('restaurants')
        .select('*, profiles:created_by(*), tags:restaurant_tags(tag:tags(*))')
        .eq('id', id)
        .single();
      if (data) {
        const mapped = {
          ...data,
          created_by_profile: data.profiles,
          tags: data.tags?.map((t: { tag: unknown }) => t.tag) || [],
        } as unknown as Restaurant;
        setRestaurant(mapped);
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [id]);

  return { restaurant, loading };
}
