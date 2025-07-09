"use client";
import { useTabBar } from './TabBarContext';
import { RiCloseLine, RiPushpin2Fill, RiPushpin2Line } from 'react-icons/ri';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabBar();
  const pathname = usePathname();
  const router = useRouter();
  const [pinned, setPinned] = useState<{ [key: string]: boolean }>({});
  if (pathname === '/' || pathname === '/tags' || pathname === '/convert-file') return null;

  // Separate pinned and unpinned tabs
  const pinnedTabs = tabs.filter(tab => pinned[tab.key]);
  const unpinnedTabs = tabs.filter(tab => !pinned[tab.key]);
  const allTabs = [...pinnedTabs, ...unpinnedTabs];

  const handlePin = (tabKey: string) => {
    setPinned(prev => ({ ...prev, [tabKey]: !prev[tabKey] }));
  };

  return (
    <div className="w-full min-w-0 border-b bg-white z-20 flex items-center">
      <button
        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
          activeTab === 'overview'
            ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
            : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
        }`}
        onClick={() => {
          setActiveTab('overview');
          router.push('/banks');
        }}
        style={{ flex: '0 0 auto' }}
      >
        Overview
      </button>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap w-full px-4 py-2 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
        {allTabs.filter(tab => tab.key !== 'overview').map(tab => (
          <div key={tab.key} className="flex items-center group">
            {tab.key === 'overview' ? (
              <button
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
                }`}
                onClick={() => {
                  setActiveTab(tab.key);
                  router.push('/banks');
                }}
              >
                {tab.label}
              </button>
            ) : (
              <Link
                href={tab.href || '#'}
                className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Link>
            )}
            {tab.key !== 'overview' && (
              <button
                className="ml-1 text-lg text-gray-400 hover:text-blue-500 focus:outline-none hidden md:inline-flex"
                title={pinned[tab.key] ? 'Unpin Tab' : 'Pin Tab'}
                onClick={() => handlePin(tab.key)}
              >
                {pinned[tab.key] ? <RiPushpin2Fill /> : <RiPushpin2Line />}
              </button>
            )}
            {tab.key !== 'overview' && !pinned[tab.key] && (
              <button
                className="ml-1 text-lg text-gray-400 hover:text-red-500 focus:outline-none"
                title="Close Tab"
                onClick={e => {
                  e.preventDefault();
                  closeTab(tab.key);
                }}
              >
                <RiCloseLine />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 