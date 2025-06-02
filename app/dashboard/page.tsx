'use client';

import {
  RiBankLine, RiAccountPinCircleLine, RiFileList3Line, RiExchangeDollarLine,
  RiTimeLine, RiUpload2Line
} from 'react-icons/ri';
import { ReactNode, useEffect, useState } from 'react';

function SummaryCard({ icon, label, value, color = 'blue' }: { icon: ReactNode; label: string; value: string | number; color?: string }) {
  const iconBg = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }[color];
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-xl transition group">
      <div className="flex items-center gap-4">
        <div className={`text-3xl p-3 rounded-full ${iconBg} shadow group-hover:scale-110 transition`}>{icon}</div>
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-3xl font-extrabold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 flex flex-col items-center shadow-inner">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
    </div>
  );
}

function TagList({ tags }: { tags: { id: number | string; name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map(tag => (
        <span key={tag.id} className="px-3 py-1 rounded-full text-xs font-semibold shadow-sm" style={{ background: tag.color, color: '#222' }}>
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-md border border-gray-100 p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {action && <a href="#" className="text-blue-600 text-sm font-medium hover:underline">{action}</a>}
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  // Fetch banks on mount
  useEffect(() => {
    fetch('/api/bank')
      .then(res => res.json())
      .then(data => {
        setBanks(Array.isArray(data) ? data : []);
      })
      .catch(e => { setBanks([]); });
  }, []);

  // Fetch accounts after banks
  useEffect(() => {
    if (banks.length > 0) {
      fetch(`/api/account?bankId=${banks[0].id}`)
        .then(res => res.json())
        .then(data => {
          setAccounts(Array.isArray(data) ? data : []);
        })
        .catch(e => { setAccounts([]); });
    }
  }, [banks]);

  // Fetch statements and transactions after accounts
  useEffect(() => {
    if (accounts.length > 0) {
      // Fetch all statements for all accounts
      Promise.all(
        accounts.map(acc =>
          fetch(`/api/statements?accountId=${acc.id}`)
            .then(res => res.json())
            .then(data => Array.isArray(data) ? data : [])
        )
      ).then(allStatements => {
        setStatements(allStatements.flat());
      });
      // Fetch all transactions for all accounts
      Promise.all(
        accounts.map(acc =>
          fetch(`/api/transactions?accountId=${acc.id}`)
            .then(res => res.json())
            .then(data => Array.isArray(data) ? data : [])
        )
      ).then(allTransactions => {
        setTransactions(allTransactions.flat());
      });
    }
  }, [accounts]);

  // Fetch tags
  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => {
        setTags(Array.isArray(data) ? data : []);
      })
      .catch(e => { setTags([]); });
  }, []);

  return (
    <div className="space-y-8 px-2 md:px-8 py-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard icon={<RiBankLine />} label="Total Banks" value={banks.length} color="blue" />
        <SummaryCard icon={<RiAccountPinCircleLine />} label="Total Accounts" value={accounts.length} color="green" />
        <SummaryCard icon={<RiFileList3Line />} label="Total Statements" value={statements.length} color="purple" />
        <SummaryCard icon={<RiExchangeDollarLine />} label="Total Transactions" value={transactions.length} color="orange" />
      </div>

      {/* Main panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Management */}
        <Panel title="Account Management" action="Manage Accounts">
          <div className="grid grid-cols-2 gap-6 mb-4">
            <StatCard label="Active Accounts" value={accounts.filter(a => a.active).length} />
            <StatCard label="Inactive Accounts" value={accounts.filter(a => !a.active).length} />
          </div>
          <div className="divide-y divide-gray-100">
            {accounts.slice(0, 3).map(acc => (
              <div key={acc.id} className="flex items-center gap-3 py-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-medium text-gray-800">{acc.name}</span>
                <span className="ml-auto text-gray-500">{acc.bankName}</span>
                <span className="ml-4 text-gray-700 font-semibold">{acc.balance}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Tag Management */}
        <Panel title="Tag Management" action="Manage Tags">
          <div className="mb-2">
            <StatCard label="Total Tags" value={tags.length} />
          </div>
          <TagList tags={tags.slice(0, 5)} />
        </Panel>
      </div>

      {/* Statement Management */}
      <Panel title="Statement Management" action="Upload Statement">
        <div className="grid grid-cols-2 gap-6 mb-4">
          <StatCard label="Statements Uploaded" value={statements.length} />
          <StatCard label="Last Upload" value={statements[0]?.uploadedAt ? new Date(statements[0].uploadedAt).toLocaleDateString() : '-'} />
        </div>
        {statements[0] && (
          <div className="flex items-center gap-3 text-sm mt-2">
            <RiUpload2Line className="text-blue-500" />
            <span className="font-medium text-gray-800 underline cursor-pointer hover:text-blue-700 transition">{statements[0].fileName}</span>
            <span className="ml-auto text-gray-400">Uploaded {statements[0].uploadedAt ? new Date(statements[0].uploadedAt).toLocaleDateString() : '-'}</span>
            <button className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200 transition">Download</button>
          </div>
        )}
      </Panel>

      {/* Recent Activity */}
      <Panel title="Recent Activity">
        <div className="space-y-2 text-sm text-gray-700">
          {/* Map your real activity data here */}
        </div>
      </Panel>
    </div>
  );
}
