"use client";
import { useEffect, useState } from "react";
import { RiFileList3Line, RiDownloadLine, RiFolder3Line, RiArrowLeftLine } from "react-icons/ri";
import FileSidebar from "../components/FileSidebar";

interface FileItem {
  key: string;
  fileName: string;
  lastModified?: string;
  size?: number;
  url: string;
}

export default function FilesPage() {
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [sidebarSection, setSidebarSection] = useState<string>('all');

  useEffect(() => {
    const userId = localStorage.getItem("userId") || "";
    setLoading(true);
    setError(null);
    if (!currentFolder) {
      // List folders
      fetch(`/api/files?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          setFolders(data.folders || []);
          setFiles([]);
        })
        .catch(() => setError("Failed to fetch folders"))
        .finally(() => setLoading(false));
    } else {
      // List files in folder
      fetch(`/api/files?userId=${userId}&folder=${encodeURIComponent(currentFolder)}`)
        .then(res => res.json())
        .then(data => {
          setFiles(data.files || []);
          setFolders([]);
        })
        .catch(() => setError("Failed to fetch files"))
        .finally(() => setLoading(false));
    }
  }, [currentFolder]);

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <FileSidebar selected={sidebarSection} onSelect={setSidebarSection} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="flex items-center gap-2 mb-6">
            <RiFileList3Line className="text-2xl text-blue-500" />
            <h1 className="text-2xl font-bold text-blue-900">All Files</h1>
          </div>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : currentFolder ? (
            <>
              <button
                className="flex items-center gap-1 mb-4 px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded text-blue-700 font-medium"
                onClick={() => setCurrentFolder(null)}
              >
                <RiArrowLeftLine /> Back to Folders
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {files.length === 0 ? (
                  <div className="col-span-full text-gray-500">No files in this folder.</div>
                ) : (
                  files.map((f) => (
                    <div
                      key={f.key}
                      className="relative bg-white/80 border border-blue-100 rounded-xl shadow hover:shadow-lg transition-all duration-200 flex flex-col items-center p-4 group cursor-pointer hover:bg-blue-50/40"
                    >
                      <RiFileList3Line className="text-4xl text-blue-400 mb-2 group-hover:text-blue-600 transition-colors" />
                      <div className="w-full text-center font-medium text-blue-900 truncate" title={f.fileName}>
                        {f.fileName}
                      </div>
                      <div className="w-full text-center text-xs text-gray-400 mt-0.5">
                        {f.lastModified ? new Date(f.lastModified).toLocaleDateString() : ""}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
                          title="Download"
                          onClick={e => e.stopPropagation()}
                        >
                          <RiDownloadLine />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {folders.length === 0 ? (
                <div className="col-span-full text-gray-500">No folders found.</div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder}
                    className="bg-white/80 border border-blue-100 rounded-xl shadow hover:shadow-lg transition-all duration-200 flex flex-col items-center p-6 group cursor-pointer hover:bg-blue-50/40"
                    onClick={() => setCurrentFolder(folder)}
                  >
                    <RiFolder3Line className="text-5xl text-blue-400 mb-2 group-hover:text-blue-600 transition-colors" />
                    <div className="w-full text-center font-medium text-blue-900 truncate" title={folder}>
                      {folder.charAt(0).toUpperCase() + folder.slice(1)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 