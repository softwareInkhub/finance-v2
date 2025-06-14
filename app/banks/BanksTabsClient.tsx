'use client';
import { useState, useEffect } from 'react';
import AccountsClient from '../sub-pages/accounts/AccountsClient';
import StatementsPage from '../sub-pages/statements/page';
import SuperBankPage from '../sub-pages/super-bank/page';
import CreateBankModal from '../components/Modals/CreateBankModal';
import { RiBankLine, RiAddLine, RiPriceTag3Line, RiCloseLine } from 'react-icons/ri';
import { Bank } from '../types/aws';
import { useRouter, usePathname } from 'next/navigation';
import BanksSidebar from '../components/BanksSidebar';
import Sidebar from '../components/Sidebar';

// Define a type for tabs
interface Tab {
  key: string;
  label: string;
  type: 'overview' | 'accounts' | 'statements' | 'super-bank';
  bankId?: string;
  accountId?: string;
  accountName?: string;
}

interface BanksTabsClientProps {
  showMobileSidebar?: boolean;
}

export default function BanksTabsClient({ showMobileSidebar }: BanksTabsClientProps) {
  const [tabs, setTabs] = useState<Tab[]>([{ key: 'overview', label: 'Overview', type: 'overview' }]);
  const [activeTab, setActiveTab] = useState('overview');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        setError(null);
        const response = await fetch('/api/bank');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch banks');
        }
        const data = await response.json();
        setBanks(data);
      } catch (error) {
        console.error('Error fetching banks:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch banks. Please check your AWS configuration.');
      } finally {
        setIsFetching(false);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCreateBank = async (bankName: string, tags: string[]) => {
    setError(null);
    try {
      const response = await fetch('/api/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bankName, tags }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bank');
      }
      const newBank = await response.json();
      setBanks((prev) => [...prev, newBank]);
    } catch (error) {
      console.error('Error creating bank:', error);
      setError(error instanceof Error ? error.message : 'Failed to create bank. Please try again.');
    }
  };

  const handleAddTab = () => {
    const newKey = `tab${tabs.length + 1}`;
    setTabs([...tabs, { key: newKey, label: `New Tab`, type: 'overview' }]);
    setActiveTab(newKey);
  };

  const handleBankCardClick = (bank: Bank) => {
    const tabKey = `accounts-${bank.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bank.id}`);
      return;
    }
    setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bank.id}`);
  };

  const handleAccountClick = (account: { id: string; accountHolderName: string }, bankId: string) => {
    const tabKey = `statements-${account.id}`;
    if (tabs.some(tab => tab.key === tabKey)) {
      setActiveTab(tabKey);
      router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
      return;
    }
    setTabs([
      ...tabs,
      {
        key: tabKey,
        label: account.accountHolderName,
        type: 'statements',
        bankId,
        accountId: account.id,
        accountName: account.accountHolderName,
      },
    ]);
    setActiveTab(tabKey);
    router.push(`${pathname}?bankId=${bankId}&accountId=${account.id}`);
  };

  // const handleSuperBankClick = () => {
  //   const tabKey = 'super-bank';
  //   if (tabs.some(tab => tab.key === tabKey)) {
  //     setActiveTab(tabKey);
  //     return;
  //   }
  //   setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
  //   setActiveTab(tabKey);
  // };

  const handleCloseTab = (tabKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabKey === 'overview') return;
    const newTabs = tabs.filter(tab => tab.key !== tabKey);
    setTabs(newTabs);
    if (activeTab === tabKey) setActiveTab('overview');
  };

  // Render tab bar and content
  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-x-hidden">
      {/* Mobile: show Sidebar with correct onSuperBankClick handler */}
      {isMobile && showMobileSidebar ? (
        <Sidebar
          onSuperBankClick={() => {
            const tabKey = 'super-bank';
            if (tabs.some(tab => tab.key === tabKey)) {
              setActiveTab(tabKey);
              return;
            }
            setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
            setActiveTab(tabKey);
          }}
          onBankClick={handleBankCardClick}
          onAccountClick={handleAccountClick}
        />
      ) : (
        <div className="hidden md:block min-w-[220px] max-w-xs">
          <BanksSidebar 
            onSuperBankClick={() => {
              const tabKey = 'super-bank';
              if (tabs.some(tab => tab.key === tabKey)) {
                setActiveTab(tabKey);
                return;
              }
              setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
              setActiveTab(tabKey);
            }}
            onBankClick={(bank) => {
              const tabKey = `accounts-${bank.id}`;
              if (tabs.some(tab => tab.key === tabKey)) {
                setActiveTab(tabKey);
                router.push(`${pathname}?bankId=${bank.id}`);
                return;
              }
              setTabs([...tabs, { key: tabKey, label: bank.bankName, type: 'accounts', bankId: bank.id }]);
              setActiveTab(tabKey);
              router.push(`${pathname}?bankId=${bank.id}`);
            }}
            onAccountClick={handleAccountClick}
          />
        </div>
      )}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap px-2 sm:px-5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`px-3 sm:px-5 py-2 rounded-t-lg text-xs sm:text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                  : 'border-transparent text-gray-500 bg-transparent hover:text-blue-600'
              }`}
              style={{
                marginBottom: activeTab === tab.key ? '-2px' : '0',
                boxShadow: activeTab === tab.key ? '0 2px 8px 0 rgba(0,0,0,0.03)' : undefined,
              }}
              onClick={() => setActiveTab(tab.key)}
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
            className="ml-2 px-2 sm:px-3 py-2 rounded-t-lg bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold shadow-sm hover:scale-105 transition text-xs sm:text-base"
            title="Add Tab"
          >
            +
          </button>
        </div>
        <div>
          {activeTab === 'overview' && (
            <div className="space-y-4 sm:space-y-6 px-2 sm:px-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
                    <RiBankLine />
                  </div>
                  <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Banks</h1>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto text-xs sm:text-base"
                >
                  <RiAddLine className="text-base sm:text-xl" />
                  <span className="block sm:hidden">Add</span>
                  <span className="hidden sm:block">Add Bank</span>
                </button>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-lg">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                  {error.includes('AWS configuration') && (
                    <p className="text-sm mt-2">
                      Please check your .env.local file and ensure AWS credentials are properly configured.
                    </p>
                  )}
                </div>
              )}
              <CreateBankModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateBank}
              />
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Super Bank Card - mobile only */}
                <div
                  key="super-bank"
                  onClick={() => {
                    const tabKey = 'super-bank';
                    if (tabs.some(tab => tab.key === tabKey)) {
                      setActiveTab(tabKey);
                      return;
                    }
                    setTabs([...tabs, { key: tabKey, label: 'Super Bank', type: 'super-bank' }]);
                    setActiveTab(tabKey);
                  }}
                  className="block md:hidden cursor-pointer relative bg-white/70 backdrop-blur-lg p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
                >
                  <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-3xl sm:text-5xl pointer-events-none select-none rotate-12">
                    <RiBankLine />
                  </div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-base sm:text-xl shadow">
                      <RiBankLine />
                    </span>
                    Super Bank
                  </h3>
                  <div className="mt-2 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    <span className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium">
                      <RiPriceTag3Line className="text-blue-400" /> All Transactions
                    </span>
                  </div>
                </div>
                {isFetching ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    Loading banks...
                  </div>
                ) : banks.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                    No banks added yet. Click &quot;Add Bank&quot; to get started.
                  </div>
                ) : (
                  banks.map((bank) => (
                    <div
                      key={bank.id}
                      onClick={() => handleBankCardClick(bank)}
                      className="cursor-pointer relative bg-white/70 backdrop-blur-lg p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
                    >
                      <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-3xl sm:text-5xl pointer-events-none select-none rotate-12">
                        <RiBankLine />
                      </div>
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-base sm:text-xl shadow">
                          <RiBankLine />
                        </span>
                        {bank.bankName}
                      </h3>
                      <div className="mt-2 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                        {bank.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium"
                          >
                            <RiPriceTag3Line className="text-blue-400" /> {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          {activeTab !== 'overview' && (() => {
            const tab = tabs.find(t => t.key === activeTab);
            if (tab?.type === 'accounts' && tab.bankId) {
              return <AccountsClient bankId={tab.bankId} onAccountClick={account => handleAccountClick(account, tab.bankId!)} />;
            }
            if (tab?.type === 'statements' && tab.bankId && tab.accountId) {
              return <StatementsPage />;
            }
            if (tab?.type === 'super-bank') {
              return <SuperBankPage />;
            }
            return <div>Custom Tab Content</div>;
          })()}
        </div>
      </div>
    </div>
  );
} 