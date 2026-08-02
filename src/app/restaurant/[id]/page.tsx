'use client';

import { useState, useEffect } from 'react';
import { PageLoading } from '@/components/shared/Loading';
import ClientDetail from './ClientDetail';

export default function RestaurantPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageLoading />;
  }

  return <ClientDetail />;
}
