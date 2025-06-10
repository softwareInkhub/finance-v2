'use client';
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';
import { RiCloseLine } from 'react-icons/ri';

// Define a type for tabs
interface Tab {
  key: string;
  label: string;
  type: 'overview' | 'accounts' | 'custom' | 'statements' | 'super-bank';
  bankId?: string;
  accountId?: string;
}

export default function BanksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'overview', label: 'Overview', type: 'overview' }]);
  const [activeTab, setActiveTab] = useState('overview');

  // Update tabs when URL changes
  useEffect(() => {
    const type = searchParams.get('type');
    const bankId = searchParams.get('bankId');
    const accountId = searchParams.get('accountId');
    const bankName = searchParams.get('bankName');
    const accountName = searchParams.get('accountName');

    if (!type) return;

    let tabKey = '';
    let tabLabel = '';
    let tabType: Tab['type'] = 'overview';
    let newTab: Tab | null = null;

    if (type === 'accounts' && bankId && bankName) {
      tabKey = `accounts-${bankId}`;
      tabLabel = bankName;
      tabType = 'accounts';
      newTab = {
        key: tabKey,
        label: tabLabel,
        type: tabType,
        bankId: bankId
      };
    } else if (type === 'statements' && bankId && accountId && accountName) {
      tabKey = `statements-${accountId}`;
      tabLabel = accountName;
      tabType = 'statements';
      newTab = {
        key: tabKey,
        label: tabLabel,
        type: tabType,
        bankId: bankId,
        accountId: accountId
      };
    } else if (type === 'super-bank') {
      tabKey = 'super-bank';
      tabLabel = 'Super Bank';
      tabType = 'super-bank';
      newTab = {
        key: tabKey,
        label: tabLabel,
        type: tabType
      };
    }

    if (newTab && !tabs.some(tab => tab.key === newTab!.key)) {
      setTabs(prev => [...prev, newTab!]);
    }
    setActiveTab(tabKey || 'overview');
  }, [pathname, searchParams, tabs]);

  const handleAddTab = () => {
    const newKey = `tab${tabs.length + 1}`;
    setTabs([...tabs, { key: newKey, label: `New Tab`, type: 'custom' }]);
    setActiveTab(newKey);
  };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabKey === 'overview') return;
    
    const newTabs = tabs.filter(tab => tab.key !== tabKey);
    setTabs(newTabs);
    
    if (activeTab === tabKey) {
      setActiveTab('overview');
      router.push('/banks');
    }
  };

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.key);
    if (tab.type === 'overview') {
      router.push('/banks');
    } else if (tab.type === 'accounts' && tab.bankId) {
      router.push(`/banks/accounts?type=accounts&bankId=${tab.bankId}`);
    } else if (tab.type === 'statements' && tab.bankId && tab.accountId) {
      router.push(`/banks/statements?type=statements&bankId=${tab.bankId}&accountId=${tab.accountId}`);
    } else if (tab.type === 'super-bank') {
      router.push('/banks/super-bank?type=super-bank');
    }
  };

  const handleSuperBankClick = () => {
    router.push('/banks/super-bank?type=super-bank');
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <BanksSidebar onSuperBankClick={handleSuperBankClick} />
        <main className="flex-1 py-4 sm:py-6 px-4 space-y-4 sm:space-y-6">
          {/* Tab Bar */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
                }`}
                style={{
                  marginBottom: activeTab === tab.key ? '-2px' : '0',
                  boxShadow: activeTab === tab.key ? '0 2px 8px 0 rgba(0,0,0,0.03)' : undefined,
                }}
                onClick={() => handleTabClick(tab)}
              >
                {tab.label}
                {tab.key !== 'overview' && (
                  <RiCloseLine 
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={(e) => handleCloseTab(tab.key, e)}
                  />
                )}
              </button>
            ))}
            <button
              onClick={handleAddTab}
              className="ml-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold shadow-sm hover:scale-105 transition"
              title="Add Tab"
            >
              +
            </button>
          </div>
          {/* Tab Content */}
          {children}
        </main>
      </div>
    </Suspense>
  );
} 