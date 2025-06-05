"use client";
import { useEffect, useState } from "react";
import { RiEdit2Line } from 'react-icons/ri';
import { FiDownload } from 'react-icons/fi';

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
      // We'll handle this in the render below
      return null; // We'll handle in render
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
    // Search
    const searchMatch =
      !search ||
      Object.values(row).some((val) =>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-blue-700">Super Bank: All Transactions</h1>
        {/* Super Bank Header Display and Edit - moved to top */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow relative">
          <h2 className="font-bold text-blue-700 mb-2">Super Bank Header</h2>
          <div className="absolute top-4 right-4">
            {!headerEditing && (
              <button
                type="button"
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                onClick={() => setHeaderEditing(true)}
                aria-label="Edit Header"
              >
                <RiEdit2Line size={20} />
              </button>
            )}
          </div>
          {headerLoading ? (
            <div className="text-gray-500">Loading header...</div>
          ) : (
            <>
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
            </>
          )}
        </div>
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
                className="border px-2 py-1 rounded text-sm"
                value={dateRange.from}
                onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
              />
              <label className="text-xs text-gray-700">To</label>
              <input
                type="date"
                className="border px-2 py-1 rounded text-sm"
                value={dateRange.to}
                onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
              />
            </div>
          </div>
          {/* Large download button with icon and text */}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50"
            onClick={handleDownload}
            disabled={selectedRows.size === 0}
          >
            <FiDownload size={18} />
            Download
          </button>
        </div>
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
                        {Array.isArray(row[sh])
                          ? row[sh].map((item: any, i: number) =>
                              typeof item === 'object' && item !== null
                                ? item.name || JSON.stringify(item)
                                : String(item)
                            ).join(', ')
                          : typeof row[sh] === 'object' && row[sh] !== null
                            ? row[sh].name || JSON.stringify(row[sh])
                            : row[sh]}
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