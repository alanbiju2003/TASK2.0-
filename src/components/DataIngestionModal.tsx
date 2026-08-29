'use client';

import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (runId: string) => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess,
}) => {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordersFile || !paymentsFile) {
      setError('Please select both orders.csv and payments.csv files.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('ordersFile', ordersFile);
      formData.append('paymentsFile', paymentsFile);
      if (batchName.trim()) {
        formData.append('name', batchName.trim());
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process CSV files.');
      }

      onIngestSuccess(data.runId);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error ingesting datasets.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel max-w-xl w-full rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Ingest E-Commerce Datasets</h3>
              <p className="text-xs text-slate-400">Upload store orders.csv & gateway payments.csv for audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Reconciliation Batch Identifier (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. August 2026 Audit Batch"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Orders File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              1. Store System Export (`orders.csv`)
            </label>
            <div className="relative border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/50 rounded-xl p-4 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setOrdersFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-8 h-8 text-blue-400 shrink-0" />
                <div className="overflow-hidden">
                  {ordersFile ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-200 truncate">{ordersFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(ordersFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Click or drag & drop `orders.csv`</p>
                      <p className="text-[10px] text-slate-500">Order system sales export dataset</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payments File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              2. Payment Gateway Export (`payments.csv`)
            </label>
            <div className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/50 rounded-xl p-4 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setPaymentsFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-8 h-8 text-emerald-400 shrink-0" />
                <div className="overflow-hidden">
                  {paymentsFile ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-200 truncate">{paymentsFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(paymentsFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Click or drag & drop `payments.csv`</p>
                      <p className="text-[10px] text-slate-500">Payment processor capture dataset</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !ordersFile || !paymentsFile}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Reconciling Datasets...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Run Reconciliation Audit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
