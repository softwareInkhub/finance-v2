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
}

const SlicedPreviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: string[][];
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  startRow: number;
}> = ({ isOpen, onClose, data, onSave, saving, saveError }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Sliced Transactions Preview">
    <div className="overflow-x-auto max-h-[70vh]">
      <table className="min-w-full border text-sm">
        <tbody>
          {data.map((row, i) => (
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
        onClick={onSave}
        disabled={saving}
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

const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({ isOpen, onClose, s3FileUrl, statementId, bankId, accountId }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [startRow, setStartRow] = useState<number | null>(null);
  const [endRow, setEndRow] = useState<number | null>(null);
  const [showSliceModal, setShowSliceModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !s3FileUrl) return;
    setLoading(true);
    setError(null);
    setStartRow(null);
    setEndRow(null);
    setShowSliceModal(false);
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

  const handleSlice = () => {
    setShowSliceModal(true);
    setSaveError(null);
  };
  const handleSave = async () => {
    if (startRow === null || endRow === null || !s3FileUrl || !statementId || !bankId || !accountId) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Prepare sliced data as CSV
      const sliced = [data[0], ...data.slice(startRow, endRow + 1)];
      const csv = Papa.unparse(sliced);
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
          endRow
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save transaction slice');
      }
      setShowSliceModal(false);
      setStartRow(null);
      setEndRow(null);
      alert('Transaction slice saved successfully!');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Statement Preview">
        {/* Show editable Start/End row inputs */}
        <div className="flex items-center gap-4 mb-2">
          <span className="inline-flex items-center gap-1 text-sm bg-blue-50 px-2 py-1 rounded">
            Start Row:
            <input
              type="number"
              min={1}
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
                  if (!isNaN(num) && num >= 1 && num <= data.length - 1) {
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
              min={startRow !== null ? startRow + 1 : 2}
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
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : data.length > 0 ? (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  {data[0].map((header, i) => (
                    <th key={i} className="border px-2 py-1 font-bold bg-gray-100">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(1).map((row, i) => {
                  const rowNumber = i + 1;
                  const isInSlice =
                    startRow !== null && endRow !== null && rowNumber >= startRow && rowNumber <= endRow;
                  const isStart = startRow !== null && rowNumber === startRow;
                  const isEnd = endRow !== null && rowNumber === endRow;
                  return (
                    <tr
                      key={i}
                      className={
                        isStart
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
                          {/* Start/End badges */}
                          {isStart && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs">Start</span>
                          )}
                          {isEnd && j === 0 && (
                            <span className="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs">End</span>
                          )}
                          {hoveredRow === rowNumber && startRow === null && j === 0 && (
                            <button
                              className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs"
                              onClick={() => setStartRow(rowNumber)}
                            >
                              Start
                            </button>
                          )}
                          {hoveredRow === rowNumber && startRow !== null && endRow === null && rowNumber > startRow && j === 0 && (
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
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={startRow === null || endRow === null}
                onClick={handleSlice}
              >
                Slice
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No data to display.</div>
        )}
      </Modal>
      {showSliceModal && startRow !== null && endRow !== null && (
        <SlicedPreviewModal
          isOpen={showSliceModal}
          onClose={() => setShowSliceModal(false)}
          data={data.slice(startRow, endRow + 1)}
          startRow={startRow}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      )}
    </>
  );
};

export default StatementPreviewModal; 