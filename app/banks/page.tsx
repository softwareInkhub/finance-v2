'use client';
import { Suspense } from 'react';
import BanksTabsClient from './BanksTabsClient';
import { useSearchParams } from 'next/navigation';
import StatementsPage from '../sub-pages/statements/page';
import React from 'react';

function BanksPageInner() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bankId');
  const accountId = searchParams.get('accountId');
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile && bankId && accountId) {
    return <StatementsPage />;
  }

  return <BanksTabsClient />;
}

export default function BanksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BanksPageInner />
    </Suspense>
  );
} 