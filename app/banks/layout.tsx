'use client';
import BanksSidebar from '../components/BanksSidebar';

export default function BanksLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <BanksSidebar />
      <main className="flex-1 py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
        {children}
      </main>
    </div>
  );
} 