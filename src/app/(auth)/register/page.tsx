import { RegisterForm } from '@/components/auth/AuthForm';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '注册' };

export default function RegisterPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <span className="text-5xl">🍜</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">创建账号</h1>
          <p className="mt-1 text-sm text-gray-500">加入美食红黑榜，成为美食评论家</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
