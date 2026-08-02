'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '@/components/shared/Loading';

const ClientDetail = dynamic(() => import('./ClientDetail'), {
  ssr: false,
  loading: () => <PageLoading />,
});

export default function RestaurantPage() {
  return <ClientDetail />;
}
