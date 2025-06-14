'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiPriceTag3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiArrowDownSLine,
  RiArrowRightSLine
} from 'react-icons/ri';
import BanksSidebar from './BanksSidebar';

interface SidebarProps {
  onItemClick?: () => void;
  onSuperBankClick?: () => void;
  onBankClick?: (bank: any) => void;
  onAccountClick?: (account: any, bankId: string) => void;
}

export default function Sidebar({ onItemClick, onSuperBankClick, onBankClick, onAccountClick }: SidebarProps) {
  console.log('Sidebar: onSuperBankClick prop is', onSuperBankClick);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [showBanksSubmenu, setShowBanksSubmenu] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: RiDashboardLine },
    { name: 'Banks', path: '/banks', icon: RiBankLine },
    { name: 'Tags', path: '/tags', icon: RiPriceTag3Line },
    { name: 'File Converter', path: '/convert-file', icon: RiPriceTag3Line },
  ];

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  // Custom handler for Account click in mobile
  const handleAccountClickMobile = (
    account: { id: string; accountHolderName: string },
    bankId: string
  ) => {
    window.location.href = `http://localhost:3000/banks?bankId=${bankId}&accountId=${account.id}`;
    setShowMobileSidebar(false);
  };

  // Hamburger button for mobile
  if (isMobile && !showMobileSidebar) {
    return (
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md border border-blue-100 md:hidden"
        style={{ position: 'fixed', top: '16px', left: '16px' }}
        onClick={() => setShowMobileSidebar(true)}
        aria-label="Open sidebar"
      >
        <RiMenuUnfoldLine size={28} />
      </button>
    );
  }

  // Sidebar overlay for mobile
  if (isMobile && showMobileSidebar) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/30" onClick={() => setShowMobileSidebar(false)} />
        <div className="relative z-50 w-64 max-w-[80vw] h-full bg-white/60 backdrop-blur-2xl border-r border-blue-100 text-gray-900 shadow-xl flex flex-col">
          <button
            className="absolute top-3 right-3 p-2 rounded-md bg-white shadow border border-blue-100"
            onClick={() => setShowMobileSidebar(false)}
            aria-label="Close sidebar"
          >
            <RiMenuFoldLine size={24} />
          </button>
          <div className="p-3 flex justify-between items-center border-b border-blue-100">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent select-none">
              Brmh Fintech
            </h1>
          </div>
          <nav className="flex-1 overflow-y-auto">
            <div className="mt-8 flex flex-col gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                if (item.name === 'Banks' && isMobile) {
                  return (
                    <div key={item.path} className="w-full">
                      <button
                        onClick={e => {
                          e.preventDefault();
                          router.push('/banks');
                          setShowBanksSubmenu(v => !v);
                        }}
                        className={
                          `flex items-center w-full p-4 my-2 mx-2 rounded-xl transition-all duration-200
                          ${isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'}
                          group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`
                        }
                        style={{ boxShadow: isActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
                      >
                        <Icon className={`transition-colors duration-200 text-xl group-hover:text-blue-500`} />
                        <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium flex-1 text-left">
                          {item.name}
                        </span>
                        <span className="ml-2">
                          {showBanksSubmenu ? <RiArrowDownSLine size={20} /> : <RiArrowRightSLine size={20} />}
                        </span>
                      </button>
                      {showBanksSubmenu && isMobile && (
                        <div className="overflow-y-auto">
                          <BanksSidebar 
                            onSuperBankClick={() => {
                              console.log('Sidebar: onSuperBankClick called');
                              if (onSuperBankClick) onSuperBankClick();
                              setShowMobileSidebar(false);
                            }}
                            onBankClick={onBankClick}
                            onAccountClick={handleAccountClickMobile}
                            hideSearch 
                            showOnlyMenu 
                          />
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => { handleItemClick(); setShowMobileSidebar(false); }}
                    className={`flex items-center p-4 my-2 mx-2 rounded-xl transition-all duration-200
                      ${isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'}
                      group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
                    style={{ boxShadow: isActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
                  >
                    <Icon className="transition-colors duration-200 text-xl group-hover:text-blue-500" />
                    <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    );
  }

  // Full sidebar for desktop, tablet, or mobile (if not hidden)
  return (
    <div 
      className={`
        bg-white/60 backdrop-blur-2xl border-r border-blue-100 text-gray-900 h-screen transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${isMobile ? 'w-64' : ''}
      `}
    >
      <div className="p-3 flex justify-between items-center border-b border-blue-100">
        {(!isCollapsed || isMobile) && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent select-none">
            Brmh Fintech
          </h1>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-all duration-200 border border-transparent focus:border-blue-400 shadow-md animate-pulse hover:shadow-blue-200"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <RiMenuUnfoldLine size={24} /> : <RiMenuFoldLine size={24} />}
          </button>
        )}
      </div>
      <nav className={`mt-8 flex flex-col gap-2 ${isCollapsed && !isMobile ? 'items-center' : ''}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          if (item.name === 'Banks' && isMobile) {
            return (
              <div key={item.path} className="w-full">
                <button
                  onClick={e => {
                    e.preventDefault();
                    router.push('/banks');
                    setShowBanksSubmenu(v => !v);
                  }}
                  className={
                    `flex items-center w-full p-4 my-2 mx-2 rounded-xl transition-all duration-200
                    ${isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'}
                    group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`
                  }
                  style={{ boxShadow: isActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
                >
                  <Icon className={`transition-colors duration-200 text-xl group-hover:text-blue-500`} />
                  <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium flex-1 text-left">
                    {item.name}
                  </span>
                  <span className="ml-2">
                    {showBanksSubmenu ? <RiArrowDownSLine size={20} /> : <RiArrowRightSLine size={20} />}
                  </span>
                </button>
                {showBanksSubmenu && isMobile && (
                  <div className="w-full max-h-[60vh] overflow-y-auto">
                    <BanksSidebar 
                      onSuperBankClick={() => {
                        console.log('Sidebar: onSuperBankClick called');
                        if (onSuperBankClick) onSuperBankClick();
                        setShowMobileSidebar(false);
                      }}
                      onBankClick={onBankClick}
                      onAccountClick={handleAccountClickMobile}
                      hideSearch 
                      showOnlyMenu 
                    />
                  </div>
                )}
              </div>
            );
          }
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={handleItemClick}
              className={
                `flex items-center ${isCollapsed && !isMobile ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200
                ${isActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'}
                ${isMobile ? 'justify-start' : ''}
                group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`
              }
              style={{ boxShadow: isActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
            >
              <Icon className={`transition-colors duration-200 ${isCollapsed && !isMobile ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
              {(!isCollapsed || isMobile) && (
                <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 