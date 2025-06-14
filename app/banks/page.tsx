'use client';
import { Suspense } from 'react';
import BanksTabsClient from './BanksTabsClient';
import { useSearchParams } from 'next/navigation';
import StatementsPage from '../sub-pages/statements/page';
import React from 'react';

export default function BanksPage() {
  const searchParams = useSearchParams();
  const showMobileSidebar = searchParams.get('showSidebar') === '1';
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

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BanksTabsClient showMobileSidebar={showMobileSidebar} />
    </Suspense>
  );
} 