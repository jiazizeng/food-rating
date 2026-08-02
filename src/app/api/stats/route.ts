import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabase();

  const [
    { data: topRed }, { data: topBlack }, { data: cities },
    { count: totalR }, { count: totalRev }, { count: totalU },
  ] = await Promise.all([
    supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: false }).limit(10),
    supabase.from('restaurants').select('*').eq('status', 'approved').order('avg_rating', { ascending: true }).limit(10),
    supabase.from('restaurants').select('city, avg_rating').eq('status', 'approved'),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const cityMap: Record<string, { count: number; totalRating: number }> = {};
  (cities || []).forEach((r: { city: string | null; avg_rating: number }) => {
    const city = r.city || '未知';
    if (!cityMap[city]) cityMap[city] = { count: 0, totalRating: 0 };
    cityMap[city].count++;
    cityMap[city].totalRating += r.avg_rating;
  });
  const cityRankings = Object.entries(cityMap)
    .map(([city, data]) => ({ city, count: data.count, avg_rating: Number((data.totalRating / data.count).toFixed(1)) }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    topRedRestaurants: topRed || [],
    topBlackRestaurants: topBlack || [],
    cityRankings,
    totalRestaurants: totalR || 0,
    totalReviews: totalRev || 0,
    totalUsers: totalU || 0,
  });
}
