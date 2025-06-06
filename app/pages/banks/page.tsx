'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bank } from '../../types/aws';
import CreateBankModal from '../../components/Modals/CreateBankModal';
import { RiBankLine, RiAddLine, RiPriceTag3Line } from 'react-icons/ri';

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading banks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="flex-1 py-6 sm:py-10 px-6 space-y-6 sm:space-y-8">
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
                <RiBankLine />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Banks</h1>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
            >
              <RiAddLine className="text-lg sm:text-xl" />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {banks.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                No banks added yet. Click &quot;Add Bank&quot; to get started.
              </div>
            ) : (
              banks.map((bank) => (
                <Link
                  key={bank.id}
                  href={`/pages/accounts?bankId=${bank.id}`}
                  className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
                >
                  <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-4xl sm:text-5xl pointer-events-none select-none rotate-12">
                    <RiBankLine />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-lg sm:text-xl shadow">
                      <RiBankLine />
                    </span>
                    {bank.bankName}
                  </h3>
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {bank.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium"
                      >
                        <RiPriceTag3Line className="text-blue-400" /> {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 