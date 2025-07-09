'use client';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { usePathname, useRouter } from 'next/navigation';
import BanksSidebar from './BanksSidebar';
import { useState, useEffect } from 'react';
import { TabBarProvider } from './TabBarContext';
import TabBar from './TabBar';

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith('/login-signup');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bankSidebarOpen, setBankSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoginPage) {
      const isLoggedIn = typeof window !== 'undefined' ? localStorage.getItem('isLoggedIn') : null;
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      if (!isLoggedIn || !userId) {
        if (typeof window !== 'undefined') localStorage.setItem('isLoggedIn', 'false');
        router.push('/login-signup');
      }
    }
  }, [isLoginPage, router]);

  return (
    <TabBarProvider>
      {isLoginPage ? children : (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 p-2 sm:p-6 overflow-x-hidden">
          <div className="flex h-screen w-full overflow-x-hidden">
            {/* Main Sidebar: always visible on desktop, drawer on mobile/tablet */}
            <div className="hidden md:block">
          <Sidebar />
            </div>
            {sidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
                <div className="absolute left-0 top-0 w-64 h-full bg-white shadow-lg">
                  <Sidebar onItemClick={() => setSidebarOpen(false)} onBanksClick={() => { setSidebarOpen(false); setBankSidebarOpen(true); }} />
                </div>
              </div>
            )}
            {/* Banks Sidebar: always visible on desktop, drawer on mobile/tablet */}
            <div className="hidden md:block w-64 border-r">
              <BanksSidebar />
            </div>
            {bankSidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div className="absolute inset-0 bg-black/30" onClick={() => setBankSidebarOpen(false)} />
                <div className="absolute left-0 top-0 w-64 h-full bg-white shadow-lg">
                  <BanksSidebar onClose={() => setBankSidebarOpen(false)} />
                </div>
              </div>
            )}
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
              <Navbar onSidebarMenuClick={() => setSidebarOpen(true)} />
              <TabBar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </div>
        </div>
      )}
    </TabBarProvider>
  );
} 