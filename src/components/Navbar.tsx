'use client';

import React from 'react';
import { ShieldAlert, Upload, Sparkles, LogOut, User as UserIcon, RefreshCw, Download } from 'lucide-react';

interface NavbarProps {
  user: { email: string; name?: string } | null;
  onOpenUpload: () => void;
  onLoadSample: () => void;
  onLogout: () => void;
  onExportCsv?: () => void;
  isLoadingSample?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenUpload,
  onLoadSample,
  onLogout,
  onExportCsv,
  isLoadingSample,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight">
              LedgerPulse
            </h1>
            <p className="text-xs text-slate-400 font-medium">Revenue Reconciliation & Audit Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
              title="Download full CSV report of audit discrepancies"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Audit CSV</span>
            </button>
          )}

          <button
            onClick={onLoadSample}
            disabled={isLoadingSample}
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 rounded-lg transition-all shadow-sm hover:shadow-indigo-900/20 disabled:opacity-50"
            title="Ingest pre-configured e-commerce test dataset"
          >
            {isLoadingSample ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{isLoadingSample ? 'Processing...' : 'Load Sample Demo'}</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV Files</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-medium text-slate-300 max-w-[140px] truncate">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
