'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { KpiCards } from '@/components/KpiCards';
import { DiscrepancyCharts } from '@/components/DiscrepancyCharts';
import { DrillDownTable, Discrepancy } from '@/components/DrillDownTable';
import { RawOrdersTable, RawPaymentsTable, RawOrderRecord, RawPaymentRecord } from '@/components/RawDataTables';
import { AuditLogsTable, AuditLogRecord } from '@/components/AuditLogsTable';
import { AiExplanationModal } from '@/components/AiExplanationModal';
import { DataIngestionModal } from '@/components/DataIngestionModal';
import { AddManualRecordModal } from '@/components/AddManualRecordModal';
import { AiAssistantChat } from '@/components/AiAssistantChat';
import { AlertOctagon, Sparkles, RefreshCw, Upload, FileText, FileSpreadsheet, CreditCard, ShieldAlert, Activity, Trash2, Plus } from 'lucide-react';

interface RunSummary {
  id: string;
  name: string;
  createdAt: string;
  totalOrdersCount: number;
  totalOrdersAmount: number;
  totalPaymentsCount: number;
  totalPaymentsAmount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
}

interface FullRunData extends RunSummary {
  discrepancies: Discrepancy[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<FullRunData | null>(null);
  const [isLoadingRun, setIsLoadingRun] = useState(false);

  // Tab State: DISCREPANCIES | ORDERS_CSV | PAYMENTS_CSV | AUDIT_LOGS
  const [activeTab, setActiveTab] = useState<'DISCREPANCIES' | 'ORDERS_CSV' | 'PAYMENTS_CSV' | 'AUDIT_LOGS'>('DISCREPANCIES');
  const [rawOrders, setRawOrders] = useState<RawOrderRecord[]>([]);
  const [rawPayments, setRawPayments] = useState<RawPaymentRecord[]>([]);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // 1. Verify Session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoadingUser(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch Reconciliation Runs
  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/reconcile/run');
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
        if (data.runs && data.runs.length > 0 && !selectedRunId) {
          setSelectedRunId(data.runs[0].id);
        } else if (!data.runs || data.runs.length === 0) {
          setSelectedRunId(null);
          setCurrentRun(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    }
  };

  // 3. Fetch Raw Database Datasets (orders.csv & payments.csv)
  const fetchRawData = async () => {
    try {
      const [resOrders, resPayments] = await Promise.all([
        fetch('/api/raw/orders'),
        fetch('/api/raw/payments'),
      ]);

      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        setRawOrders(dataOrders.orders || []);
      }
      if (resPayments.ok) {
        const dataPayments = await resPayments.json();
        setRawPayments(dataPayments.payments || []);
      }
    } catch (err) {
      console.error('Failed to fetch raw datasets:', err);
    }
  };

  // 4. Fetch System Audit Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRuns();
      fetchRawData();
      fetchLogs();
    }
  }, [user]);

  // 5. Load Details for Selected Run
  const loadRunDetails = async (runId: string) => {
    setIsLoadingRun(true);
    try {
      const res = await fetch(`/api/reconcile/run/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRun(data.run);
      }
    } catch (err) {
      console.error('Failed to load run details:', err);
    } finally {
      setIsLoadingRun(false);
    }
  };

  useEffect(() => {
    if (selectedRunId) {
      loadRunDetails(selectedRunId);
    }
  }, [selectedRunId]);

  // 6. Clear / Reset Database Records for HR testing
  const handleResetDatabase = async () => {
    if (!window.confirm('Are you sure you want to clear all database records? This will allow you to test uploading a fresh CSV dataset or adding manual records.')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/reconcile/reset', { method: 'DELETE' });
      if (res.ok) {
        setCurrentRun(null);
        setSelectedRunId(null);
        setRuns([]);
        setRawOrders([]);
        setRawPayments([]);
        fetchLogs();
      }
    } catch (err) {
      console.error('Failed to reset database:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // 7. Update Discrepancy Audit Status
  const handleUpdateStatus = async (id: string, newStatus: Discrepancy['status']) => {
    try {
      const res = await fetch(`/api/discrepancies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        if (currentRun) {
          setCurrentRun({
            ...currentRun,
            discrepancies: currentRun.discrepancies.map((d) =>
              d.id === id ? { ...d, status: newStatus } : d
            ),
          });
          fetchLogs();
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // 8. Export CSV Report
  const handleExportCsv = () => {
    if (!currentRun || !currentRun.discrepancies || currentRun.discrepancies.length === 0) return;

    const headers = ['Discrepancy ID', 'Type', 'Severity', 'Store Order ID', 'Gateway Payment ID', 'Customer Email', 'Store Amount', 'Gateway Amount', 'Variance ($)', 'Order Status', 'Payment Status', 'Audit Description', 'Audit Status'];
    
    const rows = currentRun.discrepancies.map(d => [
      d.id,
      d.type,
      d.severity,
      d.orderId || '',
      d.paymentId || '',
      d.customerEmail || '',
      d.orderAmount != null ? d.orderAmount.toFixed(2) : '',
      d.paymentAmount != null ? d.paymentAmount.toFixed(2) : '',
      Math.abs(d.difference || 0).toFixed(2),
      d.orderStatus || '',
      d.paymentStatus || '',
      `"${(d.description || '').replace(/"/g, '""')}"`,
      d.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reconciliation_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs text-slate-600 font-semibold">Authenticating Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header Navbar */}
      <Navbar
        user={user}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportCsv={handleExportCsv}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Executive Banner & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 uppercase tracking-wider">
                {currentRun ? 'Audit Active' : 'Ready For Test Upload'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentRun ? new Date(currentRun.createdAt).toLocaleString() : ''}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              {currentRun ? currentRun.name : 'Executive Audit Dashboard'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Deterministic rule-based matching engine isolating revenue risk and gateway leakage
            </p>
          </div>

          {/* Action Buttons: Batch Selector + Add Manual Record + Reset DB */}
          <div className="flex flex-wrap items-center gap-2">
            {runs.length > 0 && (
              <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <FileText className="w-4 h-4 text-slate-500 ml-2" />
                <select
                  value={selectedRunId || ''}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-4"
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsManualAddOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-sm"
              title="Add a manual store order or gateway payment record to test audit engine"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Manual Record</span>
            </button>

            <button
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm disabled:opacity-50"
              title="Clear all database records to test uploading fresh CSV files"
            >
              {isResetting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>Clear Database</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex flex-wrap bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-2">
          <button
            onClick={() => setActiveTab('DISCREPANCIES')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'DISCREPANCIES'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Discrepancies ({currentRun?.discrepancies?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('ORDERS_CSV')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'ORDERS_CSV'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Store Orders (`orders.csv` - {rawOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS_CSV')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'PAYMENTS_CSV'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Gateway Payments (`payments.csv` - {rawPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Audit Logs ({logs.length})</span>
          </button>
        </div>

        {/* Empty State Banner if no dataset uploaded */}
        {(!currentRun || currentRun.totalOrdersCount === 0) && !isLoadingRun && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <Upload className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-slate-900">Database Cleared / No Active Audit Dataset</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload your store sales export (`orders.csv`) and payment gateway export (`payments.csv`) or add manual records to test reconciliation.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-blue-600/20 transition-all inline-flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV Datasets Now</span>
              </button>
              <button
                onClick={() => setIsManualAddOpen(true)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border border-slate-300 transition-all inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Manual Record</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoadingRun && (
          <div className="py-16 bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-xs text-slate-600 font-semibold">Running Reconciliation Rules Engine...</p>
          </div>
        )}

        {/* Tab 1: Audit Discrepancies View */}
        {activeTab === 'DISCREPANCIES' && currentRun && !isLoadingRun && currentRun.totalOrdersCount > 0 && (
          <>
            {/* 1. Headline Figure KPI Cards */}
            <KpiCards
              totalOrdersCount={currentRun.totalOrdersCount}
              totalOrdersAmount={currentRun.totalOrdersAmount}
              totalPaymentsCount={currentRun.totalPaymentsCount}
              totalPaymentsAmount={currentRun.totalPaymentsAmount}
              totalReconciledAmount={currentRun.totalReconciledAmount}
              totalDisputedAmount={currentRun.totalDisputedAmount}
              moneyAtRisk={currentRun.moneyAtRisk}
            />

            {/* 2. Discrepancy Charts (Donut + Bar) */}
            <DiscrepancyCharts discrepancies={currentRun.discrepancies} />

            {/* 3. Filterable Drill-Down Discrepancies Table */}
            <DrillDownTable
              discrepancies={currentRun.discrepancies}
              onSelectDiscrepancy={(d) => setSelectedDiscrepancy(d)}
              onUpdateStatus={handleUpdateStatus}
            />
          </>
        )}

        {/* Tab 2: Raw Store Orders Dataset View (`orders.csv`) */}
        {activeTab === 'ORDERS_CSV' && (
          <RawOrdersTable orders={rawOrders} />
        )}

        {/* Tab 3: Raw Gateway Payments Dataset View (`payments.csv`) */}
        {activeTab === 'PAYMENTS_CSV' && (
          <RawPaymentsTable payments={rawPayments} />
        )}

        {/* Tab 4: System Audit Logs & Email Alert Service View */}
        {activeTab === 'AUDIT_LOGS' && (
          <AuditLogsTable logs={logs} onRefreshLogs={fetchLogs} />
        )}
      </main>

      {/* AI Discrepancy Detail Modal */}
      <AiExplanationModal
        discrepancy={selectedDiscrepancy}
        onClose={() => setSelectedDiscrepancy(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Data Ingestion File Upload Modal */}
      <DataIngestionModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onIngestSuccess={(runId) => {
          fetchRuns();
          fetchRawData();
          fetchLogs();
          loadRunDetails(runId);
        }}
      />

      {/* Add Manual Record Modal */}
      <AddManualRecordModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onSuccess={(runId) => {
          fetchRuns();
          fetchRawData();
          fetchLogs();
          loadRunDetails(runId);
        }}
      />

      {/* Scope-Restricted Token-Efficient AI Audit Assistant Chat */}
      <AiAssistantChat runId={currentRun?.id} />
    </div>
  );
}
