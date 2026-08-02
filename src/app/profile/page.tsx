'use client';

import { ProfilePanel } from '@/components/profile/ProfilePanel';

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">个人中心</h1>
      <ProfilePanel />
    </div>
  );
}
