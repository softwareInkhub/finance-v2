import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  s3FileUrl: string | null;
  statementId: string | null;
  bankId: string | null;
  accountId: string | null;
  fileName?: string;
}

interface Bank {
  id: string;
  bankName: string;
}

const SlicedPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: string[][];
  onSave: (duplicateCheckFields: string[]) => void;
  saving: boolean;
  saveError: string | null;
  startRow: number;
}> = ({ isOpen, onClose, data, onSave, saving, saveError }) => {
  const [selectedFields, setSelectedFields] = React.useState<string[]>(() =>
    data.length > 0 ? data[0].slice(0, 3) : [] // default: first 3 fields
  );
  useEffect(() => {
    if (data.length > 0) setSelectedFields(data[0].slice(0, 3));
  }, [data]);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sliced Transactions Preview">
      <div className="mb-2">
        <div className="font-semibold mb-1">Select fields to check for duplicate transactions:</div>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.length > 0 && data[0].map((header, idx) => (
            <label key={header + '-' + idx} className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedFields.includes(header + '-' + idx)}
                onChange={e => {
                  setSelectedFields(fields =>
                    e.target.checked
                      ? [...fields, header + '-' + idx]
                      : fields.filter(f => f !== header + '-' + idx)
                  );
                }}
              />
              {header}
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="min-w-full border text-sm">
          {data.length > 0 && (
            <thead>
              <tr>
                {data[0].map((cell, j) => (
                  <th key={j} className="border px-2 py-1 font-bold bg-gray-100">{cell}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data.slice(1).map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border px-2 py-1 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end mt-4 space-x-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          onClick={() => onSave(selectedFields)}
          disabled={saving || selectedFields.length === 0}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
      {saveError && <div className="text-red-600 mt-2">{saveError}</div>}
    </Modal>
  );
};

const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({ isOpen, onClose, s3FileUrl, statementId, bankId, accountId, fileName }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [showSliceModal, setShowSliceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectionStep, setSelectionStep] = useState<'header' | 'transactions'>('header');
  const [bankName, setBankName] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [duplicateCheckFields, setDuplicateCheckFields] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !s3FileUrl) return;
    setLoading(true);
    setError(null);
    setHeaderRow(null);
    setStartRow(null);
    setEndRow(null);
    setShowSliceModal(false);
    setSelectionStep('header');
    // Extract the key from the s3FileUrl (full path after .amazonaws.com/)
    const key = s3FileUrl.split('.amazonaws.com/')[1];
    if (!key) {
      setError('Invalid S3 file URL');
      setLoading(false);
      return;
    }
    fetch('/api/statement/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
      .then(res => res.json())
      .then(({ url, error }) => {
        if (error || !url) throw new Error(error || 'Failed to get presigned URL');
        return fetch(url);
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch CSV');
        return res.text();
      })
      .then(csvText => {
        const parsed = Papa.parse<string[]>(csvText, { skipEmptyLines: true });
        if (parsed.errors.length) throw new Error('Failed to parse CSV');
        setData(parsed.data as string[][]);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, s3FileUrl]);

  useEffect(() => {
    if (!bankId) return;
    fetch(`/api/bank`)
      .then(res => res.json())
      .then((banks) => {
        const bank = Array.isArray(banks) ? banks.find((b: Bank) => b.id === bankId) : null;
        setBankName(bank?.bankName || "");
      });
  }, [bankId]);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/account?accountId=${accountId}`)
      .then(res => res.json())
      .then((account) => {
        setAccountName(account?.accountName || account?.accountHolderName || "");
      });
  }, [accountId]);

  const handleSlice = () => {
    setShowSliceModal(true);
    setSaveError(null);
  };

  const handleSave = async (fields?: string[]) => {
    if (startRow === null || endRow === null || headerRow === null || !s3FileUrl || !statementId || !bankId || !accountId) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Remove 'Serial No' column from header and all rows (case-insensitive, trims whitespace)
      const baseHeader = data[headerRow];
      const serialIdx = baseHeader.findIndex(h => h.trim().toLowerCase() === 'serial no' || h.trim().toLowerCase() === 'sl. no.' || h.trim().toLowerCase() === 'sl. no' || h.trim().toLowerCase() === 's.no' || h.trim().toLowerCase() === 's. no');
      let filteredHeader = baseHeader;
      let filteredRows = data.slice(startRow, endRow + 1);
      if (serialIdx !== -1) {
        filteredHeader = baseHeader.filter((_, i) => i !== serialIdx);
        filteredRows = filteredRows.map(row => row.filter((_, i) => i !== serialIdx));
      }
      // Add columns for accountId, accountName, bankId, bankName
      const extraCols = ["accountId", "accountName", "bankId", "bankName"];
      const header = [...filteredHeader, ...extraCols];
      const rows = filteredRows.map(row => [...row, accountId, accountName, bankId, bankName]);
      const finalSliced = [header, ...rows];
      const csv = Papa.unparse(finalSliced);
      const dupFields = (fields || duplicateCheckFields).map(f => {
        // f is header + '-' + idx, so split and take the header
        const dashIdx = f.lastIndexOf('-');
        return dashIdx !== -1 ? f.slice(0, dashIdx) : f;
      });
      // Call API to save the sliced transaction
      const res = await fetch('/api/transaction/slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementId,
          bankId,
          accountId,
          csv,
          startRow,
          endRow,
          headerRow,
          fileName: fileName || '',
          userId: localStorage.getItem("userId") || "",
          bankName,
          accountName,
          duplicateCheckFields: dupFields,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save transaction slice');
      }
      setShowSliceModal(false);
      setStartRow(null);
      setEndRow(null);
      setHeaderRow(null);
      setSelectionStep('header');
      setDuplicateCheckFields([]);
      alert('Transaction slice saved successfully!');
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save transaction slice');
    } finally {
      setSaving(false);
    }
  };

  const handleHeaderSelect = (rowNumber: number) => {
    setHeaderRow(rowNumber);
    setSelectionStep('transactions');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Statement Preview">
        {selectionStep === 'header' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 1: Select Header Row</h3>
            <p className="text-blue-600">Please select the row that contains your column headers.</p>
          </div>
        )}
        {selectionStep === 'transactions' && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Step 2: Select Transaction Range</h3>
            <p className="text-green-600">Select the start and end rows for your transactions.</p>
            <div className="flex items-center gap-4 mt-2">
          <span className="inline-flex items-center gap-1 text-sm bg-blue-50 px-2 py-1 rounded">
            Start Row:
            <input
              type="number"
                  min={headerRow !== null ? headerRow + 1 : 1}
              max={data.length - 1}
              className="w-16 px-1 py-0.5 border rounded text-center outline-none focus:ring-2 focus:ring-blue-200"
              value={startRow !== null ? startRow : ''}
              placeholder="-"
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setStartRow(null);
                  setEndRow(null);
                } else {
                  const num = parseInt(val, 10);
                      if (!isNaN(num) && num > (headerRow || 0) && num <= data.length - 1) {
                    setStartRow(num);
                    if (endRow !== null && endRow < num) setEndRow(null);
                  }
                }
              }}
            />
          </span>
          <span className="inline-flex items-center gap-1 text-sm bg-yellow-50 px-2 py-1 rounded">
            End Row:
            <input
              type="number"
                  min={startRow !== null ? startRow + 1 : headerRow !== null ? headerRow + 2 : 2}
              max={data.length - 1}
              className="w-16 px-1 py-0.5 border rounded text-center outline-none focus:ring-2 focus:ring-yellow-200"
              value={endRow !== null ? endRow : ''}
              placeholder="-"
              onChange={e => {
                const val = e.target.value;
                if (val === '') {
                  setEndRow(null);
                } else {
                  const num = parseInt(val, 10);
                  if (
                    !isNaN(num) &&
                    startRow !== null &&
                    num > startRow &&
                    num <= data.length - 1
                  ) {
                    setEndRow(num);
                  }
                }
              }}
              disabled={startRow === null}
            />
          </span>
        </div>
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border text-sm">
              <tbody>
                {data.map((row, i) => {
                  const rowNumber = i;
                  const isHeader = headerRow === rowNumber;
                  const isInSlice =
                    startRow !== null && endRow !== null && rowNumber >= startRow && rowNumber <= endRow;
                  const isStart = startRow !== null && rowNumber === startRow;
                  const isEnd = endRow !== null && rowNumber === endRow;
                  return (
                    <tr
                      key={i}
                      className={
                        isHeader
                          ? 'bg-purple-100 border-l-4 border-purple-500'
                          : isStart
                          ? 'bg-green-100 border-l-4 border-green-500'
                          : isEnd
                          ? 'bg-yellow-100 border-r-4 border-yellow-500'
                          : isInSlice
                          ? 'bg-blue-100'
                          : hoveredRow === rowNumber
                          ? 'bg-gray-100'
                          : ''
                      }
                      onMouseEnter={() => setHoveredRow(rowNumber)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {row.map((cell, j) => (
                        <td key={j} className="border px-2 py-1 whitespace-nowrap relative">
                          {cell}
                          {/* Header selection */}
                          {selectionStep === 'header' && hoveredRow === rowNumber && j === 0 && (
                            <button
                              className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs"
                              onClick={() => handleHeaderSelect(rowNumber)}
                            >
                              Select as Header
                            </button>
                          )}
                          {/* Start/End badges */}
                          {isHeader && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-purple-500 text-white rounded text-xs">Header</span>
                          )}
                          {isStart && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs">Start</span>
                          )}
                          {isEnd && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs">End</span>
                          )}
                          {selectionStep === 'transactions' && hoveredRow === rowNumber && startRow === null && j === 0 && rowNumber > (headerRow || 0) && (
                            <button
                              className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs"
                              onClick={() => setStartRow(rowNumber)}
                            >
                              Start
                            </button>
                          )}
                          {selectionStep === 'transactions' && hoveredRow === rowNumber && startRow !== null && endRow === null && rowNumber > startRow && j === 0 && (
                            <button
                              className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                              onClick={() => setEndRow(rowNumber)}
                            >
                              End
                            </button>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {selectionStep === 'transactions' && (
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={startRow === null || endRow === null}
                onClick={handleSlice}
              >
                Slice
              </button>
            </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500">No data to display.</div>
        )}
      </Modal>
      {showSliceModal && startRow !== null && endRow !== null && headerRow !== null && (
        <SlicedPreviewModal
          isOpen={showSliceModal}
          onClose={() => setShowSliceModal(false)}
          data={[data[headerRow], ...data.slice(startRow, endRow + 1)]}
          startRow={startRow}
          onSave={fields => { setDuplicateCheckFields(fields); handleSave(fields); }}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  );
};

export default StatementPreviewModal; 