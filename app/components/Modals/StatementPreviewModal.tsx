import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  s3FileUrl: string | null;
  statementId?: string;
}

const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({ isOpen, onClose, s3FileUrl, statementId }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState<number | null>(null);
  const [txStart, setTxStart] = useState<number | null>(null);
  const [txEnd, setTxEnd] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !s3FileUrl) return;
    setLoading(true);
    setError(null);
    setHeaderRow(null);
    setTxStart(null);
    setTxEnd(null);
    setSaveMsg(null);
    // Extract the key from the s3FileUrl (filename at the end)
    const key = s3FileUrl.split('/').pop();
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

  const handleHeaderSelect = (rowIdx: number | string) => {
    const idx = Number(rowIdx);
    setHeaderRow(idx);
    if (txStart !== null && Number(txStart) <= idx) setTxStart(null);
    if (txEnd !== null && Number(txEnd) <= idx) setTxEnd(null);
  };
  const handleTxStart = (rowIdx: number | string) => {
    const idx = Number(rowIdx);
    setTxStart(idx);
    if (txEnd !== null && Number(txEnd) < idx) setTxEnd(null);
  };
  const handleTxEnd = (rowIdx: number | string) => {
    const idx = Number(rowIdx);
    setTxEnd(idx);
    if (txStart !== null && Number(txStart) > idx) setTxStart(null);
  };

  const isTxRow = (i: number) => {
    if (txStart === null || txEnd === null) return false;
    return i >= txStart && i <= txEnd;
  };

  const isValidSelection =
    headerRow !== null &&
    txStart !== null &&
    txEnd !== null &&
    txStart > headerRow &&
    txEnd >= txStart;

  const handleSave = async () => {
    if (!isValidSelection || !statementId) {
      setSaveMsg('Please select a header row and a valid transaction range.');
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/statement/${statementId}/header`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerRowIndex: headerRow,
          transactionStartIndex: txStart,
          transactionEndIndex: txEnd,
        }),
      });
      if (!res.ok) throw new Error('Failed to save selection');
      setSaveMsg('Selection saved!');
    } catch (err) {
      setSaveMsg('Failed to save selection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statement Preview">
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : data.length > 0 ? (
        <>
          <div className="overflow-x-auto max-h-[60vh] mb-4">
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th>Header</th>
                  <th>Tx Start</th>
                  <th>Tx End</th>
                  {data[0].map((header, i) => (
                    <th key={i} className="border px-2 py-1 font-bold bg-gray-100">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={isTxRow(i) ? 'bg-blue-50' : ''}>
                    <td>
                      <input
                        type="radio"
                        name="headerRow"
                        checked={headerRow === i}
                        onChange={() => handleHeaderSelect(i)}
                        title="Mark as header row"
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="txStart"
                        checked={txStart === i}
                        onChange={() => handleTxStart(i)}
                        title="Mark as transaction start"
                        disabled={headerRow === null || i <= headerRow}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="txEnd"
                        checked={txEnd === i}
                        onChange={() => handleTxEnd(i)}
                        title="Mark as transaction end"
                        disabled={txStart === null || i < txStart}
                      />
                    </td>
                    {row.map((cell, j) => (
                      <td key={j} className="border px-2 py-1 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-500 mb-2">
            <strong>Debug:</strong> headerRow={String(headerRow)}, txStart={String(txStart)}, txEnd={String(txEnd)}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={saving || !isValidSelection}
            >
              {saving ? 'Saving...' : 'Save Selection'}
            </button>
            {saveMsg && <span className={saveMsg.includes('saved') ? 'text-green-600' : 'text-red-600'}>{saveMsg}</span>}
            {!isValidSelection && (
              <span className="text-red-600">Please select a header row and a valid transaction range.</span>
            )}
          </div>
        </>
      ) : (
        <div className="text-gray-500">No data to display.</div>
      )}
    </Modal>
  );
};

export default StatementPreviewModal; 