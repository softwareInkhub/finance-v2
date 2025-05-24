import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

interface TransactionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  s3FileUrl: string | null;
  transactionId: string | null;
}

const TransactionPreviewModal: React.FC<TransactionPreviewModalProps> = ({ isOpen, onClose, s3FileUrl, transactionId }) => {
  const [data, setData] = useState<string[][]>([]);
  const [filteredData, setFilteredData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !s3FileUrl) return;
    setLoading(true);
    setError(null);
    setSearch('');
    setSelectedRows(new Set());
    setSelectAll(false);
    setTagInput('');
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
        let parsedData = parsed.data as string[][];
        // Ensure a Tag column exists
        if (parsedData.length && parsedData[0][parsedData[0].length - 1] !== 'Tags') {
          parsedData[0].push('Tags');
          for (let i = 1; i < parsedData.length; ++i) parsedData[i].push('');
        }
        setData(parsedData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, s3FileUrl]);

  // Filtering and search
  useEffect(() => {
    if (!data.length) return;
    let rows = data.slice(1); // exclude header
    // Search
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(row => row.some(cell => cell.toLowerCase().includes(s)));
    }
    setFilteredData([data[0], ...rows]);
  }, [data, search]);

  // Selection logic
  useEffect(() => {
    if (!filteredData.length) return;
    if (selectAll) {
      setSelectedRows(new Set(filteredData.slice(1).map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
    // eslint-disable-next-line
  }, [selectAll, filteredData.length]);

  const handleRowSelect = (idx: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(idx)) newSet.delete(idx);
    else newSet.add(idx);
    setSelectedRows(newSet);
    setSelectAll(newSet.size === filteredData.length - 1);
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
  };

  const handleCopy = () => {
    if (!filteredData.length) return;
    const rows = Array.from(selectedRows).map(i => filteredData[i + 1]);
    const csv = Papa.unparse([filteredData[0], ...rows]);
    navigator.clipboard.writeText(csv);
  };

  const handleDelete = () => {
    if (!filteredData.length) return;
    const toDelete = new Set(selectedRows);
    const newRows = filteredData.slice(1).filter((_, i) => !toDelete.has(i));
    setData([filteredData[0], ...newRows]);
    setSelectedRows(new Set());
    setSelectAll(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || !filteredData.length) return;
    const tag = tagInput.trim();
    const tagColIdx = filteredData[0].indexOf('Tags');
    const newRows = filteredData.slice(1).map((row, i) => {
      if (selectedRows.has(i)) {
        const tags = row[tagColIdx] ? row[tagColIdx].split(',').map(t => t.trim()).filter(Boolean) : [];
        if (!tags.includes(tag)) tags.push(tag);
        const newRow = [...row];
        newRow[tagColIdx] = tags.join(', ');
        return newRow;
      }
      return row;
    });
    setData([filteredData[0], ...newRows]);
    setTagInput('');
  };

  const handleSave = async () => {
    if (!transactionId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const csv = Papa.unparse(data);
      const tagColIdx = data[0].indexOf('Tags');
      const tags = Array.from(new Set(data.slice(1).flatMap(row => (row[tagColIdx] || '').split(',').map(t => t.trim()).filter(Boolean))));
      const res = await fetch('/api/transaction/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, csv, tags }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save updated transaction');
      }
      alert('Transaction file updated!');
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Preview">
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : filteredData.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2 mb-2 items-center">
            <input
              type="text"
              placeholder="Search..."
              className="border px-2 py-1 rounded"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {selectedRows.size > 0 && (
              <div className="flex gap-2 items-center bg-gray-100 px-2 py-1 rounded">
                <span>{selectedRows.size} selected</span>
                <input
                  type="text"
                  placeholder="Add tag"
                  className="border px-1 py-0.5 rounded text-xs"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <button className="px-2 py-1 bg-green-600 text-white rounded text-xs" onClick={handleAddTag}>Add Tag</button>
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs" onClick={handleCopy}>Copy</button>
                <button className="px-2 py-1 bg-red-600 text-white rounded text-xs" onClick={handleDelete}>Delete</button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="border px-2 py-1 bg-gray-50">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                  </th>
                  {filteredData[0].map((header, colIdx) => (
                    <th key={colIdx} className="border px-2 py-1 font-bold bg-gray-100">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(1).map((row, i) => (
                  <tr key={i} className={selectedRows.has(i) ? 'bg-blue-50' : ''}>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => handleRowSelect(i)}
                      />
                    </td>
                    {row.map((cell, j) => (
                      j === filteredData[0].length - 1
                        ? <td key={j} className="border px-2 py-1 whitespace-nowrap">
                            {cell.split(',').filter(Boolean).map(tag => (
                              <span key={tag} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded mr-1 mb-1">{tag}</span>
                            ))}
                          </td>
                        : <td key={j} className="border px-2 py-1 whitespace-nowrap">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={handleSave}
              disabled={saving || !transactionId}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveError && <span className="text-red-600 ml-4">{saveError}</span>}
          </div>
        </>
      ) : (
        <div className="text-gray-500">No data to display.</div>
      )}
    </Modal>
  );
};

export default TransactionPreviewModal; 