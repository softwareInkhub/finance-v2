"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Modal from "../../../../../components/Modals/Modal";
import StatementPreviewModal from '../../../../../components/Modals/StatementPreviewModal';

interface Statement {
  id: string;
  bankId: string;
  accountId: string;
  s3FileUrl: string;
  transactionHeader: string[];
  tags: string[];
}

export default function StatementsPage() {
  const { bankId, accountId } = useParams();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatements = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/statements?accountId=${accountId}`);
        if (!res.ok) throw new Error("Failed to fetch statements");
        const data = await res.json();
        setStatements(data);
      } catch (err) {
        setError("Failed to fetch statements");
      }
    };
    if (accountId) fetchStatements();
  }, [accountId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a CSV file.");
      setIsUploading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bankId', String(bankId));
      formData.append('accountId', String(accountId));
      const res = await fetch('/api/statement/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload statement');
      }
      // Refresh statement list
      const newStatement = await res.json();
      setStatements(prev => [...prev, newStatement]);
      setIsModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload statement');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Upload Statement
        </button>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Upload Statement">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">CSV File</label>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              className="mt-1 block w-full"
              required
              disabled={isUploading}
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </Modal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statements.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No statements uploaded yet. Click "Upload Statement" to get started.
          </div>
        ) : (
          statements.map(statement => (
            <div
              key={statement.id}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => { 
                setPreviewUrl(statement.s3FileUrl); 
                setSelectedStatementId(statement.id); 
                setPreviewOpen(true); 
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800">Statement {statement.id}</h3>
              <div className="text-gray-600 text-sm">{statement.s3FileUrl}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {statement.tags.map(tag => (
                  <span key={statement.id + '-' + tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">{tag}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <StatementPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        s3FileUrl={previewUrl}
        statementId={selectedStatementId}
        bankId={statements.find(s => s.id === selectedStatementId)?.bankId || null}
        accountId={statements.find(s => s.id === selectedStatementId)?.accountId || null}
      />
    </div>
  );
} 