"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Modal from "../../../components/Modals/Modal";
import { RiAccountPinCircleLine, RiAddLine, RiPriceTag3Line } from 'react-icons/ri';

interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags: string[];
}

export default function AccountsPage() {
  const { bankId } = useParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    tags: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/account?bankId=${bankId}`);
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();
        setAccounts(data);
      } catch {
        setError("Failed to fetch accounts");
      }
    };
    if (bankId) fetchAccounts();
  }, [bankId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          accountHolderName: form.accountHolderName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
        })
      });
      if (!res.ok) throw new Error("Failed to create account");
      const newAccount = await res.json();
      setAccounts(prev => [...prev, newAccount]);
      setIsModalOpen(false);
      setForm({ accountHolderName: "", accountNumber: "", ifscCode: "", tags: "" });
    } catch {
      setError("Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-2 space-y-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-2xl shadow">
              <RiAccountPinCircleLine />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Accounts</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-5 py-2 rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold"
          >
            <RiAddLine className="text-xl" /> Add Account
          </button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Account">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
              <input
                type="text"
                value={form.accountHolderName}
                onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
              <input
                type="text"
                value={form.ifscCode}
                onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                placeholder="e.g. salary, business"
                disabled={isLoading}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </Modal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No accounts added yet. Click &quot;Add Account&quot; to get started.
            </div>
          ) : (
            accounts.map(account => (
              <Link
                key={account.id}
                href={`/banks/${bankId}/accounts/${account.id}/statements`}
                className="relative bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-105 hover:shadow-2xl group overflow-hidden"
              >
                <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-5xl pointer-events-none select-none rotate-12">
                  <RiAccountPinCircleLine />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl shadow">
                    <RiAccountPinCircleLine />
                  </span>
                  {account.accountHolderName}
                </h3>
                <div className="text-gray-600 text-sm">{account.accountNumber} | {account.ifscCode}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {account.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium">
                      <RiPriceTag3Line className="text-blue-400" /> {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 