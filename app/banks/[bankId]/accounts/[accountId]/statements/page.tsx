"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Modal from "../../../../../components/Modals/Modal";
import StatementPreviewModal from '../../../../../components/Modals/StatementPreviewModal';
import TransactionPreviewModal from '../../../../../components/Modals/TransactionPreviewModal';
import { RiFileList3Line, RiUpload2Line, RiDeleteBin6Line, RiPriceTag3Line, RiExchangeDollarLine } from 'react-icons/ri';

interface Statement {
  id: string;
  bankId: string;
  accountId: string;
  s3FileUrl: string;
  transactionHeader: string[];
  tags: string[];
  fileName?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  statementId: string;
  fileName?: string;
  startRow?: number;
  endRow?: number;
  createdAt?: string;
  transactionData?: Record<string, string | Tag[] | undefined>[];
}

export default function StatementsPage() {
  const { bankId, accountId } = useParams();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [tab, setTab] = useState<'statements' | 'transactions'>('statements');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionPreviewOpen, setTransactionPreviewOpen] = useState(false);
  const [transactionPreviewUrl, setTransactionPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    const fetchStatements = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/statements?accountId=${accountId}`);
        if (!res.ok) throw new Error("Failed to fetch statements");
        const data = await res.json();
        setStatements(data);
      } catch {
        setError("Failed to fetch statements");
      }
    };
    if (accountId) fetchStatements();
  }, [accountId]);

  useEffect(() => {
    if (tab === 'transactions' && accountId) {
      setLoadingTransactions(true);
      setTransactionsError(null);
      fetch(`/api/transactions?accountId=${accountId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransactions(data);
          else setTransactionsError(data.error || 'Failed to fetch transactions');
        })
        .catch(() => setTransactionsError('Failed to fetch transactions'))
        .finally(() => setLoadingTransactions(false));
    }
  }, [tab, accountId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      setIsUploading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankId', String(bankId));
      formData.append('accountId', String(accountId));
      formData.append('fileName', fileName.trim() ? fileName.trim() : file.name);
      const res = await fetch('/api/statement/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload statement');
      }
      // Refresh statement list
      const newStatement = await res.json();
      setStatements(prev => [...prev, newStatement]);
      setIsModalOpen(false);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload statement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteStatement = async (statementId: string, s3FileUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this statement?')) return;
    const res = await fetch('/api/statement/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statementId, s3FileUrl }),
    });
    if (res.ok) {
      setStatements(prev => prev.filter(s => s.id !== statementId));
    } else {
      alert('Failed to delete statement');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 sm:py-10 px-3 sm:px-4 space-y-6 sm:space-y-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex gap-2 sm:gap-4 border-b mb-4 overflow-x-auto">
          <button
            className={`px-3 sm:px-4 py-2 font-semibold transition-all whitespace-nowrap ${tab === 'statements' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40 rounded-t' : 'text-gray-600 hover:bg-gray-100 rounded-t'}`}
            onClick={() => setTab('statements')}
          >
            <span className="inline-flex items-center gap-1"><RiFileList3Line /> Statements</span>
          </button>
          <button
            className={`px-3 sm:px-4 py-2 font-semibold transition-all whitespace-nowrap ${tab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40 rounded-t' : 'text-gray-600 hover:bg-gray-100 rounded-t'}`}
            onClick={() => setTab('transactions')}
          >
            <span className="inline-flex items-center gap-1"><RiExchangeDollarLine /> Transactions</span>
          </button>
        </div>
        
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
              <RiFileList3Line />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Statements</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
          >
            <RiUpload2Line className="text-lg sm:text-xl" />
            <span className="hidden sm:block">Upload Statement</span>
          </button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        
        {tab === 'statements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {statements.length === 0 ? (
              <div className="col-span-full text-center py-8 sm:py-12 text-gray-500">
                No statements uploaded yet. Click &quot;Upload Statement&quot; to get started.
              </div>
            ) : (
              statements.map(statement => (
                <div
                  key={statement.id}
                  className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden cursor-pointer"
                  onClick={() => {
                    setPreviewUrl(statement.s3FileUrl);
                    setSelectedStatementId(statement.id);
                    setPreviewOpen(true);
                  }}
                >
                  <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-4xl sm:text-5xl pointer-events-none select-none rotate-12">
                    <RiFileList3Line />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-lg sm:text-xl shadow">
                      <RiFileList3Line />
                    </span>
                    {statement.fileName || `Statement ${statement.id}`}
                  </h3>
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                    {statement.tags.map(tag => (
                      <span key={statement.id + '-' + tag} className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium">
                        <RiPriceTag3Line className="text-blue-400" /> {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 bg-white rounded-full p-1.5 sm:p-2 shadow transition-all hover:scale-110"
                    title="Delete Statement"
                    onClick={e => { e.stopPropagation(); handleDeleteStatement(statement.id, statement.s3FileUrl); }}
                  >
                    <RiDeleteBin6Line size={16} className="sm:text-lg" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {tab === 'transactions' && (
          <div>
            {loadingTransactions ? (
              <div className="text-gray-500">Loading transactions...</div>
            ) : transactionsError ? (
              <div className="text-red-600">{transactionsError}</div>
            ) : transactions.length === 0 ? (
              <div className="text-gray-500">No transactions found for this account.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {transactions.map(tx => (
                  <div key={tx.id} className="relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden cursor-pointer">
                    <div className="absolute top-4 right-4 opacity-5 text-purple-500 text-4xl sm:text-5xl pointer-events-none select-none rotate-12">
                      <RiExchangeDollarLine />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <span className="bg-purple-100 p-2 rounded-full text-purple-600 text-lg sm:text-xl shadow">
                        <RiExchangeDollarLine />
                      </span>
                      {tx.fileName || `Transaction ${tx.id}`}
                    </h3>
                    <div className="text-xs text-gray-500 mt-2">
                      <div>Statement ID: {tx.statementId}</div>
                      <div>Rows: {tx.startRow} - {tx.endRow}</div>
                      <div>Created: {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</div>
                    </div>
                    <div className="mt-3 sm:mt-4">
                      <button className="flex items-center gap-1 text-blue-600 underline hover:text-blue-800 transition-all" onClick={() => { setTransactionPreviewUrl(tx.id); setTransactionPreviewOpen(true); }}>
                        <RiFileList3Line /> View & Edit Transactions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <StatementPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          s3FileUrl={previewUrl}
          statementId={selectedStatementId}
          bankId={statements.find(s => s.id === selectedStatementId)?.bankId || null}
          accountId={statements.find(s => s.id === selectedStatementId)?.accountId || null}
          fileName={statements.find(s => s.id === selectedStatementId)?.fileName || ''}
        />
        
        <TransactionPreviewModal
          isOpen={transactionPreviewOpen}
          onClose={() => setTransactionPreviewOpen(false)}
          transactionId={transactionPreviewUrl}
          transactionData={transactions.find(tx => tx.id === transactionPreviewUrl)?.transactionData || []}
          fileName={transactions.find(tx => tx.id === transactionPreviewUrl)?.fileName || ''}
        />
      </div>
    </div>
  );
} 