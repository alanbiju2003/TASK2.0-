'use client';

import React, { useState } from 'react';
import { Activity, Mail, RefreshCw, CheckCircle2, AlertTriangle, Info, Clock, Send } from 'lucide-react';

export interface AuditLogRecord {
  id: string;
  level: string;
  event: string;
  message: string;
  details?: string | null;
  createdAt: string | Date;
}

interface AuditLogsTableProps {
  logs: AuditLogRecord[];
  onRefreshLogs: () => void;
}

const LEVEL_BADGES: Record<string, string> = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const AuditLogsTable: React.FC<AuditLogsTableProps> = ({ logs, onRefreshLogs }) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const handleTriggerTestEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TEST_EMAIL',
          recipientEmail: 'alanthomasbiju01@gmail.com',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger test email.');
      }

      setEmailStatus(data.message || 'Test email alert triggered!');
      onRefreshLogs();
    } catch (err: any) {
      console.error(err);
      setEmailStatus(`Notice: ${err.message || 'Email attempt logged to system.'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>System & Audit Logs</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {logs.length} Events Logged
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time tracking of data ingestion, engine reconciliations, and email alerts
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshLogs}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Logs</span>
          </button>

          <button
            onClick={handleTriggerTestEmail}
            disabled={isSendingEmail}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
            title="Trigger test notification email to alanthomasbiju01@gmail.com"
          >
            {isSendingEmail ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-blue-100" />
            )}
            <span>Send Alert to alanthomasbiju01@gmail.com</span>
          </button>
        </div>
      </div>

      {emailStatus && (
        <div className="mx-5 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between font-medium">
          <span>{emailStatus}</span>
          <button onClick={() => setEmailStatus(null)} className="text-blue-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Level</th>
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Log Message</th>
              <th className="py-3 px-4">Target Recipient / Details</th>
              <th className="py-3 px-4 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No system audit log events recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        LEVEL_BADGES[log.level] || LEVEL_BADGES.INFO
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{log.event}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{log.message}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-[220px] truncate">
                    {log.details || 'alanthomasbiju01@gmail.com'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
