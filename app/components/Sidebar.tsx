'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiDashboardLine, 
  RiBankLine, 
  RiPriceTag3Line,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiArrowRightSLine
} from 'react-icons/ri';
import { useTabBar } from './TabBarContext';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  onItemClick?: () => void;
  onBanksClick?: () => void;
}

interface Bank {
  id: string;
  bankName: string;
}

export default function Sidebar({ onItemClick, onBanksClick }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [banksDropdownOpen, setBanksDropdownOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const pathname = usePathname();
  const { addTab } = useTabBar();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => setBanks(Array.isArray(data) ? data : []))
      .catch(() => setBanks([]));
  }, []);

  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick();
    }
  };

  const toggleBanksDropdown = () => {
    setBanksDropdownOpen(!banksDropdownOpen);
  };

  const isBanksActive = pathname.startsWith('/banks') || pathname.startsWith('/super-bank');

  // Updated helper to close dropdown/sidebar immediately after navigation is triggered
  // const handleDropdownLinkClick = () => {
  //   if (onItemClick) onItemClick(); // Always close sidebar immediately
  // };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden md:block bg-white/60 backdrop-blur-2xl border-r border-blue-100 text-gray-900 h-screen transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="p-3 flex justify-between items-center border-b border-blue-100">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-all duration-200 border border-transparent focus:border-blue-400 shadow-md animate-pulse hover:shadow-blue-200"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <RiMenuUnfoldLine size={24} /> : <RiMenuFoldLine size={24} />}
          </button>
        </div>
        <nav className={`mt-8 flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}> 
          {/* Dashboard */}
          <Link
            href="/"
            onClick={handleItemClick}
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiDashboardLine className={`transition-colors duration-200 ${isCollapsed ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
            {!isCollapsed && (
              <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                Dashboard
              </span>
            )}
          </Link>
          {/* Banks */}
          <Link
            href="/banks"
            onClick={handleItemClick}
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${isBanksActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: isBanksActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiBankLine className={`transition-colors duration-200 ${isCollapsed ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
            {!isCollapsed && (
              <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium truncate">
                Banks
              </span>
            )}
          </Link>
          {/* Tags */}
          <Link
            href="/tags"
            onClick={handleItemClick}
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/tags' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/tags' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiPriceTag3Line className={`transition-colors duration-200 ${isCollapsed ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
            {!isCollapsed && (
              <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                Tags
              </span>
            )}
          </Link>
          {/* File Converter */}
          <Link
            href="/convert-file"
            onClick={handleItemClick}
            className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/convert-file' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/convert-file' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiPriceTag3Line className={`transition-colors duration-200 ${isCollapsed ? 'text-2xl' : 'text-xl'} group-hover:text-blue-500`} />
            {!isCollapsed && (
              <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
                File Converter
              </span>
            )}
          </Link>
        </nav>
      </div>
      {/* Mobile Sidebar */}
      <div className="block md:hidden bg-white/60 backdrop-blur-2xl border-r border-blue-100 text-gray-900 h-screen w-64 transition-all duration-300">
        <div className="p-3 flex justify-between items-center border-b border-blue-100">
          <button
            onClick={onItemClick}
            className="p-2 rounded-lg hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-all duration-200 border border-transparent focus:border-blue-400 shadow-md"
            aria-label="Close sidebar"
          >
            <RiArrowLeftLine size={24} />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-2">
          {/* Dashboard */}
          <Link
            href="/"
            onClick={handleItemClick}
            className={`flex items-center p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiDashboardLine className="transition-colors duration-200 text-xl group-hover:text-blue-500" />
            <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
              Dashboard
            </span>
          </Link>
          {/* Banks Dropdown */}
          <div className="mx-2">
            <div
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${isBanksActive ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
              style={{ boxShadow: isBanksActive ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
            >
              <Link href="/banks" onClick={onBanksClick} className="flex items-center flex-1 min-w-0">
                <RiBankLine className="transition-colors duration-200 text-xl group-hover:text-blue-500" />
                <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium truncate">
                  Banks
                </span>
              </Link>
              <button
                onClick={toggleBanksDropdown}
                className="ml-2 p-1 rounded hover:bg-blue-100 transition-colors"
                aria-label={banksDropdownOpen ? 'Collapse banks submenu' : 'Expand banks submenu'}
                tabIndex={0}
                type="button"
              >
                {banksDropdownOpen ? <RiArrowDownSLine size={20} /> : <RiArrowRightSLine size={20} />}
              </button>
            </div>
            {banksDropdownOpen && (
              <div className="mt-2 ml-4 space-y-1 overflow-hidden transition-all duration-300">
                {/* Super Bank */}
                <Link
                  href="/super-bank"
                  onClick={e => {
                    e.preventDefault();
                    addTab({
                      key: 'super-bank',
                      label: 'Super Bank',
                      type: 'super-bank',
                      href: '/super-bank',
                    });
                    router.push('/super-bank');
                    if (onItemClick) onItemClick();
                  }}
                  className={`flex items-center p-3 rounded-lg transition-all duration-200 text-sm ${pathname === '/super-bank' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'} group hover:scale-[1.02]`}
                >
                  <RiBankLine className="text-lg group-hover:text-blue-500 transition-colors duration-200" />
                  <span className="ml-3 group-hover:text-blue-500 transition-colors duration-200">
                    Super Bank
                  </span>
                </Link>
                {/* Individual Banks */}
                {banks.map((bank) => (
                  <a
                    key={bank.id}
                    href={`/banks/accounts?type=accounts&bankId=${bank.id}`}
                    onClick={e => {
                      e.preventDefault();
                      addTab({
                        key: `accounts-${bank.id}`,
                        label: bank.bankName,
                        type: 'accounts',
                        bankId: bank.id,
                        href: `/banks/accounts?type=accounts&bankId=${bank.id}`,
                      });
                      router.push(`/banks/accounts?type=accounts&bankId=${bank.id}`);
                      if (onItemClick) onItemClick();
                    }}
                    className={`flex items-center p-3 rounded-lg transition-all duration-200 text-sm ${pathname.includes(bank.id) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'} group hover:scale-[1.02]`}
                  >
                    <RiBankLine className="text-lg group-hover:text-blue-500 transition-colors duration-200" />
                    <span className="ml-3 group-hover:text-blue-500 transition-colors duration-200 truncate">
                      {bank.bankName}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
          {/* Tags */}
          <Link
            href="/tags"
            onClick={handleItemClick}
            className={`flex items-center p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/tags' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/tags' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiPriceTag3Line className="transition-colors duration-200 text-xl group-hover:text-blue-500" />
            <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
              Tags
            </span>
          </Link>
          {/* File Converter */}
          <Link
            href="/convert-file"
            onClick={handleItemClick}
            className={`flex items-center p-4 my-2 mx-2 rounded-xl transition-all duration-200 ${pathname === '/convert-file' ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-l-4 border-blue-500 shadow-lg ring-2 ring-blue-200' : 'border-l-4 border-transparent'} group hover:scale-[1.04] hover:bg-blue-50/60 hover:shadow-md`}
            style={{ boxShadow: pathname === '/convert-file' ? '0 4px 24px 0 rgba(59,130,246,0.10)' : undefined }}
          >
            <RiPriceTag3Line className="transition-colors duration-200 text-xl group-hover:text-blue-500" />
            <span className="ml-4 group-hover:text-blue-500 transition-colors duration-200 font-medium">
              File Converter
            </span>
          </Link>
        </nav>
      </div>
    </>
  );
} 