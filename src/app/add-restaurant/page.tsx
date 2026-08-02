'use client';

import { RestaurantForm } from '@/components/restaurant/RestaurantForm';
import { PlusCircle } from 'lucide-react';

export default function AddRestaurantPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <PlusCircle className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">添加餐厅</h1>
        </div>
        <p className="text-sm text-gray-500">贡献你知道的餐厅，帮助更多人发现好味道</p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
        <RestaurantForm />
      </div>
    </div>
  );
}
