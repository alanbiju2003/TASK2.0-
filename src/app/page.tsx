'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { KpiCards } from '@/components/KpiCards';
import { DiscrepancyCharts } from '@/components/DiscrepancyCharts';
import { DrillDownTable, Discrepancy } from '@/components/DrillDownTable';
import { AiExplanationModal } from '@/components/AiExplanationModal';
import { DataIngestionModal } from '@/components/DataIngestionModal';
import { AlertOctagon, Sparkles, RefreshCw, Upload, FileText, ChevronDown } from 'lucide-react';

interface RunSummary {
  id: string;
  name: string;
  createdAt: string;
  totalOrdersCount: number;
  totalPaymentsCount: number;
  totalOrdersAmount: number;
  totalPaymentsAmount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
  discrepancies: Discrepancy[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [currentRun, setCurrentRun] = useState<RunSummary | null>(null);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // 1. Authenticate user
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
      fetchRuns();
    } catch (e) {
      router.push('/login');
    } finally {
      setIsLoadingUser(false);
    }
  };

  // 2. Fetch runs list
  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/reconcile/run');
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs || []);

      if (data.runs && data.runs.length > 0) {
        loadRunDetails(data.runs[0].id);
      } else {
        // If user has no runs yet, auto-ingest sample dataset!
        loadSampleData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Load specific run details
  const loadRunDetails = async (runId: string) => {
    setIsLoadingRun(true);
    try {
      const res = await fetch(`/api/reconcile/run/${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      setCurrentRun(data.run);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRun(false);
    }
  };

  // 4. Ingest sample demo dataset
  const loadSampleData = async () => {
    setIsLoadingSample(true);
    try {
      // Fetch local sample orders.csv and payments.csv
      const [ordersRes, paymentsRes] = await Promise.all([
        fetch('/orders.csv').catch(() => null),
        fetch('/payments.csv').catch(() => null),
      ]);

      let ordersText = '';
      let paymentsText = '';

      if (ordersRes && ordersRes.ok && paymentsRes && paymentsRes.ok) {
        ordersText = await ordersRes.text();
        paymentsText = await paymentsRes.text();
      }

      // Fallback string if static fetch fails
      if (!ordersText || !paymentsText) {
        ordersText = `order_id,customer_email,order_date,amount,currency,status,payment_method
ORD-1001,john.doe@example.com,2026-08-01T10:15:00Z,150.00,USD,COMPLETED,credit_card
ORD-1002,alice.smith@example.com,2026-08-01T11:20:00Z,89.99,USD,COMPLETED,paypal
ORD-1004,charlie.brown@example.com,2026-08-02T14:30:00Z,320.00,USD,COMPLETED,credit_card
ORD-1006,eva.green@example.com,2026-08-04T12:00:00Z,500.00,USD,COMPLETED,stripe
ORD-1008,grace.hopper@example.com,2026-08-05T08:20:00Z,199.99,USD,COMPLETED,credit_card
ORD-1009,harry.potter@example.com,2026-08-05T17:00:00Z,120.00,USD,CANCELLED,credit_card`;

        paymentsText = `payment_id,order_id,customer_email,payment_date,amount,currency,status,fee_amount
PAY-5001,ORD-1001,john.doe@example.com,2026-08-01T10:15:05Z,150.00,USD,CAPTURED,4.65
PAY-5002,ORD-1002,alice.smith@example.com,2026-08-01T11:20:10Z,89.99,USD,CAPTURED,2.90
PAY-5006,ORD-1006,eva.green@example.com,2026-08-04T12:00:10Z,450.00,USD,CAPTURED,13.35
PAY-5008A,ORD-1008,grace.hopper@example.com,2026-08-05T08:20:00Z,199.99,USD,CAPTURED,6.10
PAY-5008B,ORD-1008,grace.hopper@example.com,2026-08-05T08:20:02Z,199.99,USD,CAPTURED,6.10
PAY-5009,ORD-1009,harry.potter@example.com,2026-08-05T17:00:12Z,120.00,USD,CAPTURED,3.78
PAY-9999,ORD-UNKNOWN,orphan.user@example.com,2026-08-08T18:00:00Z,350.00,USD,CAPTURED,10.45`;
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersCsv: ordersText,
          paymentsCsv: paymentsText,
          name: 'Demo E-Commerce Audit Sample',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      fetchRuns();
    } catch (e) {
      console.error('Failed to load sample data:', e);
    } finally {
      setIsLoadingSample(false);
    }
  };

  // 5. Update status handler
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/discrepancies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) return;

      // Update state locally
      if (currentRun) {
        const updatedDisc = currentRun.discrepancies.map((d) =>
          d.id === id ? { ...d, status: newStatus as any } : d
        );
        setCurrentRun({ ...currentRun, discrepancies: updatedDisc });
      }

      if (selectedDiscrepancy && selectedDiscrepancy.id === id) {
        setSelectedDiscrepancy({ ...selectedDiscrepancy, status: newStatus as any });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-xs text-slate-400 font-medium">Authenticating Auditor Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Top Header Navbar */}
      <Navbar
        user={user}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadSample={loadSampleData}
        onLogout={handleLogout}
        isLoadingSample={isLoadingSample}
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* Executive Banner & Batch Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 uppercase tracking-wider">
                Audit Active
              </span>
              <span className="text-xs text-slate-400">
                {currentRun ? new Date(currentRun.createdAt).toLocaleString() : ''}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1.5">
              {currentRun ? currentRun.name : 'Financial Reconciliation Overview'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentRun
                ? `Analyzing ${currentRun.totalOrdersCount} store orders against ${currentRun.totalPaymentsCount} gateway payments.`
                : 'Upload datasets to initiate revenue reconciliation audit.'}
            </p>
          </div>

          {/* Run Batch Dropdown Selector */}
          {runs.length > 0 && (
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Select Audit Batch
              </label>
              <select
                value={currentRun?.id || ''}
                onChange={(e) => loadRunDetails(e.target.value)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer min-w-[240px]"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({new Date(r.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Executive Summary Alert Box */}
        {currentRun && currentRun.moneyAtRisk > 0 && (
          <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-500/40 p-5 rounded-2xl flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-200">
                Executive Action Required: ${currentRun.moneyAtRisk.toFixed(2)} Money at Risk
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The reconciliation engine detected <strong className="text-rose-300">{currentRun.discrepancies.length} discrepancies</strong>. 
                Immediate priority should be given to <strong className="text-rose-300">Unmatched Orders</strong> (missing gateway payments for completed goods) and <strong className="text-rose-300">Duplicate Payments</strong> (double charges risking chargeback penalties).
              </p>
            </div>
          </div>
        )}

        {isLoadingRun ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-3" />
            <p className="text-xs text-slate-400 font-medium">Processing Reconciliation Engine Analytics...</p>
          </div>
        ) : currentRun ? (
          <>
            {/* 1. Headline Figures */}
            <KpiCards
              totalOrdersCount={currentRun.totalOrdersCount}
              totalOrdersAmount={currentRun.totalOrdersAmount}
              totalPaymentsCount={currentRun.totalPaymentsCount}
              totalPaymentsAmount={currentRun.totalPaymentsAmount}
              totalReconciledAmount={currentRun.totalReconciledAmount}
              totalDisputedAmount={currentRun.totalDisputedAmount}
              moneyAtRisk={currentRun.moneyAtRisk}
              discrepancyCount={currentRun.discrepancies.length}
            />

            {/* 2. Charts */}
            <DiscrepancyCharts discrepancies={currentRun.discrepancies} />

            {/* 3. Drill-Down Table */}
            <DrillDownTable
              discrepancies={currentRun.discrepancies}
              onSelectDiscrepancy={(item) => setSelectedDiscrepancy(item)}
              onUpdateStatus={handleUpdateStatus}
            />
          </>
        ) : (
          <div className="py-16 text-center glass-panel rounded-3xl p-12">
            <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-200">No Reconciliation Data Loaded</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
              Upload your store orders.csv and payment processor payments.csv to run instant revenue audit.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/30"
            >
              Upload Datasets Now
            </button>
          </div>
        )}
      </main>

      {/* AI Discrepancy Detail Modal */}
      <AiExplanationModal
        discrepancy={selectedDiscrepancy}
        onClose={() => setSelectedDiscrepancy(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* File Upload Modal */}
      <DataIngestionModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onIngestSuccess={(runId) => {
          fetchRuns();
          loadRunDetails(runId);
        }}
        onLoadSampleDemo={loadSampleData}
      />
    </div>
  );
}
