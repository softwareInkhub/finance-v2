import React from 'react';
import { FiDownload } from 'react-icons/fi';

interface TransactionFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onDownload: () => void;
  downloadDisabled?: boolean;
}

const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onDownload,
  downloadDisabled,
}) => (
  <div className="w-full max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-3 flex flex-col gap-3 mb-4">
    <div className="flex flex-col md:flex-row gap-2">
      <input
        type="text"
        placeholder="Search..."
        className="border px-3 py-2 rounded shadow-sm text-sm flex-1 h-10"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      <div className="flex flex-col flex-1">
        <label className="text-xs text-gray-500 mb-1 md:mb-0 md:sr-only">From</label>
        <input
          type="date"
          className="border px-3 py-2 rounded shadow-sm text-sm w-full h-10"
          value={dateRange.from}
          onChange={e => onDateRangeChange({ ...dateRange, from: e.target.value })}
          placeholder="From"
        />
      </div>
      <div className="flex flex-col flex-1">
        <label className="text-xs text-gray-500 mb-1 md:mb-0 md:sr-only">To</label>
        <input
          type="date"
          className="border px-3 py-2 rounded shadow-sm text-sm w-full h-10"
          value={dateRange.to}
          onChange={e => onDateRangeChange({ ...dateRange, to: e.target.value })}
          placeholder="To"
        />
      </div>
      <button
        className="flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded shadow font-semibold px-3 py-2 text-lg whitespace-nowrap h-10 min-w-[44px]"
        onClick={onDownload}
        disabled={downloadDisabled}
        title="Download"
        style={{ minHeight: '2.5rem' }}
      >
        <span className="block sm:hidden"><FiDownload size={20} /></span>
        <span className="hidden sm:flex items-center gap-2">
          <FiDownload size={18} /> Download
        </span>
      </button>
    </div>
  </div>
);

export default TransactionFilterBar; 