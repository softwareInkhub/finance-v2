'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Modal from '../../components/Modals/Modal';
import { RiAccountPinCircleLine, RiAddLine, RiPriceTag3Line, RiEdit2Line } from 'react-icons/ri';

interface Account {
  id: string;
  bankId: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  tags: string[];
}

interface AccountsPageProps {
  bankId?: string;
  onAccountClick?: (account: Account, bankId: string) => void;
}

interface Condition {
  if: {
    field: string;
    op: 'present' | 'not_present';
  };
  then: {
    [key: string]: string;
  };
}

type ConditionOp = 'present' | 'not_present';

interface NewCondition {
  ifField: string;
  ifOp: ConditionOp;
  thenAmount: string;
  thenType: string;
}

export default function AccountsPage({ bankId: propBankId, onAccountClick }: AccountsPageProps) {
  const searchParams = useSearchParams();
  const bankId = propBankId || searchParams.get('bankId');
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
  const [bankName, setBankName] = useState<string>("");

  // --- HEADER STATE AND EFFECTS ---
  const [bankHeader, setBankHeader] = useState<string[]>([]);
  const [headerInputs, setHeaderInputs] = useState<string[]>([]);
  const [headerLoading, setHeaderLoading] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerSuccess, setHeaderSuccess] = useState<string | null>(null);
  const [headerEditing, setHeaderEditing] = useState(false);

  // Fetch bank name
  useEffect(() => {
    if (!bankId) return;
    fetch(`/api/bank`)
      .then(res => res.json())
      .then((banks: { id: string; bankName: string }[]) => {
        const bank = Array.isArray(banks) ? banks.find((b) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
  }, [bankId]);

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!bankId) return;
      try {
        setError(null);
        const userId = localStorage.getItem("userId") || "";
        const res = await fetch(`/api/account?bankId=${bankId}&userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const data = await res.json();
        setAccounts(data);
      } catch {
        setError("Failed to fetch accounts");
      }
    };
    fetchAccounts();
  }, [bankId]);

  // Fetch bank header
  useEffect(() => {
    if (!bankId || !bankName) return;
    setHeaderLoading(true);
    setHeaderError(null);
    setHeaderSuccess(null);
    fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.header)) {
          setBankHeader(data.header);
          setHeaderInputs(data.header);
        } else {
          setBankHeader([]);
          setHeaderInputs([]);
        }
      })
      .catch(() => setHeaderError("Failed to fetch bank header"))
      .finally(() => setHeaderLoading(false));
  }, [bankId, bankName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId) return;
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
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
          userId: localStorage.getItem("userId") || ""
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
        body: JSON.stringify({ bankName, bankId, header: headerArr })
      });
      if (!res.ok) throw new Error("Failed to save header");
      setBankHeader(headerArr);
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

  // --- MAPPING STATE AND EFFECTS ---
  const [showMapping, setShowMapping] = useState(false);
  const [superHeaders, setSuperHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccess, setMappingSuccess] = useState<string | null>(null);

  // Fetch Super Bank header for mapping
  useEffect(() => {
    fetch(`/api/bank-header?bankName=SUPER%20BANK`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.header)) setSuperHeaders(data.header);
        else setSuperHeaders([]);
      });
  }, []);

  // Fetch mapping and conditions if present
  useEffect(() => {
    if (!bankId || !bankName) return;
    fetch(`/api/bank-header?bankName=${encodeURIComponent(bankName)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.mapping) setMapping(data.mapping);
        else setMapping({});
        if (data && data.conditions && Array.isArray(data.conditions)) setConditions(data.conditions);
        else setConditions([]);
      });
  }, [bankId, bankName]);

  // --- Condition UI helpers ---
  const [newCond, setNewCond] = useState<NewCondition>({
    ifField: '',
    ifOp: 'present',
    thenAmount: '',
    thenType: 'CR',
  });

  function addCondition() {
    if (!newCond.ifField || !newCond.thenAmount) return;
    const condition: Condition = {
      if: { field: newCond.ifField, op: newCond.ifOp },
      then: { Amount: newCond.thenAmount, Type: newCond.thenType }
    };
    setConditions(prev => [...prev, condition]);
    setNewCond({
      ifField: '',
      ifOp: 'present',
      thenAmount: '',
      thenType: 'CR',
    });
  }

  function removeCondition(idx: number) {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  }

  const handleConditionChange = (idx: number, field: string, value: string) => {
    setConditions(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      if (field === 'op') {
        return {
          ...c,
          if: {
            ...c.if,
            op: value as ConditionOp
          }
        };
      }
      if (field === 'field') {
        return {
          ...c,
          if: {
            ...c.if,
            field: value
          }
        };
      }
      return {
        ...c,
        then: {
          ...c.then,
          [field]: value
        }
      };
    }));
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setMappingLoading(true);
    setMappingError(null);
    setMappingSuccess(null);
    try {
      const res = await fetch('/api/bank-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, bankId, header: bankHeader, mapping, conditions }),
      });
      if (!res.ok) throw new Error('Failed to save mapping');
      setMappingSuccess('Mapping saved!');
      setShowMapping(false);
    } catch {
      setMappingError('Failed to save mapping');
    } finally {
      setMappingLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 px-3 sm:px-4 space-y-6 sm:space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="text-sm mb-4 flex items-center gap-2 text-gray-600">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/pages/banks" className="hover:underline">Banks</Link>
        <span>/</span>
        {bankId ? (
          <span className="font-semibold">{bankName || 'Bank'}</span>
        ) : (
          <span>Bank</span>
        )}
        <span>/</span>
        <span className="font-semibold text-blue-700">Accounts</span>
      </nav>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-row justify-between items-center gap-2 sm:gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-500 text-xl sm:text-2xl shadow">
              <RiAccountPinCircleLine />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Accounts</h1>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-5 py-2 rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold w-auto"
          >
            <RiAddLine className="text-lg sm:text-xl" />
            <span className="block sm:hidden">Add</span>
            <span className="hidden sm:block">Add Account</span>
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
        {/* HEADER SECTION - place this before the accounts grid */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow relative">
          <h2 className="font-bold text-blue-700 mb-2">Bank Statement Header</h2>
          <div className="absolute top-4 right-4 flex gap-2">
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
            <button
              type="button"
              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
              onClick={() => setShowMapping(true)}
              aria-label="Map Header"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" /></svg>
            </button>
          </div>
          {headerLoading ? (
            <div className="text-gray-500">Loading header...</div>
          ) : (
            <>
              <div className="mb-2 text-sm text-gray-700">
                <span className="font-semibold">Current Header:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {bankHeader.length > 0 ? (
                    bankHeader.map((col, idx) => (
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
          {showMapping && (
            <Modal isOpen={showMapping} onClose={() => setShowMapping(false)} title={`Map to Super Bank Header`}>
              <form onSubmit={handleSaveMapping} className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="font-semibold text-blue-700">Advanced Amount/Type Conditions</div>
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-white border border-blue-100 rounded px-2 py-1 text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span>If</span>
                        <select value={cond.if.field} onChange={e => handleConditionChange(idx, 'field', e.target.value)}>
                          <option value="">Select field</option>
                          {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                        </select>
                        <select value={cond.if.op} onChange={e => handleConditionChange(idx, 'op', e.target.value)}>
                          <option value="present">is present</option>
                          <option value="not_present">is not present</option>
                        </select>
                        <span>then</span>
                        {Object.entries(cond.then).map(([field, value], pairIdx) => (
                          <span key={pairIdx} className="flex items-center gap-1">
                            <select
                              value={field}
                              onChange={e => {
                                const newField = e.target.value;
                                handleConditionChange(idx, field, newField);
                              }}
                            >
                              <option value="">Select field</option>
                              {superHeaders.map((sh, i) => <option key={i} value={sh}>{sh}</option>)}
                            </select>
                            <span>=</span>
                            <input
                              type="text"
                              value={value as string}
                              onChange={e => {
                                const newValue = e.target.value;
                                handleConditionChange(idx, field, newValue);
                              }}
                              className="border rounded px-1 w-24"
                              placeholder="Value or field ref"
                            />
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            handleConditionChange(idx, 'Amount', '');
                            handleConditionChange(idx, 'Type', 'CR');
                          }}
                          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
                        >
                          Add field
                        </button>
                        <button type="button" onClick={() => removeCondition(idx)} className="ml-2 text-red-500">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 mt-2">
                    <span>If</span>
                    <select value={newCond.ifField} onChange={e => setNewCond(nc => ({ ...nc, ifField: e.target.value }))}>
                      <option value="">Select field</option>
                      {bankHeader.map((bh, i) => <option key={i} value={bh}>{bh}</option>)}
                    </select>
                    <select value={newCond.ifOp} onChange={e => setNewCond(prev => ({ 
                      ...prev, 
                      ifOp: e.target.value as ConditionOp 
                    }))}
                    >
                      <option value="present">is present</option>
                      <option value="not_present">is not present</option>
                    </select>
                    <span>then Amount =</span>
                    <input type="text" value={newCond.thenAmount} onChange={e => setNewCond(nc => ({ ...nc, thenAmount: e.target.value }))} className="border rounded px-1 w-24" placeholder="e.g. Deposit Amt. or -Withdrawal Amt." />
                    <span>, Type =</span>
                    <select value={newCond.thenType} onChange={e => setNewCond(nc => ({ ...nc, thenType: e.target.value }))}>
                      <option value="CR">CR</option>
                      <option value="DR">DR</option>
                    </select>
                    <button type="button" onClick={addCondition} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded">Add</button>
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  {bankHeader.map((bh, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="min-w-[120px] px-2 py-1 bg-blue-100 rounded text-blue-700 text-xs font-medium border border-blue-200">{bh}</span>
                      <span className="text-gray-500">→</span>
                      <select
                        className="rounded border px-2 py-1 text-sm"
                        value={mapping[bh] || ''}
                        onChange={e => setMapping(m => ({ ...m, [bh]: e.target.value }))}
                      >
                        <option value="">Ignore</option>
                        {superHeaders.map((sh, i) => (
                          <option key={i} value={sh}>{sh}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow hover:scale-[1.02] hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                    disabled={mappingLoading}
                  >
                    {mappingLoading ? 'Saving...' : 'Save Mapping'}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg shadow hover:bg-gray-300 transition-all font-semibold w-fit"
                    onClick={() => setShowMapping(false)}
                    disabled={mappingLoading}
                  >
                    Cancel
                  </button>
                </div>
                {mappingError && <div className="text-red-600 mt-2">{mappingError}</div>}
                {mappingSuccess && <div className="text-green-600 mt-2">{mappingSuccess}</div>}
              </form>
            </Modal>
          )}
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
                onClick={() => onAccountClick?.(account, bankId as string)}
                className="cursor-pointer relative bg-white/70 backdrop-blur-lg p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl group overflow-hidden"
              >
                <div className="absolute top-4 right-4 opacity-5 text-blue-500 text-4xl sm:text-5xl pointer-events-none select-none rotate-12">
                  <RiAccountPinCircleLine />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="bg-blue-100 p-2 rounded-full text-blue-500 text-lg sm:text-xl shadow">
                    <RiAccountPinCircleLine />
                  </span>
                  {account.accountHolderName}
                </h3>
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                  {account.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs rounded-full shadow border border-blue-200 font-medium"
                    >
                      <RiPriceTag3Line className="text-blue-400" /> {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
