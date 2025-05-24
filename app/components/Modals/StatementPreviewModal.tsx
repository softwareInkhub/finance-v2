import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Papa from 'papaparse';

interface StatementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  s3FileUrl: string | null;
}

const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({ isOpen, onClose, s3FileUrl }) => {
  const [data, setData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !s3FileUrl) return;
    setLoading(true);
    setError(null);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statement Preview">
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
      ) : (
        <div className="text-gray-500">No data to display.</div>
      )}
    </Modal>
  );
};

export default StatementPreviewModal; 