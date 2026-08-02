import { LoginForm } from '@/components/auth/AuthForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '登录' };

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <span className="text-5xl">🍜</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">欢迎回来</h1>
          <p className="mt-1 text-sm text-gray-500">登录美食红黑榜，分享你的美食体验</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
