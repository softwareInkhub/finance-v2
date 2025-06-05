"use client";
import { useEffect, useState } from "react";
import { RiEdit2Line } from 'react-icons/ri';
import { FiDownload } from 'react-icons/fi';
import { RiPriceTag3Line } from 'react-icons/ri';

interface Transaction {
  id: string;
  statementId: string;
  bankId: string;
  accountId: string;
  startRow?: number;
  endRow?: number;
  s3FileUrl?: string;
  fileName?: string;
  createdAt?: string;
  transactionData?: Record<string, string | any>[];
  tags?: any[];
}

interface BankHeaderMapping {
  id: string; // bankName
  bankId: string;
  header: string[];
  mapping?: { [key: string]: string };
}

export default function SuperBankPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Super Bank header state
  const [superHeader, setSuperHeader] = useState<string[]>([]);
  const [bankMappings, setBankMappings] = useState<{ [bankId: string]: BankHeaderMapping }>({});
  const [headerInputs, setHeaderInputs] = useState<string[]>([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSuccess, setHeaderSuccess] = useState<string | null>(null);
  const [headerEditing, setHeaderEditing] = useState(false);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);

  const [totalBanks, setTotalBanks] = useState<number>(0);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);

  const [showHeaderSection, setShowHeaderSection] = useState(false);

  const [tagFilters, setTagFilters] = useState<string[]>([]);

  // Fetch all transactions
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/transactions/all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch Super Bank header
  useEffect(() => {
    fetch(`/api/bank-header?bankName=SUPER%20BANK`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.header)) {
          setSuperHeader(data.header);
          setHeaderInputs(data.header);
        } else {
          setSuperHeader([]);
          setHeaderInputs([]);
        }
      });
  }, []);

  // Fetch all bank header mappings
  useEffect(() => {
    fetch(`/api/bank`)
      .then(res => res.json())
      .then(async (banks) => {
        if (!Array.isArray(banks)) return;
        const mappings: { [bankId: string]: BankHeaderMapping } = {};
        await Promise.all(
          banks.map(async (bank: any) => {
            const res = await fetch(`/api/bank-header?bankName=${encodeURIComponent(bank.bankName)}`);
            const data = await res.json();
            if (data && data.mapping) {
              mappings[bank.id] = data;
            }
          })
        );
        setBankMappings(mappings);
      });
  }, []);

  // Fetch all tags
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAllTags(data); else setAllTags([]); });
  }, []);

  // Fetch all banks and accounts for stats
  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(async (banks) => {
        if (!Array.isArray(banks)) return;
        setTotalBanks(banks.length);
        let accountCount = 0;
        await Promise.all(
          banks.map(async (bank: any) => {
            const res = await fetch(`/api/account?bankId=${bank.id}`);
            const accounts = await res.json();
            if (Array.isArray(accounts)) accountCount += accounts.length;
          })
        );
        setTotalAccounts(accountCount);
      });
  }, []);

  // Helper: get mapped data for a transaction
  function getMappedRow(tx: Transaction) {
    const mapping = bankMappings[tx.bankId]?.mapping || {};
    // Reverse mapping: { [superHeader]: bankHeader }
    const reverseMap: { [superHeader: string]: string } = {};
    Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
      if (superHeader) reverseMap[superHeader] = bankHeader;
    });
    const row: (string | undefined)[] = superHeader.map((sh) => {
      const bankHeader = reverseMap[sh];
      if (!bankHeader || !tx.transactionData || !Array.isArray(tx.transactionData)) return "";
      // If transactionData is an array, show all rows (flattened)
      // For Super Bank, show each transaction row as a separate row
      return undefined; // We'll handle in render
    });
    return { reverseMap };
  }

  // Flatten all transactionData rows with mapping
  const mappedRows: { [key: string]: any }[] = [];
  transactions.forEach((tx) => {
    const mapping = bankMappings[tx.bankId]?.mapping || {};
    // Reverse mapping: { [superHeader]: bankHeader }
    const reverseMap: { [superHeader: string]: string } = {};
    Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
      if (superHeader) reverseMap[superHeader] = bankHeader;
    });
    if (tx.transactionData && Array.isArray(tx.transactionData)) {
      tx.transactionData.forEach((row: any) => {
        const mappedRow: { [key: string]: any } = {};
        superHeader.forEach((sh) => {
          const bankHeader = reverseMap[sh];
          mappedRow[sh] = bankHeader ? row[bankHeader] || "" : "";
        });
        // Always copy tags field for tag filtering and display
        mappedRow.tags = row.tags || [];
        mappedRows.push(mappedRow);
      });
    }
  });

  const handleHeaderSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setHeaderLoading(true);
    setHeaderError(null);
    setHeaderSuccess(null);
    const headerArr = headerInputs.map(h => h.trim()).filter(Boolean);
    if (!headerArr.length) {
      setHeaderError("Header cannot be empty");
      setHeaderLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/bank-header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName: "SUPER BANK", bankId: null, header: headerArr })
      });
      if (!res.ok) throw new Error("Failed to save header");
      setSuperHeader(headerArr);
      setHeaderSuccess("Header saved!");
      setHeaderEditing(false);
    } catch {
      setHeaderError("Failed to save header");
    } finally {
      setHeaderLoading(false);
    }
  };

  const handleHeaderInputChange = (idx: number, value: string) => {
    setHeaderInputs(inputs => inputs.map((h, i) => i === idx ? value : h));
  };
  const handleAddHeaderInput = () => {
    setHeaderInputs(inputs => [...inputs, ""]);
  };
  const handleRemoveHeaderInput = (idx: number) => {
    setHeaderInputs(inputs => inputs.filter((_, i) => i !== idx));
  };

  // Filtered and searched rows
  const filteredRows = mappedRows.filter((row) => {
    // Multi-tag filter: show if row has at least one selected tag
    if (tagFilters.length > 0) {
      if (!row.tags || !Array.isArray(row.tags) || !row.tags.some((t: any) => t && typeof t === 'object' && tagFilters.includes(t.name))) {
        return false;
      }
    }
    // Search
    const searchMatch =
      !search || Object.values(row).some((val) =>
        String(val).toLowerCase().includes(search.toLowerCase())
      );
    // Date range (try to find a date column)
    let dateMatch = true;
    const dateCol = superHeader.find((h) => h.toLowerCase().includes("date"));
    if (dateCol && (dateRange.from || dateRange.to)) {
      const rowDate = row[dateCol];
      if (rowDate) {
        // Try to parse as yyyy-mm-dd or dd/mm/yyyy
        let d = rowDate;
        if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
          const [dd, mm, yyyy] = d.split("/");
          d = `${yyyy}-${mm}-${dd}`;
        }
        if (dateRange.from && d < dateRange.from) dateMatch = false;
        if (dateRange.to && d > dateRange.to) dateMatch = false;
      }
    }
    return searchMatch && dateMatch;
  });

  // Handle row selection
  const handleRowSelect = (idx: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };
  const handleSelectAll = () => {
    if (selectAll) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredRows.map((_, i) => i)));
    setSelectAll(!selectAll);
  };
  useEffect(() => {
    setSelectAll(
      filteredRows.length > 0 && filteredRows.every((_, i) => selectedRows.has(i))
    );
  }, [selectedRows, filteredRows]);

  // Download selected as CSV
  const handleDownload = () => {
    if (selectedRows.size === 0) return;
    const rows = Array.from(selectedRows).map((i) => filteredRows[i]);
    const csv = [superHeader.join(",")].concat(
      rows.map((row) =>
        superHeader.map((sh) => {
          const val = row[sh];
          if (Array.isArray(val)) return val.map((v) => (typeof v === 'object' && v !== null ? v.name || JSON.stringify(v) : String(v))).join('; ');
          if (typeof val === 'object' && val !== null) return val.name || JSON.stringify(val);
          return val;
        }).join(",")
      )
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "super-bank-selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tagging logic
  const handleAddTag = async () => {
    setTagging(true);
    setTagError(null);
    setTagSuccess(null);
    if (!selectedTagId) { setTagging(false); return; }
    const tagObj = allTags.find(t => t.id === selectedTagId);
    if (!tagObj) { setTagging(false); return; }
    // Group selected rows by transactionId
    const txMap: { [txId: string]: { tx: Transaction, rowIndexes: number[] } } = {};
    let rowIdx = 0;
    transactions.forEach((tx) => {
      if (tx.transactionData && Array.isArray(tx.transactionData)) {
        tx.transactionData.forEach((row: any, i: number) => {
          if (selectedRows.has(rowIdx)) {
            if (!txMap[tx.id]) txMap[tx.id] = { tx, rowIndexes: [] };
            txMap[tx.id].rowIndexes.push(i);
          }
          rowIdx++;
        });
      }
    });
    try {
      await Promise.all(Object.values(txMap).map(async ({ tx, rowIndexes }) => {
        if (!tx.transactionData) return;
        const newData = tx.transactionData.map((row: any, i: number) => {
          if (rowIndexes.includes(i)) {
            const tags = Array.isArray(row.tags) ? [...row.tags] : [];
            if (!tags.some((t: any) => t.id === tagObj.id)) tags.push(tagObj);
            return { ...row, tags };
          }
          return row;
        });
        await fetch('/api/transaction/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: tx.id, transactionData: newData })
        });
      }));
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      // Optionally, refetch transactions to update UI
      setLoading(true);
      fetch("/api/transactions/all")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
    } catch (e) {
      setTagError('Failed to add tag');
    } finally {
      setTagging(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-[75%] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-blue-700">Super Bank: All Transactions</h1>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow font-semibold"
            onClick={() => setShowHeaderSection(true)}
          >
            Header
          </button>
        </div>
        {/* Super Bank Header Display and Edit - toggled by button */}
        {showHeaderSection && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow relative">
            <button
              className="absolute top-2 right-2 text-blue-700 hover:text-blue-900 text-xl font-bold"
              onClick={() => setShowHeaderSection(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="font-bold text-blue-700 mb-2">Super Bank Header</h2>
            <div className="mb-2 text-sm text-gray-700">
              <span className="font-semibold">Current Header:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {superHeader.length > 0 ? (
                  superHeader.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full border border-blue-200 shadow text-xs font-medium"
                    >
                      {col}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400">No header set</span>
                )}
              </div>
            </div>
            {headerEditing && (
              <form onSubmit={handleHeaderSave} className="flex flex-col gap-2 mt-4">
                <label className="block text-xs font-medium text-blue-700 mb-1">Edit Header Columns</label>
                <div className="flex flex-wrap gap-3 items-center bg-white/70 p-3 rounded border border-blue-100 shadow-sm">
                  {headerInputs.map((header, idx) => (
                    <div key={idx} className="relative group">
                      <input
                        type="text"
                        value={header}
                        onChange={e => handleHeaderInputChange(idx, e.target.value)}
                        className="rounded border border-blue-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 min-w-[120px]"
                        placeholder={`Header ${idx + 1}`}
                        disabled={headerLoading}
                      />
                      {headerInputs.length > 1 && (
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                          title="Remove"
                          onClick={() => handleRemoveHeaderInput(idx)}
                          tabIndex={-1}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xl font-bold shadow"
                    onClick={handleAddHeaderInput}
                    title="Add header column"
                    disabled={headerLoading}
                    style={{ alignSelf: 'center' }}
                  >
                    +
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50 w-fit"
                    disabled={headerLoading}
                  >
                    {headerLoading ? "Saving..." : "Save Header"}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-fit"
                    onClick={() => setHeaderEditing(false)}
                    disabled={headerLoading}
                  >
                    Cancel
                  </button>
                </div>
                {headerError && <div className="text-red-600 mt-2">{headerError}</div>}
                {headerSuccess && <div className="text-green-600 mt-2">{headerSuccess}</div>}
              </form>
            )}
          </div>
        )}
        {/* Tag filter note */}
        {tagFilters.length > 0 && (
          <div className="mb-2 text-indigo-700 font-semibold text-sm">
            Showing stats for tags:
            {tagFilters.map(tag => (
              <span key={tag} className="bg-indigo-600 text-white px-2 py-1 rounded-full ml-1">{tag}</span>
            ))}
          </div>
        )}
        {/* Analytics summary above controls */}
        {filteredRows.length > 0 && (
          <div className="flex flex-wrap gap-6 items-center mb-4">
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold shadow text-sm">
              Total Transactions: {filteredRows.length}
            </div>
            {superHeader.some(h => h.toLowerCase().includes('amount')) && (
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold shadow text-sm">
                Total Amount: {filteredRows.reduce((sum, row) => {
                  const amountCol = superHeader.find(h => h.toLowerCase().includes('amount'));
                  let val = amountCol ? row[amountCol] : 0;
                  if (typeof val === 'string') val = val.replace(/,/g, '');
                  const num = parseFloat(val) || 0;
                  return sum + num;
                }, 0).toLocaleString()}
              </div>
            )}
            {/* Total Banks */}
            <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold shadow text-sm">
              Total Banks: {totalBanks}
            </div>
            {/* Total Accounts */}
            <div className="px-4 py-2 bg-pink-100 text-pink-800 rounded-lg font-semibold shadow text-sm">
              Total Accounts: {totalAccounts}
            </div>
            {/* Tagged/Untagged stats */}
            {superHeader.some(h => h.toLowerCase() === 'tags') && (
              (() => {
                let tagged = 0, untagged = 0;
                filteredRows.forEach(row => {
                  const tags = row['Tags'] || row['tags'];
                  if (Array.isArray(tags) && tags.length > 0) tagged++;
                  else untagged++;
                });
                return <>
                  <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold shadow text-sm">
                    Tagged: {tagged}
                  </div>
                  <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg font-semibold shadow text-sm">
                    Untagged: {untagged}
                  </div>
                  <div className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-semibold shadow text-sm">
                    Total Tags: {(() => {
                      const tags = filteredRows.flatMap(row => row.tags || []);
                      return new Set(tags.filter(t => typeof t === 'string' && t)).size;
                    })()}
                  </div>
                </>;
              })()
            )}
          </div>
        )}
        {/* Controls - only main Download button on the right */}
        <div className="flex flex-wrap gap-4 items-center mb-4 justify-end">
          {/* Search and date range controls */}
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border px-3 py-2 rounded shadow-sm text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minWidth: 180 }}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-700">From</label>
              <input
                type="date"
                className="border px-2 py-1 rounded shadow-sm text-xs"
                value={dateRange.from}
                onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <label className="text-xs text-gray-700">To</label>
              <input
                type="date"
                className="border px-2 py-1 rounded shadow-sm text-xs"
                value={dateRange.to}
                onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>
          <button
            className="px-4 py-2 bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded shadow font-semibold flex items-center gap-2"
            onClick={handleDownload}
            disabled={selectedRows.size === 0}
          >
            <FiDownload size={20} /> Download
          </button>
        </div>
        {/* Tag filter pills section below controls */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          {allTags.map(tag => (
            <button
              key={tag.id}
              className={`px-2 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all ${tagFilters.includes(tag.name) ? 'bg-indigo-700 text-white border-indigo-800 scale-110' : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'}`}
              onClick={() => setTagFilters(filters => filters.includes(tag.name) ? filters.filter(t => t !== tag.name) : [...filters, tag.name])}
            >
              {tag.name}
            </button>
          ))}
          {tagFilters.length > 0 && (
            <button
              className="px-2 py-1 rounded-full text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ml-2"
              onClick={() => setTagFilters([])}
            >
              Clear
            </button>
          )}
        </div>
        {/* Tagging controls above table */}
        {selectedRows.size > 0 && (
          <div className="flex gap-2 items-center mb-2 bg-gray-50 px-3 py-2 rounded shadow">
            <span>{selectedRows.size} selected</span>
            <select
              className="border px-2 py-1 rounded text-xs"
              value={selectedTagId}
              onChange={e => setSelectedTagId(e.target.value)}
            >
              <option value="">Add tag...</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id} style={{ background: tag.color, color: '#222' }}>{tag.name}</option>
              ))}
            </select>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold disabled:opacity-50"
              onClick={handleAddTag}
              disabled={tagging || !selectedTagId}
            >
              Add Tag
            </button>
            {tagError && <span className="text-red-600 ml-2">{tagError}</span>}
            {tagSuccess && <span className="text-green-600 ml-2">{tagSuccess}</span>}
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading transactions...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : mappedRows.length === 0 ? (
          <div className="text-gray-500">No mapped transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm bg-white/80 rounded-xl shadow">
              <thead>
                <tr>
                  <th className="border px-2 py-1 bg-gray-100">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                  <th className="border px-2 py-1 font-bold bg-gray-100">#</th>
                  {superHeader.map((sh) => (
                    <th key={sh} className="border px-2 py-1 font-bold bg-gray-100">{sh}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(idx)}
                        onChange={() => handleRowSelect(idx)}
                      />
                    </td>
                    <td className="border px-2 py-1 text-center">{idx + 1}</td>
                    {superHeader.map((sh) => (
                      <td key={sh} className="border px-2 py-1">
                        {sh.toLowerCase() === 'tags' && Array.isArray(row[sh]) ? (
                          <div className="flex flex-wrap gap-1">
                            {row[sh].map((tag: any, tagIdx: number) => (
                              <span key={tag.id + '-' + tagIdx} className="inline-block text-xs px-2 py-0.5 rounded mr-1 mb-1" style={{ background: tag.color, color: '#222' }}>
                                <RiPriceTag3Line className="inline mr-1" />{tag.name}
                              </span>
                            ))}
                          </div>
                        ) : Array.isArray(row[sh]) ? row[sh].join(', ') : typeof row[sh] === 'object' && row[sh] !== null ? row[sh].name || JSON.stringify(row[sh]) : row[sh]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 