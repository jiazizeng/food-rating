'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('id').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (!data) {
              supabase.from('profiles').insert({
                id: session.user.id,
                username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'user',
                display_name: session.user.user_metadata?.full_name || session.user.email,
                role: 'user',
              }).then(() => router.push('/'));
            } else {
              router.push('/');
            }
          });
      } else {
        router.push('/login');
      }
    });
  }, []);

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="text-center">
        <div className="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-gray-200 border-t-orange-600" />
        <p className="mt-4 text-sm text-gray-500">正在登录...</p>
      </div>
    </div>
  );
}
