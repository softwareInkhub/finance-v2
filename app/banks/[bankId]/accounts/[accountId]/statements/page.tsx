"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Modal from "../../../../../components/Modals/Modal";
import StatementPreviewModal from '../../../../../components/Modals/StatementPreviewModal';
import TransactionPreviewModal from '../../../../../components/Modals/TransactionPreviewModal';

interface Statement {
  id: string;
  bankId: string;
  accountId: string;
  s3FileUrl: string;
  transactionHeader: string[];
  tags: string[];
  fileName?: string;
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
  const [transactions, setTransactions] = useState<any[]>([]);
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
      } catch (err) {
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
    <div className="space-y-6">
      <div className="flex gap-4 border-b mb-4">
        <button
          className={`px-4 py-2 font-semibold ${tab === 'statements' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setTab('statements')}
        >
          Statements
        </button>
        <button
          className={`px-4 py-2 font-semibold ${tab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setTab('transactions')}
        >
          Transactions
        </button>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Upload Statement
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      {tab === 'statements' && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Statement">
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">File Name</label>
              <input
                type="text"
                placeholder="e.g. Nov2024_Statement.csv"
                className="border px-2 py-1 rounded w-full mb-2"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                disabled={isUploading}
              />
              <label className="block text-sm font-medium text-gray-700">CSV File</label>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="mt-1 block w-full"
                required
                disabled={isUploading}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {tab === 'statements' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statements.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No statements uploaded yet. Click "Upload Statement" to get started.
            </div>
          ) : (
            statements.map(statement => (
              <div
                key={statement.id}
                className="bg-white p-3 rounded-md shadow-sm hover:shadow-md transition-shadow cursor-pointer relative w-full max-w-xs"
                onClick={() => {
                  setPreviewUrl(statement.s3FileUrl);
                  setSelectedStatementId(statement.id);
                  setPreviewOpen(true);
                }}
              >
                <h3 className="text-base font-semibold text-gray-800">{statement.fileName || `Statement ${statement.id}`}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {statement.tags.map(tag => (
                    <span key={statement.id + '-' + tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>
                  ))}
                </div>
                <button
                  className="absolute top-2 right-2 text-red-600 hover:text-red-800 bg-white rounded-full p-1 shadow"
                  title="Delete Statement"
                  onClick={e => { e.stopPropagation(); handleDeleteStatement(statement.id, statement.s3FileUrl); }}
                >
                  &#128465;
                </button>
              </div>
            ))
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
      {tab === 'transactions' && (
        <div>
          {loadingTransactions ? (
            <div className="text-gray-500">Loading transactions...</div>
          ) : transactionsError ? (
            <div className="text-red-600">{transactionsError}</div>
          ) : transactions.length === 0 ? (
            <div className="text-gray-500">No transactions found for this account.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-white p-3 rounded-md shadow-sm cursor-pointer w-full max-w-xs">
                  <h3 className="text-base font-semibold text-gray-800">{tx.fileName || `Transaction ${tx.id}`}</h3>
                  <div className="text-xs text-gray-500 mt-2">
                    <div>Statement ID: {tx.statementId}</div>
                    <div>Rows: {tx.startRow} - {tx.endRow}</div>
                    <div>Created: {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="mt-2">
                    <button className="text-blue-600 underline" onClick={() => { setTransactionPreviewUrl(tx.id); setTransactionPreviewOpen(true); }}>View & Edit Transactions</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <TransactionPreviewModal
            isOpen={transactionPreviewOpen}
            onClose={() => setTransactionPreviewOpen(false)}
            transactionId={transactionPreviewUrl}
            transactionData={transactions.find(tx => tx.id === transactionPreviewUrl)?.transactionData || []}
            fileName={transactions.find(tx => tx.id === transactionPreviewUrl)?.fileName || ''}
          />
        </div>
      )}
    </div>
  );
} 