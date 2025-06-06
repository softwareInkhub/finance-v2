import React from 'react';

interface AnalyticsSummaryProps {
  totalTransactions: number;
  totalAmount?: string | number;
  totalBanks: number;
  totalAccounts: number;
  tagged?: number;
  untagged?: number;
  totalTags?: number;
  showAmount?: boolean;
  showTagStats?: boolean;
}

const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  totalTransactions,
  totalAmount,
  totalBanks,
  totalAccounts,
  tagged,
  untagged,
  totalTags,
  showAmount = true,
  showTagStats = false,
}) => (
  <div className="flex flex-wrap gap-2 sm:gap-4 justify-center mb-4">
    <div className="px-3 sm:px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
      Total Transactions: {totalTransactions}
    </div>
    {showAmount && (
      <div className="px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
        Total Amount: {totalAmount}
      </div>
    )}
    <div className="px-3 sm:px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
      Total Banks: {totalBanks}
    </div>
    <div className="px-3 sm:px-4 py-2 bg-pink-100 text-pink-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
      Total Accounts: {totalAccounts}
    </div>
    {showTagStats && (
      <>
        <div className="px-3 sm:px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
          Tagged: {tagged}
        </div>
        <div className="px-3 sm:px-4 py-2 bg-orange-100 text-orange-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
          Untagged: {untagged}
        </div>
        <div className="px-3 sm:px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-semibold shadow text-xs sm:text-sm">
          Total Tags: {totalTags}
        </div>
      </>
    )}
  </div>
);

export default AnalyticsSummary; 