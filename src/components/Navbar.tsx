'use client';

import React from 'react';
import { ShieldAlert, Upload, LogOut, User as UserIcon, Download } from 'lucide-react';

interface NavbarProps {
  user: { email: string; name?: string } | null;
  onOpenUpload: () => void;
  onLogout: () => void;
  onExportCsv?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenUpload,
  onLogout,
  onExportCsv,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 text-white">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>LedgerPulse</span>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                PRO AUDIT
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Revenue Reconciliation & Audit Engine</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
              title="Download full CSV report of audit discrepancies"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Audit CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV Files</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center space-x-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 max-w-[120px] sm:max-w-[160px] truncate">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
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
