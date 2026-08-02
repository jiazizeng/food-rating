import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const { restaurant_id } = body;
  if (!restaurant_id) {
    return NextResponse.json({ error: '缺少餐厅ID' }, { status: 400 });
  }

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurant_id)
    .single();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    return NextResponse.json({ favorited: false });
  }

  await supabase.from('favorites').insert({
    user_id: user.id,
    restaurant_id,
  });
  return NextResponse.json({ favorited: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data } = await supabase
    .from('favorites')
    .select('*, restaurant:restaurants(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}
