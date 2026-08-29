'use client';

import React from 'react';
import { DollarSign, AlertOctagon, ShieldCheck, FileSpreadsheet, CreditCard } from 'lucide-react';

interface KpiCardsProps {
  totalOrdersCount: number;
  totalOrdersAmount: number;
  totalPaymentsCount: number;
  totalPaymentsAmount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalOrdersCount,
  totalOrdersAmount,
  totalPaymentsCount,
  totalPaymentsAmount,
  totalReconciledAmount,
  totalDisputedAmount,
  moneyAtRisk,
}) => {
  const reconciledPercentage = totalOrdersAmount > 0 
    ? Math.min(100, Math.round((totalReconciledAmount / totalOrdersAmount) * 100)) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Orders */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Store Sales</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            ${totalOrdersAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            <span className="font-semibold text-slate-700">{totalOrdersCount}</span> store orders processed
          </p>
        </div>
      </div>

      {/* 2. Total Payments */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gateway Captures</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            ${totalPaymentsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            <span className="font-semibold text-slate-700">{totalPaymentsCount}</span> gateway transactions
          </p>
        </div>
      </div>

      {/* 3. Reconciled Value */}
      <div className="glass-card p-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 to-white relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Reconciled Value</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-emerald-950 tracking-tight">
            ${totalReconciledAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="mt-2 flex items-center space-x-2">
            <div className="flex-1 bg-emerald-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${reconciledPercentage}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700">{reconciledPercentage}% Matched</span>
          </div>
        </div>
      </div>

      {/* 4. Value in Dispute */}
      <div className="glass-card p-5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Disputed Value</span>
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-amber-950 tracking-tight">
            ${totalDisputedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-amber-700 font-medium mt-1">Requires audit resolution</p>
        </div>
      </div>

      {/* 5. Money at Risk */}
      <div className="glass-card p-5 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/60 to-white relative overflow-hidden shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Money at Risk</span>
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-rose-950 tracking-tight">
            ${moneyAtRisk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-rose-700 font-semibold mt-1">Critical financial risk exposure</p>
        </div>
      </div>
    </div>
  );
};
