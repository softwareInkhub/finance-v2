'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { RiAlertLine, RiCheckLine, RiErrorWarningLine } from 'react-icons/ri';

interface MigrationResult {
  statementId: string;
  fileName: string;
  status: 'success' | 'error' | 'already_migrated';
  message: string;
}

interface MigrationSummary {
  total: number;
  success: number;
  error: number;
  alreadyMigrated: number;
}

export default function FileMigrationBanner() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);

  const handleMigration = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch('/api/migrate-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (response.ok) {
        setMigrationResults(result.results || []);
        setMigrationSummary(result.summary);
        setMigrationComplete(true);
        toast.success(result.message || 'Migration completed successfully!');
      } else {
        toast.error(result.error || 'Migration failed');
      }
    } catch (error) {
      toast.error('Failed to migrate files. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  // Don't show if migration is complete and successful
  if (migrationComplete && migrationSummary && migrationSummary.error === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full text-green-600">
            <RiCheckLine className="text-xl" />
          </div>
          <div>
            <h3 className="text-green-800 font-semibold">File Migration Complete</h3>
            <p className="text-green-600 text-sm">
              All your files have been successfully migrated to your personal folder structure.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
          <RiAlertLine className="text-xl" />
        </div>
        <div className="flex-1">
          <h3 className="text-blue-800 font-semibold mb-2">File Storage Update</h3>
          <p className="text-blue-700 text-sm mb-3">
            We've updated our file storage system to provide better security and organization. 
            Each user now has their own dedicated folder for storing files. 
            {!migrationComplete && ' Click the button below to migrate your existing files to the new structure.'}
          </p>
          
          {!migrationComplete && (
            <button
              onClick={handleMigration}
              disabled={isMigrating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isMigrating ? 'Migrating Files...' : 'Migrate My Files'}
            </button>
          )}

          {migrationComplete && migrationSummary && (
            <div className="mt-3 p-3 bg-white rounded border">
              <h4 className="font-medium text-gray-800 mb-2">Migration Results:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{migrationSummary.total}</div>
                  <div className="text-gray-600">Total Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{migrationSummary.success}</div>
                  <div className="text-gray-600">Migrated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{migrationSummary.alreadyMigrated}</div>
                  <div className="text-gray-600">Already Done</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{migrationSummary.error}</div>
                  <div className="text-gray-600">Errors</div>
                </div>
              </div>
              
              {migrationSummary.error > 0 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center gap-2 text-red-700">
                    <RiErrorWarningLine />
                    <span className="text-sm font-medium">Some files failed to migrate</span>
                  </div>
                  <p className="text-red-600 text-xs mt-1">
                    Please contact support if you need assistance with the failed files.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 