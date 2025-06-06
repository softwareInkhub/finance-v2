"use client";
import { useEffect, useState, useRef } from "react";
import { FiDownload } from 'react-icons/fi';
import { RiPriceTag3Line } from 'react-icons/ri';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface TransactionRow {
  [key: string]: string | number | Tag[] | undefined;
  tags?: Tag[];
}

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
  transactionData?: TransactionRow[];
  tags?: Tag[];
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

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [tagging, setTagging] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [tagSuccess, setTagSuccess] = useState<string | null>(null);

  const [totalBanks, setTotalBanks] = useState<number>(0);
  const [totalAccounts, setTotalAccounts] = useState<number>(0);

  const [showHeaderSection, setShowHeaderSection] = useState(false);

  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const [selection, setSelection] = useState<{ text: string; x: number; y: number; rowIdx?: number } | null>(null);
  const [tagCreateMsg, setTagCreateMsg] = useState<string | null>(null);
  const [pendingTag, setPendingTag] = useState<{ tagName: string; rowIdx: number; selectionText: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

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
      .then(async (banks: { id: string; bankName: string }[]) => {
        if (!Array.isArray(banks)) return;
        const mappings: { [bankId: string]: BankHeaderMapping } = {};
        await Promise.all(
          banks.map(async (bank) => {
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
      .then(async (banks: { id: string; bankName: string }[]) => {
        if (!Array.isArray(banks)) return;
        setTotalBanks(banks.length);
        let accountCount = 0;
        await Promise.all(
          banks.map(async (bank) => {
            const res = await fetch(`/api/account?bankId=${bank.id}`);
            const accounts = await res.json();
            if (Array.isArray(accounts)) accountCount += accounts.length;
          })
        );
        setTotalAccounts(accountCount);
      });
  }, []);

  // Detect text selection in table and which row
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && tableRef.current && tableRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Try to find the row index
        let rowIdx: number | undefined = undefined;
        let node = sel.anchorNode as HTMLElement | null;
        while (node && node !== tableRef.current) {
          if (node instanceof HTMLTableRowElement && node.hasAttribute('data-row-idx')) {
            rowIdx = parseInt(node.getAttribute('data-row-idx') || '', 10);
            break;
          }
          node = node.parentElement;
        }
        setSelection({
          text: sel.toString().trim(),
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY,
          rowIdx,
        });
      } else {
        setSelection(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Create tag from selection
  const handleCreateTagFromSelection = async () => {
    if (!selection?.text) return;
    setTagCreateMsg(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selection.text }),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      setTagCreateMsg("Tag created!");
      setPendingTag(selection.rowIdx !== undefined ? { tagName: selection.text, rowIdx: selection.rowIdx, selectionText: selection.text } : null);
      setSelection(null);
      // Refresh tags
      const tagsRes = await fetch('/api/tags');
      const tags = await tagsRes.json();
      setAllTags(Array.isArray(tags) ? tags : []);
    } catch {
      setTagCreateMsg("Failed to create tag");
      setTimeout(() => setTagCreateMsg(null), 1500);
    }
  };

  // Apply tag to only this transaction row
  const handleApplyTagToRow = async () => {
    if (!pendingTag) return;
    const { tagName, rowIdx } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    // Find the transaction and row index
    let txIdx = 0, found = false;
    for (const tx of transactions) {
      if (tx.transactionData && Array.isArray(tx.transactionData)) {
        for (let i = 0; i < tx.transactionData.length; ++i) {
          if (txIdx === rowIdx) {
            // Add tag to this row
            const row = tx.transactionData[i];
            const tags = Array.isArray(row.tags) ? [...row.tags] : [];
            if (!tags.some((t: Tag) => t.id === tagObj.id)) tags.push(tagObj);
            const newData = tx.transactionData.map((r, idx) => idx === i ? { ...r, tags } : r);
            await fetch('/api/transaction/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ transactionId: tx.id, transactionData: newData })
            });
            found = true;
            break;
          }
          txIdx++;
        }
        if (found) break;
      }
    }
    setPendingTag(null);
    setTagCreateMsg("Tag applied to transaction!");
    setTimeout(() => setTagCreateMsg(null), 1500);
    // Optionally, refresh transactions
    setLoading(true);
    fetch("/api/transactions/all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  // Apply tag to all transactions where selection text is present in Descriptions (case-insensitive)
  const handleApplyTagToAll = async () => {
    if (!pendingTag) return;
    const { tagName, selectionText } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    const descSuperHeader = superHeader.find(h => h.toLowerCase().includes('description'));
    if (!descSuperHeader) return setPendingTag(null);
    // For each transaction, use reverse mapping to get the actual data field for Descriptions
    await Promise.all(transactions.map(async (tx) => {
      const mapping = bankMappings[tx.bankId]?.mapping || {};
      // Reverse mapping: { [superHeader]: bankHeader }
      const reverseMap: { [superHeader: string]: string } = {};
      Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
        if (superHeader) reverseMap[superHeader] = bankHeader;
      });
      const descField = reverseMap[descSuperHeader] || descSuperHeader;
      if (!tx.transactionData || !Array.isArray(tx.transactionData)) return;
      let changed = false;
      const newData = tx.transactionData.map((row: TransactionRow) => {
        const desc = row[descField];
        if (typeof desc === 'string' && desc.toLowerCase().includes(selectionText.toLowerCase())) {
          const tags = Array.isArray(row.tags) ? [...row.tags] : [];
          if (!tags.some((t: Tag) => t.id === tagObj.id)) {
            changed = true;
            return { ...row, tags: [...tags, tagObj] };
          }
        }
        return row;
      });
      if (changed) {
        await fetch('/api/transaction/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: tx.id, transactionData: newData })
        });
      }
    }));
    setPendingTag(null);
    setTagCreateMsg("Tag applied to all matching transactions!");
    setTimeout(() => setTagCreateMsg(null), 1500);
    // Optionally, refresh transactions
    setLoading(true);
    fetch("/api/transactions/all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  // Flatten all transactionData rows with mapping
  const mappedRows: TransactionRow[] = [];
  transactions.forEach((tx) => {
    const mapping = bankMappings[tx.bankId]?.mapping || {};
    // Reverse mapping: { [superHeader]: bankHeader }
    const reverseMap: { [superHeader: string]: string } = {};
    Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
      if (superHeader) reverseMap[superHeader] = bankHeader;
    });
    if (tx.transactionData && Array.isArray(tx.transactionData)) {
      tx.transactionData.forEach((row: TransactionRow) => {
        const mappedRow: TransactionRow = {};
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

  const handleHeaderSave = async () => {
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
      if (!row.tags || !Array.isArray(row.tags) || !row.tags.some((t: Tag) => t && tagFilters.includes(t.name))) {
        return false;
      }
    }
    // Search
    const searchMatch =
      !search || Object.values(row).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(search.toLowerCase());
        } else if (Array.isArray(val)) {
          return val.map(v => typeof v === 'object' && v !== null && 'name' in v ? (v as Tag).name : String(v)).join(', ').toLowerCase().includes(search.toLowerCase());
        }
        return false;
      });
    // Date range (try to find a date column)
    let dateMatch = true;
    const dateCol = superHeader.find((h) => h.toLowerCase().includes("date"));
    if (dateCol && (dateRange.from || dateRange.to)) {
      const rowDate = row[dateCol];
      if (typeof rowDate === 'string') {
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
          if (Array.isArray(val)) return val.map((v) => (typeof v === 'object' && v !== null && 'name' in v ? (v as Tag).name : String(v))).join('; ');
          if (typeof val === 'object' && val !== null && 'name' in val) return (val as Tag).name;
          if (typeof val === 'string' || typeof val === 'number') return String(val);
          return '';
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
        tx.transactionData.forEach((row: TransactionRow, i: number) => {
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
        const newData = tx.transactionData.map((row: TransactionRow, i: number) => {
          if (rowIndexes.includes(i)) {
            const tags = Array.isArray(row.tags) ? [...row.tags] : [];
            if (!tags.some((t: Tag) => t.id === tagObj.id)) tags.push(tagObj);
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
    } catch {
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
                  const val = amountCol ? row[amountCol] : 0;
                  let num = 0;
                  if (typeof val === 'string') {
                    num = parseFloat(val.replace(/,/g, '')) || 0;
                  } else if (typeof val === 'number') {
                    num = val;
                  }
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
                  const tags = (row['Tags'] || row['tags']) as Tag[] | undefined;
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
                      const tags = filteredRows.flatMap(row => Array.isArray(row.tags) ? row.tags : []);
                      return new Set(tags.map(t => t.name)).size;
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
        {/* Table and selection logic */}
        <div ref={tableRef} className="overflow-x-auto relative">
          {/* Floating create tag button */}
          {selection && (
            <button
              style={{ position: 'absolute', left: selection.x, top: selection.y + 8, zIndex: 1000 }}
              className="px-3 py-1 bg-blue-600 text-white rounded shadow font-semibold text-xs hover:bg-blue-700 transition-all"
              onClick={handleCreateTagFromSelection}
            >
              + Create Tag from Selection
            </button>
          )}
          {/* Prompt to apply tag to transaction */}
          {pendingTag && (
            <div style={{ position: 'absolute', left: selection?.x ?? 100, top: (selection?.y ?? 100) + 40, zIndex: 1001 }} className="bg-white border border-blue-200 rounded shadow-lg px-4 py-3 flex flex-col gap-3 items-center">
              <span>Apply tag &quot;{pendingTag.tagName}&quot; to:</span>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700" onClick={handleApplyTagToRow}>Only this transaction</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700" onClick={handleApplyTagToAll}>All transactions with this text</button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-xs hover:bg-gray-300" onClick={() => setPendingTag(null)}>Cancel</button>
              </div>
            </div>
          )}
          {tagCreateMsg && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded shadow text-sm z-50">
              {tagCreateMsg}
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
                    <tr key={idx} data-row-idx={idx}>
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
                              {(row[sh] as Tag[]).map((tag, tagIdx: number) => (
                                <span key={tag.id + '-' + tagIdx} className="inline-block text-xs px-2 py-0.5 rounded mr-1 mb-1" style={{ background: tag.color, color: '#222' }}>
                                  <RiPriceTag3Line className="inline mr-1" />{tag.name}
                                </span>
                              ))}
                            </div>
                          ) : Array.isArray(row[sh]) ? (
                            (() => {
                              const arr = row[sh] as unknown[];
                              if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'name' in arr[0]) {
                                // Tag[]
                                return (arr as Tag[]).map(t => t.name).join(', ');
                              } else {
                                // (string|number)[]
                                return (arr as (string | number)[]).join(', ');
                              }
                            })()
                          ) : typeof row[sh] === 'object' && row[sh] !== null && 'name' in row[sh] ? (row[sh] as Tag).name : row[sh]}
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
    </div>
  );
} 