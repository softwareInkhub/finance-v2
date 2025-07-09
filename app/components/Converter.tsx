'use client'
import { useState } from 'react';
import { FiDownload, FiLoader } from 'react-icons/fi';
import { convertPdfToCsv, usePdfWorker } from '../converter/pdfToCsv';
import { convertPdfToHtml } from '../converter/pdfToHtml';
import { convertCsvToXlsx } from '../converter/csvToXlsx';
import { convertCsvToJson } from '../converter/csvToJson';
import { convertJsonToCsv } from '../converter/jsonToCsv';
import { convertTxtToCsv } from '../converter/txtToCsv';
import { convertTxtToJson } from '../converter/txtToJson';
import { convertTxtToPdf } from '../converter/txtToPdf';
import { convertCsvToTxt } from '../converter/csvToTxt';
import { convertCsvToPdf } from '../converter/csvToPdf';
import { convertJsonToTxt } from '../converter/jsonToTxt';
import { convertHtmlToTxt } from '../converter/htmlToTxt';
import { convertHtmlToCsv } from '../converter/htmlToCsv';
import { convertPdfToTxt } from '../converter/pdfToTxt';
import { convertPdfToXlsx } from '../converter/pdfToXlsx';
import FileUploader from './FileUploader';
import React from 'react';
import Image from 'next/image';

const conversionMap: Record<string, string[]> = {
  TXT: ['PDF', 'DOC', 'CSV', 'HTML', 'RTF', 'XML', 'JSON'],
  CSV: ['XLSX', 'PDF', 'TXT', 'JSON', 'XML', 'HTML'],
  PDF: ['DOC', 'TXT', 'CSV', 'XLSX', 'HTML', 'JPG/PNG'],
  'DOC/DOCX': ['PDF', 'TXT', 'HTML', 'RTF', 'ODT'],
  'XLS/XLSX': ['CSV', 'PDF', 'TXT', 'HTML', 'ODS'],
  HTML: ['PDF', 'DOC', 'TXT', 'CSV'],
  'JSON/XML': ['CSV', 'XLSX', 'TXT', 'PDF'],
  RTF: ['DOC', 'PDF', 'TXT'],
};

const conversionFunctions: Record<string, (file: File, pageSize?: string) => Promise<string | Blob>> = {
  'PDF-CSV': convertPdfToCsv,
  'PDF-HTML': convertPdfToHtml,
  'PDF-TXT': convertPdfToTxt,
  'PDF-XLSX': convertPdfToXlsx,
  'CSV-XLSX': convertCsvToXlsx,
  'CSV-JSON': convertCsvToJson,
  'CSV-TXT': convertCsvToTxt,
  'CSV-PDF': convertCsvToPdf,
  'TXT-CSV': convertTxtToCsv,
  'TXT-JSON': convertTxtToJson,
  'TXT-PDF': convertTxtToPdf,
  'JSON-CSV': convertJsonToCsv,
  'JSON-TXT': convertJsonToTxt,
  'HTML-TXT': convertHtmlToTxt,
  'HTML-CSV': convertHtmlToCsv,
};

const PAGE_SIZES = [
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'Legal', value: 'legal' },
];

function Preview({ result, outputType }: { result: string | Blob | null, outputType: string }) {
  if (!result) return null;
  if (outputType === 'TXT' || outputType === 'CSV') {
    return <pre className="bg-gray-100 rounded p-4 overflow-x-auto max-h-64 whitespace-pre-wrap">{typeof result === 'string' ? result.slice(0, 5000) : 'Preview not available for large files.'}</pre>;
  }
  if (outputType === 'JSON') {
    let json = '';
    try {
      json = typeof result === 'string' ? JSON.stringify(JSON.parse(result), null, 2) : '';
    } catch {
      json = typeof result === 'string' ? result : '';
    }
    return <pre className="bg-gray-100 rounded p-4 overflow-x-auto max-h-64 whitespace-pre-wrap text-green-700">{json.slice(0, 5000)}</pre>;
  }
  if (outputType === 'HTML') {
    return (
      <div className="bg-gray-50 rounded p-2 max-h-64 overflow-auto border">
        <iframe
          srcDoc={typeof result === 'string' ? result : ''}
          title="HTML Preview"
          className="w-full h-48 border-none"
          sandbox="allow-same-origin"
        />
      </div>
    );
  }
  if (outputType === 'XLSX') {
    // XLSX preview: show as table (first 10 rows)
    return <div className="bg-gray-100 rounded p-4 text-sm text-gray-700">XLSX file ready. Download to view.</div>;
  }
  if (outputType === 'PNG' || outputType === 'JPG' || outputType === 'JPEG') {
    // Show image preview if result is a Blob (single image)
    if (result instanceof Blob) {
      const url = URL.createObjectURL(result);
      return (
        <div className="relative w-full h-48">
          <Image
            src={url}
            alt="Preview"
            fill
            className="object-contain rounded shadow"
            onLoad={() => URL.revokeObjectURL(url)}
          />
        </div>
      );
    }
    return <div className="text-gray-500">Image(s) ready. Download to view all.</div>;
  }
  return null;
}

function Modal({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative modal-fade">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default function Converter() {
  const [inputType, setInputType] = useState('');
  const [outputType, setOutputType] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageSize, setPageSize] = useState('a4');

  // Initialize PDF worker
  usePdfWorker();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (!selectedFile || !inputType || !outputType) return;
    setIsConverting(true);
    setError(null);
    try {
      const key = `${inputType}-${outputType}`;
      const fn = conversionFunctions[key];
      if (fn) {
        const res = fn.length === 2 ? await fn(selectedFile, pageSize) : await fn(selectedFile);
        setResult(res);
      } else {
        setError('This conversion is not implemented yet.');
      }
    } catch (err) {
      setError('Failed to convert file. Please try again.');
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    let blob: Blob;
    const filename = `converted.${outputType.toLowerCase()}`;
    if (result instanceof Blob) {
      blob = result;
    } else {
      blob = new Blob([result], { type: 'text/plain' });
      if (outputType === 'CSV') blob = new Blob([result], { type: 'text/csv' });
      if (outputType === 'JSON') blob = new Blob([result], { type: 'application/json' });
      if (outputType === 'PDF') blob = new Blob([result], { type: 'application/pdf' });
      if (outputType === 'XLSX') blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (outputType === 'HTML') blob = new Blob([result], { type: 'text/html' });
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-8">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 drop-shadow">File Converter</h1>
          <p className="text-gray-500 text-base">Select file types and convert your files easily</p>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Input Type</label>
              <select
                className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-blue-50 text-gray-800 shadow-sm"
                value={inputType}
                onChange={e => { setInputType(e.target.value); setOutputType(''); }}
              >
                <option value="">Select</option>
                {Object.keys(conversionMap).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Output Type</label>
              <select
                className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-blue-50 text-gray-800 shadow-sm"
                value={outputType}
                onChange={e => setOutputType(e.target.value)}
                disabled={!inputType}
              >
                <option value="">Select</option>
                {inputType && conversionMap[inputType]?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Page Size</label>
              <select
                className="w-full border border-blue-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none bg-blue-50 text-gray-800 shadow-sm"
                value={pageSize}
                onChange={e => setPageSize(e.target.value)}
              >
                {PAGE_SIZES.map(size => (
                  <option key={size.value} value={size.value}>{size.label}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Upload Area */}
          <div className="flex flex-col items-center">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Upload File</label>
            <div
              className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer bg-blue-50 hover:bg-blue-100 ${selectedFile ? 'border-green-400' : 'border-blue-200'}`}
              onClick={() => document.getElementById('file-input')?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
              }}
            >
              <svg className="w-12 h-12 text-blue-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              {!selectedFile ? (
                <>
                  <span className="text-blue-700 font-semibold">Drag and drop your file here</span>
                  <span className="text-xs text-blue-400 mt-1">or <span className="underline cursor-pointer">browse</span></span>
                  <span className="text-xs text-gray-400 mt-2">Supported: {inputType || 'PDF, CSV, TXT, ...'}</span>
                </>
              ) : (
                <>
                  <span className="text-green-700 font-semibold">{selectedFile.name}</span>
                  <button
                    className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs font-bold mt-2"
                    onClick={e => { e.stopPropagation(); handleRemoveFile(); }}
                  >Remove</button>
                </>
              )}
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept={inputType ? `.${inputType.toLowerCase()}` : undefined}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
                }}
              />
            </div>
          </div>
          {/* Convert Button */}
          <button
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-green-400 text-white font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            onClick={handleConvert}
            disabled={!selectedFile || !inputType || !outputType || isConverting}
          >
            {isConverting ? (
              <span className="flex items-center justify-center gap-2"><FiLoader className="animate-spin" /> Converting...</span>
            ) : 'Convert'}
          </button>
          {/* Feedback */}
          {error && <div className="text-red-600 text-center font-semibold mt-2">{error}</div>}
          {result && !error && (
            <div className="flex flex-col items-center mt-4">
              <div className="text-green-700 font-semibold mb-2">Conversion successful!</div>
              <button
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold shadow hover:scale-105 transition-all"
                onClick={handleDownload}
              >
                <FiDownload className="inline mr-2" /> Download
              </button>
              <button
                className="mt-2 text-blue-600 underline text-sm hover:text-blue-800"
                onClick={() => setPreviewOpen(true)}
              >Preview</button>
              <Modal open={previewOpen} onClose={() => setPreviewOpen(false)}>
                <Preview result={result} outputType={outputType} />
              </Modal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 