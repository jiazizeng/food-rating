import { Suspense } from 'react';
import ClientDetail from './ClientDetail';
import { PageLoading } from '@/components/shared/Loading';

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading />}>
      <ClientDetail id={id} />
    </Suspense>
  );
}
