'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RiBankLine, RiAccountPinCircleLine, RiArrowDownSLine, RiArrowRightSLine, RiSearchLine, RiCloseLine } from 'react-icons/ri';
import Link from 'next/link';
import { useTabBar } from './TabBarContext';

interface Bank {
  id: string;
  bankName: string;
}

interface Account {
  id: string;
  accountHolderName: string;
}

export default function BanksSidebar({ onClose }: { onClose?: () => void }) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accounts, setAccounts] = useState<{ [bankId: string]: Account[] }>({});
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const { addTab } = useTabBar();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => setBanks(Array.isArray(data) ? data : []));
  }, []);

  // Filter banks by search
  const filteredBanks = banks.filter(bank => bank.bankName.toLowerCase().includes(search.toLowerCase()));

  // Fetch accounts for a bank when expanded
  const handleExpand = (bankId: string) => {
    setExpandedBank(expandedBank === bankId ? null : bankId);
    const userId = typeof window !== "undefined" ? localStorage.getItem('userId') : null;
    if (!accounts[bankId] && userId) {
      fetch(`/api/account?bankId=${bankId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => setAccounts(prev => ({ ...prev, [bankId]: Array.isArray(data) ? data : [] })));
    }
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-blue-100 flex flex-col py-4 px-3 shadow-xl rounded-r-2xl">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden absolute top-3 right-3 p-2 rounded-full hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 z-10"
          aria-label="Close bank sidebar"
        >
          <RiCloseLine size={22} />
        </button>
      )}
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-2 text-gray-700 text-sm">
          <li>
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
                if (onClose) onClose();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all font-semibold shadow-sm hover:bg-blue-50/80 hover:shadow-md ${pathname === '/super-bank' ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 ring-2 ring-blue-200' : ''}`}
            >
              <RiBankLine /> Super Bank
            </Link>
          </li>
          <li>
            <div className="px-3 py-2 text-xs text-blue-400 uppercase tracking-wider font-semibold">Banks</div>
            <ul className="space-y-1">
              {filteredBanks.map(bank => (
                <li key={bank.id}>
                  <div className={`flex items-center w-full gap-2 px-2 py-2 rounded-lg transition-all group ${pathname.includes(bank.id) ? 'bg-blue-50/80 ring-2 ring-blue-200' : 'hover:bg-blue-50/60 hover:shadow'}`}>
                  <button
                      onClick={() => handleExpand(bank.id)}
                      className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                      aria-label={expandedBank === bank.id ? 'Collapse accounts' : 'Expand accounts'}
                  >
                    {expandedBank === bank.id ? <RiArrowDownSLine /> : <RiArrowRightSLine />}
                    </button>
                    <a
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
                        if (onClose) onClose();
                      }}
                      className={`flex items-center flex-1 gap-2 font-medium ${pathname.includes(bank.id) ? 'text-blue-700 font-bold' : 'text-gray-700'} group-hover:text-blue-600 cursor-pointer`}
                    >
                    <RiBankLine />
                      <span className="text-left truncate">{bank.bankName}</span>
                    </a>
                  </div>
                  {/* Animate expand/collapse */}
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expandedBank === bank.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {expandedBank === bank.id && accounts[bank.id] && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {accounts[bank.id].length === 0 && (
                        <li className="text-xs text-gray-400 italic">No accounts</li>
                      )}
                      {accounts[bank.id].map(account => (
                        <li key={account.id}>
                            <a
                              href={`/banks/statements?type=statements&bankId=${bank.id}&accountId=${account.id}`}
                              onClick={e => {
                                e.preventDefault();
                                addTab({
                                  key: `statements-${account.id}`,
                                  label: account.accountHolderName,
                                  type: 'statements',
                                  bankId: bank.id,
                                  accountId: account.id,
                                  accountName: account.accountHolderName,
                                  href: `/banks/statements?type=statements&bankId=${bank.id}&accountId=${account.id}`,
                                });
                                router.push(`/banks/statements?type=statements&bankId=${bank.id}&accountId=${account.id}`);
                                if (onClose) onClose();
                              }}
                              className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-blue-100 text-xs w-full text-left transition-all ${pathname.includes(account.id) ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-600'} cursor-pointer`}
                            >
                              <RiAccountPinCircleLine /> {account.accountHolderName}
                            </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  </div>
                </li>
              ))}
              {filteredBanks.length === 0 && (
                <li className="text-xs text-gray-400 italic px-3 py-2">No banks found</li>
              )}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
} 