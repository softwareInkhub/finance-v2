"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Modal from "../../../../../components/Modals/Modal";
import StatementPreviewModal from '../../../../../components/Modals/StatementPreviewModal';
import TransactionPreviewModal from '../../../../../components/Modals/TransactionPreviewModal';
import { RiFileList3Line, RiUpload2Line, RiDeleteBin6Line, RiPriceTag3Line, RiExchangeDollarLine } from 'react-icons/ri';
import Link from "next/link";
import TransactionTable from '../../../../../components/TransactionTable';
import TaggingControls from '../../../../../components/TaggingControls';
import AnalyticsSummary from '../../../../../components/AnalyticsSummary';
import TransactionFilterBar from '../../../../../components/TransactionFilterBar';
import TagFilterPills from '../../../../../components/TagFilterPills';

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
  tags?: Tag[];
  bankId?: string;
  accountId?: string;
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
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [transactionHeaders, setTransactionHeaders] = useState<string[]>([]);

  useEffect(() => {
    const fetchStatements = async () => {
      try {
        setError(null);
        const userId = localStorage.getItem("userId") || "";
        const res = await fetch(`/api/statements?accountId=${accountId}&userId=${userId}`);
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
      const userId = localStorage.getItem("userId") || "";
      fetch(`/api/transactions?accountId=${accountId}&userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTransactions(data);
          else setTransactionsError(data.error || 'Failed to fetch transactions');
        })
        .catch(() => setTransactionsError('Failed to fetch transactions'))
        .finally(() => setLoadingTransactions(false));
    }
  }, [tab, accountId]);

  useEffect(() => {
    if (bankId) {
      fetch(`/api/bank`).then(res => res.json()).then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
    }
    if (accountId) {
      fetch(`/api/account?accountId=${accountId}`).then(res => res.json()).then((account) => {
        setAccountName(account?.accountHolderName || "");
      });
    }
  }, [bankId, accountId]);

  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
  }, []);

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
      formData.append('userId', localStorage.getItem("userId") || "");
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

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) setSelectedRows(new Set());
    else setSelectedRows(new Set(transactions.map(tx => tx.id)));
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    setSelectAll(
      transactions.length > 0 && transactions.every(tx => selectedRows.has(tx.id))
    );
  }, [selectedRows, transactions]);

  const handleAddTag = async () => {
    setTagging(true);
    setTagError(null);
    setTagSuccess(null);
    if (!selectedTagId) { setTagging(false); return; }
    const tagObj = allTags.find(t => t.id === selectedTagId);
    if (!tagObj) { setTagging(false); return; }
    try {
      await Promise.all(Array.from(selectedRows).map(async (id) => {
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;
        const txObj = tx as Record<string, any>;
        const tags = Array.isArray(txObj.tags) ? [...txObj.tags] : [];
        if (!tags.some((t: any) => t.id === tagObj.id)) tags.push(tagObj);
        await fetch('/api/transaction/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: id, transactionData: { tags } })
        });
      }));
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      // Optionally, refetch transactions to update UI
    } catch {
      setTagError('Failed to add tag');
    } finally {
      setTagging(false);
    }
  };

  // Filtered transactions for table and summary
  const filteredTransactions = transactions.filter(tx => {
    // Tag filter
    if (tagFilters.length > 0) {
      const tags = (tx.tags || []) as Tag[];
      if (!tags.some(t => tagFilters.includes(t.name))) return false;
    }
    // Search
    if (search && !Object.values(tx).some(val => String(val).toLowerCase().includes(search.toLowerCase()))) return false;
    // Date range (if there is a date field)
    const dateKey = Object.keys(tx).find(k => k.toLowerCase().includes('date'));
    if (dateKey && (dateRange.from || dateRange.to)) {
      const rowDate = (tx as any)[dateKey];
      if (typeof rowDate === 'string') {
        let d = rowDate;
        if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
          const [dd, mm, yyyy] = d.split("/");
          d = `${yyyy}-${mm}-${dd}`;
        }
        if (dateRange.from && d < dateRange.from) return false;
        if (dateRange.to && d > dateRange.to) return false;
      }
    }
    return true;
  });

  // Summary stats
  const amountKey = Object.keys(transactions[0] || {}).find(k => k.toLowerCase().includes('amount'));
  const totalAmount = amountKey ? filteredTransactions.reduce((sum, tx) => {
    const val = (tx as any)[amountKey];
    let num = 0;
    if (typeof val === 'string') num = parseFloat(val.replace(/,/g, '')) || 0;
    else if (typeof val === 'number') num = val;
    return sum + num;
  }, 0).toLocaleString() : undefined;
  const allBankIds = new Set(filteredTransactions.map(tx => tx.bankId));
  const allAccountIds = new Set(filteredTransactions.map(tx => tx.accountId));
  let tagged = 0, untagged = 0;
  filteredTransactions.forEach(tx => {
    const tags = (tx.tags || []) as Tag[];
    if (Array.isArray(tags) && tags.length > 0) tagged++; else untagged++;
  });
  const totalTags = new Set(filteredTransactions.flatMap(tx => (Array.isArray(tx.tags) ? tx.tags.map(t => t.name) : []))).size;

  // Update headers when filteredTransactions change, but only if changed
  useEffect(() => {
    if (tab === 'transactions' && filteredTransactions.length > 0) {
      const headers = Array.from(new Set(filteredTransactions.flatMap(tx => Object.keys(tx)))).filter(key => key !== 'id' && key !== 'transactionData');
      if (headers.length !== transactionHeaders.length || headers.some((h, i) => h !== transactionHeaders[i])) {
        setTransactionHeaders(headers);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filteredTransactions.length]);

  // Handler for column reordering
  const handleReorderHeaders = (newHeaders: string[]) => {
    setTransactionHeaders(newHeaders);
  };

  return (
    <div className="min-h-screen  py-6 sm:py-10 px-3 sm:px-4 space-y-6 sm:space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="text-sm mb-4 flex items-center gap-2 text-gray-600">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/banks" className="hover:underline">Banks</Link>
        <span>/</span>
        {bankId ? (
          <span className="font-semibold">{bankName || 'Bank'}</span>
        ) : (
          <span>Bank</span>
        )}
        <span>/</span>
        {bankId ? (
          <Link href={`/banks/${bankId}/accounts`} className="hover:underline">{accountName || 'Account'}</Link>
        ) : (
          <span>Account</span>
        )}
        <span>/</span>
        <span className="font-semibold text-blue-700">{tab === 'transactions' ? 'Transactions' : 'Statements'}</span>
      </nav>
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
            {tab === 'statements' && (
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Statements</h1>
            )}
            {tab === 'transactions' && (
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Transactions</h1>
            )}
          </div>
          {tab === 'statements' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
            >
              <RiUpload2Line className="text-lg sm:text-xl" />
              <span className="hidden sm:block">Upload Statement</span>
            </button>
          )}
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
            <AnalyticsSummary
              totalTransactions={filteredTransactions.length}
              totalAmount={totalAmount}
              totalBanks={allBankIds.size}
              totalAccounts={allAccountIds.size}
              tagged={tagged}
              untagged={untagged}
              totalTags={totalTags}
              showAmount={!!amountKey}
              showTagStats={true}
            />
            <TransactionFilterBar
              search={search}
              onSearchChange={setSearch}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onDownload={() => {
                if (selectedRows.size === 0) return;
                const rows = Array.from(selectedRows).map(id => filteredTransactions.find((tx) => tx.id === id)).filter(Boolean);
                const headers = Object.keys(filteredTransactions[0] || {}).filter(k => k !== 'id' && k !== 'transactionData');
                const csv = [headers.join(",")].concat(
                  rows.map((row: any) =>
                    headers.map((sh) => {
                      const val = (row as any)[sh];
                      if (Array.isArray(val)) return val.map((v: any) => (typeof v === 'object' && v !== null && 'name' in v ? v.name : String(v))).join('; ');
                      if (typeof val === 'object' && val !== null && 'name' in val) return val.name;
                      if (typeof val === 'string' || typeof val === 'number') return String(val);
                      return '';
                    }).join(",")
                  )
                ).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "transactions-selected.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              downloadDisabled={selectedRows.size === 0}
            />
            <TagFilterPills
              allTags={allTags}
              tagFilters={tagFilters}
              onToggleTag={tagName => setTagFilters(filters => filters.includes(tagName) ? filters.filter(t => t !== tagName) : [...filters, tagName])}
              onClear={() => setTagFilters([])}
            />
            {selectedRows.size > 0 && (
              <TaggingControls
                allTags={allTags}
                selectedTagId={selectedTagId}
                onTagChange={setSelectedTagId}
                onAddTag={handleAddTag}
                selectedCount={selectedRows.size}
                tagging={tagging}
                tagError={tagError}
                tagSuccess={tagSuccess}
              />
            )}
            <TransactionTable
              rows={filteredTransactions.map(({ transactionData, ...rest }) => rest)}
              headers={transactionHeaders}
              onReorderHeaders={handleReorderHeaders}
              selectedRows={new Set(filteredTransactions.map((tx, idx) => selectedRows.has(tx.id) ? idx : -1).filter(i => i !== -1))}
              selectAll={selectAll}
              onRowSelect={idx => {
                const tx = filteredTransactions[idx];
                if (tx) handleRowSelect(tx.id);
              }}
              onSelectAll={handleSelectAll}
              loading={loadingTransactions}
              error={transactionsError}
            />
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

        {/* Upload Statement Modal */}
        {isModalOpen && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Statement">
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">File Name</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  placeholder="Optional: Enter a file name"
                  disabled={isUploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
                  required
                  disabled={isUploading}
                />
              </div>
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
} 