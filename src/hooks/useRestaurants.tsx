'use client';

import { createClient } from '@/lib/supabase/client';
import type { Restaurant } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { ITEMS_PER_PAGE } from '@/lib/constants';

interface UseRestaurantsOptions {
  listType?: 'red' | 'black' | 'gray';
  cuisine?: string;
  city?: string;
  search?: string;
  sort?: 'rating' | 'newest' | 'reviews';
  page?: number;
  limit?: number;
  priceRange?: string;
  minRating?: number;
}

export function useRestaurants(options: UseRestaurantsOptions = {}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const supabase = createClient();

  const {
    listType, cuisine, city, search, sort = 'rating',
    page = 1, limit = ITEMS_PER_PAGE, priceRange, minRating,
  } = options;

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('restaurants')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');

    if (listType === 'red') {
      query = query.eq('list_type', 'red').order('avg_rating', { ascending: false });
    } else if (listType === 'black') {
      query = query.eq('list_type', 'black').order('avg_rating', { ascending: true });
    } else if (listType === 'gray') {
      query = query.eq('list_type', 'gray').order('created_at', { ascending: false });
    }

    if (cuisine) query = query.eq('cuisine', cuisine);
    if (city) query = query.ilike('city', `%${city}%`);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,city.ilike.%${search}%`);

    // Price range filter
    if (priceRange === 'low') query = query.lt('avg_price', 50);
    else if (priceRange === 'medium') query = query.gte('avg_price', 50).lt('avg_price', 100);
    else if (priceRange === 'high') query = query.gte('avg_price', 100).lt('avg_price', 200);
    else if (priceRange === 'luxury') query = query.gte('avg_price', 200);

    // Rating filter
    if (minRating) query = query.gte('avg_rating', minRating);

    if (sort === 'newest') query = query.order('created_at', { ascending: false });
    else if (sort === 'reviews') query = query.order('review_count', { ascending: false });
    else query = query.order('avg_rating', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count } = await query.range(from, to);

    if (data) setRestaurants(data as Restaurant[]);
    if (count !== null) setTotal(count);
    setLoading(false);
  }, [listType, cuisine, city, search, sort, page, limit, priceRange, minRating]);

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
        .select('*, tags:restaurant_tags(tag:tags(*))')
        .eq('id', id)
        .single();
      if (data) {
        const mapped = {
          ...data,
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
