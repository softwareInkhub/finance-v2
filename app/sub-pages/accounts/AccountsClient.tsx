'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '../../components/Modals/Modal';
import { RiAccountPinCircleLine, RiAddLine, RiPriceTag3Line, RiEdit2Line, RiCloseLine } from 'react-icons/ri';

interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags: string[];
}

interface AccountsClientProps {
  bankId: string | null;
  onAccountClick?: (account: Account) => void;
}

export default function AccountsClient({ bankId, onAccountClick }: AccountsClientProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (!bankId) {
      setError('Bank ID is required');
      setIsLoading(false);
      return;
    }
    const fetchAccounts = async () => {
      try {
        const response = await fetch(`/api/account?bankId=${bankId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch accounts');
        }
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, [bankId]);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsEditing(false);
    setFormData({
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      tags: [],
    });
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsEditing(true);
    setFormData({
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      tags: account.tags,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId) return;

    const accountData = {
      ...formData,
      bankId,
    };

    try {
      const url = selectedAccount
        ? `/api/account/${selectedAccount.id}`
        : '/api/account';
      const method = selectedAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        throw new Error('Failed to save account');
      }

      const updatedAccount = await response.json();
      if (selectedAccount) {
        setAccounts(accounts.map(acc =>
          acc.id === selectedAccount.id ? updatedAccount : acc
        ));
      } else {
        setAccounts([...accounts, updatedAccount]);
      }

      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/account/${accountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      setAccounts(accounts.filter(acc => acc.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Accounts</h2>
        <button
          onClick={handleAddAccount}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RiAddLine className="text-lg" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
            No accounts added yet. Click &quot;Add Account&quot; to get started.
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => {
                if (onAccountClick) {
                  onAccountClick(account);
                } else {
                  router.push(
                    `/banks/statements?type=statements&bankId=${account.bankId}&accountId=${account.id}&accountName=${encodeURIComponent(account.accountHolderName)}`
                  );
                }
              }}
              className="cursor-pointer relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <RiAccountPinCircleLine className="text-blue-500 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{account.accountHolderName}</h3>
                    <p className="text-sm text-gray-500">Account Number: {account.accountNumber}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAccount(account);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RiEdit2Line className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {account.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                  >
                    <RiPriceTag3Line className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">IFSC: {account.ifscCode}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAccount(account.id);
                }}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <RiCloseLine className="text-lg" />
              </button>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Account' : 'Add New Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700">
              Account Holder Name
            </label>
            <input
              type="text"
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
              Account Number
            </label>
            <input
              type="text"
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700">
              IFSC Code
            </label>
            <input
              type="text"
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags.join(', ')}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(tag => tag.trim()) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
            >
              {isEditing ? 'Update' : 'Add'} Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 