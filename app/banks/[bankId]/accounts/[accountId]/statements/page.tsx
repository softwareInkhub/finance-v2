"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Modal from "../../../../../components/Modals/Modal";
import StatementPreviewModal from '../../../../../components/Modals/StatementPreviewModal';
import TransactionPreviewModal from '../../../../../components/Modals/TransactionPreviewModal';
import { RiFileList3Line, RiUpload2Line, RiDeleteBin6Line, RiPriceTag3Line, RiExchangeDollarLine, RiBarChart2Line } from 'react-icons/ri';

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
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [search, setSearch] = useState('');

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

  // Consolidated transaction data
  // Flatten all transactionData rows from all transactions
  const allRows: Record<string, string | Tag[] | undefined>[] = transactions.flatMap(tx => Array.isArray(tx.transactionData) ? tx.transactionData : []);
  const headers = allRows.length > 0 ? Object.keys(allRows[0]) : [];
  const filteredRows = search.trim()
    ? allRows.filter(row =>
        headers.some(h => {
          const v = row[h];
          if (Array.isArray(v)) return v.map(String).join(', ').toLowerCase().includes(search.trim().toLowerCase());
          return String(v ?? '').toLowerCase().includes(search.trim().toLowerCase());
        })
      )
    : allRows;

  // Try to find the amount column (case-insensitive, fallback to first numeric column)
  let amountCol = headers.find(h => h.toLowerCase().includes('amount'));
  if (!amountCol && headers.length > 0 && filteredRows.length > 0) {
    // Try to find the first column with at least one numeric value
    for (const h of headers) {
      if (filteredRows.some(row => {
        const v = row[h];
        return typeof v === 'string' && !isNaN(parseFloat(v.replace(/,/g, '')));
      })) {
        amountCol = h;
        break;
      }
    }
  }
  const consolidated = (() => {
    if (!filteredRows.length) return { count: 0, total: 0, min: 0, max: 0, avg: 0, noAmount: true };
    let total = 0, min = Infinity, max = -Infinity, count = 0;
    if (!amountCol) {
      return { count: filteredRows.length, total: 0, min: 0, max: 0, avg: 0, noAmount: true };
    }
    filteredRows.forEach(row => {
      const amtRaw = row[amountCol!];
      const amt = typeof amtRaw === 'string' ? parseFloat(amtRaw.replace(/,/g, '')) : NaN;
      if (!isNaN(amt)) {
        total += amt;
        min = Math.min(min, amt);
        max = Math.max(max, amt);
        count++;
      }
    });
    return {
      count: filteredRows.length,
      total,
      min: isFinite(min) ? min : 0,
      max: isFinite(max) ? max : 0,
      avg: count ? total / count : 0,
      noAmount: false,
    };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-2 space-y-8 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex gap-4 border-b mb-4">
          <button
            className={`px-4 py-2 font-semibold transition-all ${tab === 'statements' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40 rounded-t' : 'text-gray-600 hover:bg-gray-100 rounded-t'}`}
            onClick={() => setTab('statements')}
          >
            <span className="inline-flex items-center gap-1"><RiFileList3Line /> Statements</span>
          </button>
          <button
            className={`px-4 py-2 font-semibold transition-all ${tab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/40 rounded-t' : 'text-gray-600 hover:bg-gray-100 rounded-t'}`}
            onClick={() => setTab('transactions')}
          >
            <span className="inline-flex items-center gap-1"><RiExchangeDollarLine /> Transactions</span>
          </button>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-2xl shadow">
              <RiFileList3Line />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Statements</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-5 py-2 rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold"
          >
            <RiUpload2Line className="text-xl" /> Upload Statement
          </button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {tab === 'statements' && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Statement">
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">File Name</label>
                <input
                  type="text"
                  placeholder="e.g. Nov2024_Statement.csv"
                  className="border px-3 py-2 rounded-lg w-full mb-2 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-105 hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                  disabled={isUploading}
                >
                  <RiUpload2Line /> {isUploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </Modal>
        )}
        {tab === 'statements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statements.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No statements uploaded yet. Click &quot;Upload Statement&quot; to get started.
              </div>
            ) : (
              statements.map(statement => (
                <div
                  key={statement.id}
                  className="relative bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-105 hover:shadow-2xl group overflow-hidden cursor-pointer w-full max-w-xs"
                  onClick={() => {
                    setPreviewUrl(statement.s3FileUrl);
                    setSelectedStatementId(statement.id);
                    setPreviewOpen(true);
                  }}
                >
                  <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-5xl pointer-events-none select-none rotate-12">
                    <RiFileList3Line />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl shadow">
                      <RiFileList3Line />
                    </span>
                    {statement.fileName || `Statement ${statement.id}`}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {statement.tags.map(tag => (
                      <span key={statement.id + '-' + tag} className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium">
                        <RiPriceTag3Line className="text-blue-400" /> {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800 bg-white rounded-full p-2 shadow transition-all hover:scale-110"
                    title="Delete Statement"
                    onClick={e => { e.stopPropagation(); handleDeleteStatement(statement.id, statement.s3FileUrl); }}
                  >
                    <RiDeleteBin6Line size={18} />
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
                  <div key={tx.id} className="relative bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-lg border border-purple-100 transition-transform duration-200 hover:scale-105 hover:shadow-2xl group overflow-hidden cursor-pointer w-full max-w-xs">
                    <div className="absolute top-4 right-4 opacity-5 text-purple-500 text-5xl pointer-events-none select-none rotate-12">
                      <RiExchangeDollarLine />
                    </div>
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <span className="bg-purple-100 p-2 rounded-full text-purple-600 text-xl shadow">
                        <RiExchangeDollarLine />
                      </span>
                      {tx.fileName || `Transaction ${tx.id}`}
                    </h3>
                    <div className="text-xs text-gray-500 mt-2">
                      <div>Statement ID: {tx.statementId}</div>
                      <div>Rows: {tx.startRow} - {tx.endRow}</div>
                      <div>Created: {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</div>
                    </div>
                    <div className="mt-4">
                      <button className="flex items-center gap-1 text-blue-600 underline hover:text-blue-800 transition-all" onClick={() => { setTransactionPreviewUrl(tx.id); setTransactionPreviewOpen(true); }}>
                        <RiFileList3Line /> View & Edit Transactions
                      </button>
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
      {/* Floating consolidated data button */}
      <button
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-full shadow-lg w-12 h-12 flex items-center justify-center text-2xl hover:scale-110 hover:shadow-2xl transition-all"
        title="Show Consolidated Data"
        onClick={() => setShowConsolidated(true)}
      >
        <RiBarChart2Line />
      </button>
      {/* Consolidated Data Modal */}
      {showConsolidated && (
        <Modal isOpen={showConsolidated} onClose={() => setShowConsolidated(false)} title="Consolidated Transaction Data">
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiExchangeDollarLine className="text-blue-500" />
              <span className="text-lg font-semibold">Total Transactions:</span>
              <span className="text-gray-800">{consolidated.count}</span>
            </div>
            <div className="flex items-center gap-2">
              <RiExchangeDollarLine className="text-green-500" />
              <span className="text-lg font-semibold">Total Amount:</span>
              <span className="text-gray-800">₹{consolidated.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-md">
              <span className="font-medium">Min:</span> <span className="text-gray-700">₹{consolidated.min.toLocaleString()}</span>
              <span className="font-medium ml-4">Max:</span> <span className="text-gray-700">₹{consolidated.max.toLocaleString()}</span>
              <span className="font-medium ml-4">Average:</span> <span className="text-gray-700">₹{consolidated.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          {consolidated.noAmount && filteredRows.length > 0 && (
            <div className="text-yellow-600 text-xs mb-2">No numeric 'amount' column found. Showing only row count. Please check your statement headers.</div>
          )}
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              className="border px-2 py-1 rounded w-full max-w-xs"
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span className="text-xs text-gray-400">{filteredRows.length} rows</span>
          </div>
          {filteredRows.length > 0 ? (
            <div className="overflow-x-scroll mt-2 max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="min-w-full border text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 bg-gray-50 font-semibold">S. No.</th>
                    {headers.map(header => (
                      <th key={header} className="border px-2 py-1 bg-gray-50 font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1 text-center">{i + 1}</td>
                      {headers.map(header => (
                        <td key={header} className="border px-2 py-1">{
                          Array.isArray(row[header])
                            ? (Array.isArray(row[header]) && row[header].length > 0 && typeof row[header][0] === 'object' && 'name' in row[header][0] && 'color' in row[header][0]
                                ? (row[header] as Tag[]).map((tag, tagIdx) => (
                                    <span key={tag.id + '-' + tagIdx} className="inline-block text-xs px-2 py-0.5 rounded mr-1 mb-1" style={{ background: tag.color, color: '#222' }}>
                                      {tag.name}
                                    </span>
                                  ))
                                : (row[header] as any[]).map(String).join(', ')
                              )
                            : String(row[header] ?? '')
                        }</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-500 p-4">No transaction data available.</div>
          )}
        </Modal>
      )}
    </div>
  );
} 