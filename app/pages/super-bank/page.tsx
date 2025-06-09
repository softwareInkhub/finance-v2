"use client";
import { useEffect, useState, useRef } from "react";
import { FiDownload } from 'react-icons/fi';
import { RiPriceTag3Line } from 'react-icons/ri';
import AnalyticsSummary from '../../components/AnalyticsSummary';
import TransactionFilterBar from '../../components/TransactionFilterBar';
import TagFilterPills from '../../components/TagFilterPills';
import TaggingControls from '../../components/TaggingControls';
import TransactionTable from '../../components/TransactionTable';

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
  conditions?: { [superField: string]: string[] };
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
    const userId = localStorage.getItem("userId") || "";
    fetch(`/api/transactions/all?userId=${userId}`)
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
        const containerRect = tableRef.current.getBoundingClientRect();
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
          x: rect.left - containerRect.left,
          y: rect.bottom - containerRect.top,
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

  // Apply tag to only this transaction row (flat structure)
  const handleApplyTagToRow = async () => {
    if (!pendingTag) return;
    const { tagName, rowIdx } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    const row = filteredRows[rowIdx];
    if (!row || !row.id) return setPendingTag(null);
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return setPendingTag(null);
    const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
    if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
    await fetch('/api/transaction/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: tx.id, tags })
    });
    setPendingTag(null);
    setTagCreateMsg("Tag applied to transaction!");
    setTimeout(() => setTagCreateMsg(null), 1500);
    setLoading(true);
    fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  // Apply tag to all transactions where selection text is present in ANY field (except tags, case-sensitive, all columns)
  const handleApplyTagToAll = async () => {
    if (!pendingTag) return;
    const { tagName, selectionText } = pendingTag;
    const tagObj = allTags.find(t => t.name === tagName);
    if (!tagObj) return setPendingTag(null);
    await Promise.all(transactions.map(async (tx) => {
      // Check all primitive fields except arrays/objects and 'tags' for case-sensitive match
      const hasMatch = Object.entries(tx).some(([key, val]) =>
        key !== 'tags' &&
        ((typeof val === 'string' && val.includes(selectionText)) ||
         (typeof val === 'number' && String(val).includes(selectionText)))
      );
      if (hasMatch) {
        const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
        if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
        await fetch('/api/transaction/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: tx.id, tags })
        });
      }
    }));
    setPendingTag(null);
    setTagCreateMsg("Tag applied to all matching transactions!");
    setTimeout(() => setTagCreateMsg(null), 1500);
    setLoading(true);
    fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  // Flatten all transaction rows for rendering
  const mappedRows: TransactionRow[] = transactions.map((tx) => {
    const mapping = bankMappings[tx.bankId]?.mapping || {};
    // Reverse mapping: { [superHeader]: bankHeader }
    const reverseMap: { [superHeader: string]: string } = {};
    Object.entries(mapping).forEach(([bankHeader, superHeader]) => {
      if (superHeader) reverseMap[superHeader] = bankHeader;
    });
    const mappedRow: TransactionRow = {};
    const txObj = tx as Record<string, any>;
    superHeader.forEach((sh) => {
      const bankHeader = reverseMap[sh];
      mappedRow[sh] = bankHeader ? txObj[bankHeader] || txObj[sh] || "" : txObj[sh] || "";
    });
    mappedRow.tags = txObj.tags || [];
    mappedRow.id = tx.id;
    return mappedRow;
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
    console.log('Adding tag:', selectedTagId, tagObj);
    console.log('Selected rows:', Array.from(selectedRows));
    try {
      await Promise.all(Array.from(selectedRows).map(async (idx) => {
        const row = filteredRows[idx];
        if (!row || !row.id) {
          console.log('No transaction id for row:', row);
          return;
        }
        const tx = transactions.find(t => t.id === row.id);
        if (!tx) {
          console.log('No matching transaction for id:', row.id);
          return;
        }
        const tags = Array.isArray(tx.tags) ? [...tx.tags] : [];
        if (!tags.some((t) => t.id === tagObj.id)) tags.push(tagObj);
        console.log('Updating transaction:', tx.id, 'with tags:', tags);
        await fetch('/api/transaction/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: tx.id, tags })
        });
      }));
      setTagSuccess('Tag added!');
      setSelectedTagId("");
      setSelectedRows(new Set());
      setTimeout(() => setTagSuccess(null), 1500);
      setLoading(true);
      fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTransactions(data);
          else setError(data.error || "Failed to fetch transactions");
        })
        .catch(() => setError("Failed to fetch transactions"))
        .finally(() => setLoading(false));
    } catch (e) {
      setTagError('Failed to add tag');
      console.log('Error adding tag:', e);
    } finally {
      setTagging(false);
    }
  };

  // Remove a tag from a transaction, with confirmation
  const handleRemoveTag = async (rowIdx: number, tagId: string) => {
    if (!window.confirm('Are you sure you want to remove this tag?')) return;
    const row = filteredRows[rowIdx];
    if (!row || !row.id) return;
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return;
    const tags = Array.isArray(tx.tags) ? tx.tags.filter((t) => t.id !== tagId) : [];
    await fetch('/api/transaction/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: tx.id, tags })
    });
    setTagCreateMsg('Tag removed!');
    setTimeout(() => setTagCreateMsg(null), 1500);
    setLoading(true);
    fetch("/api/transactions/all?userId=" + (localStorage.getItem("userId") || ""))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        else setError(data.error || "Failed to fetch transactions");
      })
      .catch(() => setError("Failed to fetch transactions"))
      .finally(() => setLoading(false));
  };

  // Filtered and searched rows (already present as filteredRows)
  // Summary stats for AnalyticsSummary
  const amountCol = superHeader.find(h => h.toLowerCase().includes('amount'));
  const typeCol = superHeader.find(h => ['type', 'txnType', 'drcr', 'credit/debit'].some(t => h.toLowerCase().includes(t)));
  const totalAmount = filteredRows.reduce((sum, row) => {
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return sum;
    const { amount } = evaluateConditions(tx as unknown as TransactionRow, tx.bankId);
    return sum + (typeof amount === 'number' && !isNaN(amount) ? amount : 0);
  }, 0).toLocaleString();

  // Calculate DR/CR totals for filteredRows
  let totalCredit = 0, totalDebit = 0;
  filteredRows.forEach(row => {
    const tx = transactions.find(t => t.id === row.id);
    if (!tx) return;
    const { amount, type } = evaluateConditions(tx as unknown as TransactionRow, tx.bankId);
    if (typeof amount === 'number' && !isNaN(amount)) {
      if (type === 'CR') totalCredit += Math.abs(amount);
      else if (type === 'DR') totalDebit += Math.abs(amount);
      else if (amount > 0) totalCredit += amount;
      else if (amount < 0) totalDebit += Math.abs(amount);
    }
  });
  const totalCreditStr = totalCredit ? totalCredit.toLocaleString() : undefined;
  const totalDebitStr = totalDebit ? totalDebit.toLocaleString() : undefined;

  let tagged = 0, untagged = 0;
  filteredRows.forEach(row => {
    const tags = (row['Tags'] || row['tags']) as Tag[] | undefined;
    if (Array.isArray(tags) && tags.length > 0) tagged++;
    else untagged++;
  });
  const totalTags = (() => {
    const tags = filteredRows.flatMap(row => Array.isArray(row.tags) ? row.tags : []);
    return new Set(tags.map(t => t.name)).size;
  })();

  // Automatically clear tagCreateMsg after 2 seconds
  useEffect(() => {
    if (tagCreateMsg) {
      const timeout = setTimeout(() => setTagCreateMsg(null), 2000);
      return () => clearTimeout(timeout);
    }
  }, [tagCreateMsg]);

  // Handler for column reordering
  const handleReorderHeaders = (newHeaders: string[]) => {
    setSuperHeader(newHeaders);
  };

  // Handler to apply tag to all matching transactions from context menu
  const handleApplyTagToAllFromMenu = (tagName: string) => {
    setPendingTag({ tagName, rowIdx: -1, selectionText: tagName });
    setTimeout(() => handleApplyTagToAll(), 0); // ensure pendingTag is set before running
  };

  // Compute tag statistics for filteredRows
  const tagStats: Record<string, number> = {};
  filteredRows.forEach(row => {
    if (Array.isArray(row.tags)) {
      row.tags.forEach(tag => {
        if (tag && tag.name) {
          tagStats[tag.name] = (tagStats[tag.name] || 0) + 1;
        }
      });
    }
  });

  // Sort allTags by usage count descending
  const sortedTags = [...allTags].sort((a, b) => (tagStats[b.name] || 0) - (tagStats[a.name] || 0));

  // New handleTagDeleted function
  const handleTagDeleted = () => {
    // Implementation of handleTagDeleted function
  };

  // Helper: get conditions for a bankId
  function getConditionsForBank(bankId: string) {
    return bankMappings[bankId]?.conditions || {};
  }
  // Helper: get amount for a row using conditions
  function getAmountForRow(row: TransactionRow, bankId: string): string | number | undefined {
    const conditions = getConditionsForBank(bankId);
    if (conditions && conditions.Amount && Array.isArray(conditions.Amount)) {
      for (const field of conditions.Amount) {
        const val = row[field];
        if (
          (typeof val === 'string' && val.trim() !== '') ||
          (typeof val === 'number' && !isNaN(val))
        ) {
          return val;
        }
      }
    }
    // fallback: use mapped 'Amount' field or undefined
    const fallback = row['Amount'];
    if ((typeof fallback === 'string' && fallback.trim() !== '') || (typeof fallback === 'number' && !isNaN(fallback))) {
      return fallback;
    }
    return undefined;
  }

  // Helper: evaluate conditions for a row and bankId
  function evaluateConditions(row: TransactionRow, bankId: string): { amount: number | undefined, type: string | undefined } {
    const rawConds = bankMappings[bankId]?.conditions;
    const conditions = Array.isArray(rawConds) ? rawConds : [];
    for (const cond of conditions) {
      const val = row[cond.if.field];
      if (
        (cond.if.op === 'present' && val && val.toString().trim() !== '') ||
        (cond.if.op === 'not_present' && (!val || val.toString().trim() === ''))
      ) {
        // Evaluate Amount (support -field for negative)
        let amount: number | undefined = undefined;
        if (typeof cond.then.Amount === 'string' && cond.then.Amount.startsWith('-')) {
          const field = cond.then.Amount.slice(1);
          const v = row[field];
          if (typeof v === 'string') amount = -parseFloat(v);
          else if (typeof v === 'number') amount = -v;
        } else if (typeof cond.then.Amount === 'string') {
          const v = row[cond.then.Amount];
          if (typeof v === 'string') amount = parseFloat(v);
          else if (typeof v === 'number') amount = v;
        }
        return { amount, type: cond.then.Type };
      }
    }
    return { amount: undefined, type: undefined };
  }

  // Helper: get value for any column using per-bank conditions
  function getValueForColumn(tx: Transaction, bankId: string, columnName: string) {
    const rawConds = bankMappings[bankId]?.conditions;
    const conditions = Array.isArray(rawConds) ? rawConds : [];
    for (const cond of conditions) {
      if (cond.then && cond.then[columnName] !== undefined) {
        const val = tx[cond.if.field];
        if (
          (cond.if.op === 'present' && val && val.toString().trim() !== '') ||
          (cond.if.op === 'not_present' && (!val || val.toString().trim() === ''))
        ) {
          let result = cond.then[columnName];
          if (typeof result === 'string' && tx[result] !== undefined) return tx[result];
          if (typeof result === 'string' && result.startsWith('-') && tx[result.slice(1)] !== undefined) {
            const v = tx[result.slice(1)];
            if (typeof v === 'string') return -parseFloat(v);
            if (typeof v === 'number') return -v;
          }
          return result;
        }
      }
    }
    // Fallback: mapped field or raw value
    return tx[columnName] !== undefined ? tx[columnName] : '';
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 px-2 sm:px-4">
      <div className="max-w-full sm:max-w-[75%] mx-auto">
        <div className="flex flex-row items-center justify-between gap-2 mb-4 sm:mb-6">
          <h1 className="text-base sm:text-2xl font-bold text-blue-700 truncate">Super Bank: All Transactions</h1>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow font-semibold text-sm sm:text-base whitespace-nowrap"
            onClick={() => setShowHeaderSection(true)}
          >
            Header
          </button>
        </div>
        {/* Super Bank Header Display and Edit - toggled by button */}
        {showHeaderSection && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg shadow relative">
            <button
              className="absolute top-2 right-2 text-blue-700 hover:text-blue-900 text-xl font-bold"
              onClick={() => setShowHeaderSection(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="font-bold text-blue-700 mb-2 text-sm sm:text-base">Super Bank Header</h2>
            <div className="mb-2 text-xs sm:text-sm text-gray-700">
              <span className="font-semibold">Current Header:</span>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                {superHeader.length > 0 ? (
                  superHeader.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full border border-blue-200 shadow text-xs font-medium"
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
              <form onSubmit={handleHeaderSave} className="flex flex-col gap-2 mt-3 sm:mt-4">
                <label className="block text-xs font-medium text-blue-700 mb-1">Edit Header Columns</label>
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center bg-white/70 p-2 sm:p-3 rounded border border-blue-100 shadow-sm">
                  {headerInputs.map((header, idx) => (
                    <div key={idx} className="relative group flex-1 min-w-[120px]">
                      <input
                        type="text"
                        value={header}
                        onChange={e => handleHeaderInputChange(idx, e.target.value)}
                        className="w-full rounded border border-blue-200 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50 w-full sm:w-auto"
                    disabled={headerLoading}
                  >
                    {headerLoading ? "Saving..." : "Save Header"}
                  </button>
                  <button
                    type="button"
                    className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-full sm:w-auto"
                    onClick={() => setHeaderEditing(false)}
                    disabled={headerLoading}
                  >
                    Cancel
                  </button>
                </div>
                {headerError && <div className="text-red-600 mt-2 text-sm">{headerError}</div>}
                {headerSuccess && <div className="text-green-600 mt-2 text-sm">{headerSuccess}</div>}
              </form>
            )}
          </div>
        )}
        {/* Analytics summary above controls */}
        {filteredRows.length > 0 && (
          <AnalyticsSummary
            totalTransactions={filteredRows.length}
            totalAmount={totalAmount}
            totalCredit={totalCreditStr}
            totalDebit={totalDebitStr}
            totalBanks={totalBanks}
            totalAccounts={totalAccounts}
            tagged={tagged}
            untagged={untagged}
            totalTags={totalTags}
            showAmount={!!amountCol}
            showTagStats={superHeader.some(h => h.toLowerCase() === 'tags')}
          />
        )}
        {/* Filter box below stats, wider on PC */}
        <TransactionFilterBar
          search={search}
          onSearchChange={setSearch}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onDownload={handleDownload}
          downloadDisabled={selectedRows.size === 0}
        />
        {/* Tag filter pills section below controls */}
        <TagFilterPills
          allTags={sortedTags}
          tagFilters={tagFilters}
          onToggleTag={tagName => setTagFilters(filters => filters.includes(tagName) ? filters.filter(t => t !== tagName) : [...filters, tagName])}
          onClear={() => setTagFilters([])}
          onTagDeleted={() => handleTagDeleted()}
          onApplyTagToAll={handleApplyTagToAllFromMenu}
          tagStats={tagStats}
        />
        {/* Tagging controls above table */}
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
            <div style={{ position: 'absolute', left: selection?.x, top: selection?.y !== undefined ? selection.y + 8 : 48, zIndex: 1001 }} className="bg-white border border-blue-200 rounded shadow-lg px-3 sm:px-4 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3 items-center">
              <span className="text-sm">Apply tag &quot;{pendingTag.tagName}&quot; to:</span>
              <div className="flex flex-col sm:flex-row gap-2">
                <button className="px-3 py-1 bg-green-600 text-white rounded font-semibold text-xs hover:bg-green-700" onClick={handleApplyTagToRow}>Only this transaction</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded font-semibold text-xs hover:bg-blue-700" onClick={handleApplyTagToAll}>All transactions with this text</button>
                <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded font-semibold text-xs hover:bg-gray-300" onClick={() => setPendingTag(null)}>Cancel</button>
              </div>
            </div>
          )}
          {tagCreateMsg && (
            <div className="absolute left-1/2 top-2 -translate-x-1/2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded shadow text-xs sm:text-sm z-50">
              {tagCreateMsg}
            </div>
          )}
          <TransactionTable
            rows={filteredRows}
            headers={superHeader}
            selectedRows={new Set(filteredRows.map((_, idx) => selectedRows.has(idx) ? idx : -1).filter(i => i !== -1))}
            selectAll={selectAll}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            loading={loading}
            error={error}
            onRemoveTag={handleRemoveTag}
            onReorderHeaders={handleReorderHeaders}
            transactions={transactions}
            bankMappings={bankMappings}
            getValueForColumn={getValueForColumn}
          />
        </div>
      </div>
    </div>
  );
} 
