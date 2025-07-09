import React from 'react';
import { FiDownload } from 'react-icons/fi';

type SortOrderType = 'asc' | 'desc' | 'tagged' | 'untagged';

interface TransactionFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onDownload: () => void;
  downloadDisabled?: boolean;
  searchField?: string;
  onSearchFieldChange?: (v: string) => void;
  searchFieldOptions?: string[];
  sortOrder?: SortOrderType;
  onSortOrderChange?: (order: SortOrderType) => void;
  sortOrderOptions?: { value: SortOrderType; label: string }[];
}

const TransactionFilterBar: React.FC<TransactionFilterBarProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onDownload,
  downloadDisabled,
  searchField,
  onSearchFieldChange,
  searchFieldOptions,
  sortOrder = 'desc',
  onSortOrderChange,
  sortOrderOptions,
}) => (
  <div className="w-full max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2 mb-4">
    {/* Row 1: Search, Field Select, Sort Select */}
    <div className="flex flex-row gap-2 w-full overflow-x-auto pb-1">
      <input
        type="text"
        placeholder="Search..."
        className="border px-3 py-2 rounded shadow-sm text-sm flex-1 min-w-[120px] h-10"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
      />
      {searchFieldOptions && onSearchFieldChange && (
        <select
          value={searchField}
          onChange={e => onSearchFieldChange(e.target.value)}
          className="border px-2 py-2 rounded text-sm h-10 min-w-[90px]"
        >
          {searchFieldOptions.map(opt => (
            <option key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</option>
          ))}
        </select>
      )}
      {onSortOrderChange && (
        <select
          value={sortOrder}
          onChange={e => onSortOrderChange(e.target.value as SortOrderType)}
          className="border px-2 py-2 rounded text-sm h-10 min-w-[120px]"
        >
          {(typeof sortOrderOptions !== 'undefined' ? sortOrderOptions : [
            { value: 'desc', label: 'Latest First' },
            { value: 'asc', label: 'Oldest First' },
          ]).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
    {/* Row 2: Date Pickers and Download Button */}
    <div className="flex flex-row gap-2 w-full items-center">
      <div className="flex flex-1 gap-2">
        <input
          type="date"
          className="border px-3 py-2 rounded shadow-sm text-sm flex-1 min-w-[120px] h-10"
          value={dateRange.from}
          onChange={e => onDateRangeChange({ ...dateRange, from: e.target.value })}
          placeholder="From"
        />
        <input
          type="date"
          className="border px-3 py-2 rounded shadow-sm text-sm flex-1 min-w-[120px] h-10"
          value={dateRange.to}
          onChange={e => onDateRangeChange({ ...dateRange, to: e.target.value })}
          placeholder="To"
        />
      </div>
      <button
        className="flex items-center justify-center bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white rounded shadow font-semibold px-3 py-2 text-lg whitespace-nowrap h-10 min-w-[44px] ml-auto"
        onClick={onDownload}
        disabled={downloadDisabled}
        title="Download"
        style={{ minHeight: '2.5rem' }}
      >
        <span className="block sm:hidden"><FiDownload size={20} /></span>
        <span className="hidden sm:flex items-center gap-2">
          <FiDownload size={18} />
        </span>
      </button>
    </div>
  </div>
);

export default TransactionFilterBar; 