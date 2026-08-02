import { createServerSupabase } from '@/lib/supabase/server';
import { validateRestaurant } from '@/lib/validators';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const body = await request.json();
  const validation = validateRestaurant(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 });
  }

  const { data, error } = await supabase.from('restaurants').insert({
    ...body,
    created_by: user.id,
    status: 'pending',
  }).select('id').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
