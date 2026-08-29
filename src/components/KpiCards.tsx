'use client';

import React from 'react';
import { ShoppingBag, CreditCard, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface KpiCardsProps {
  totalOrdersCount: number;
  totalOrdersAmount: number;
  totalPaymentsCount: number;
  totalPaymentsAmount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
  discrepancyCount: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalOrdersCount,
  totalOrdersAmount,
  totalPaymentsCount,
  totalPaymentsAmount,
  totalReconciledAmount,
  totalDisputedAmount,
  moneyAtRisk,
  discrepancyCount,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const reconciledRatio = totalOrdersAmount > 0 
    ? ((totalReconciledAmount / totalOrdersAmount) * 100).toFixed(1) 
    : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Orders */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</span>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(totalOrdersAmount)}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-400 font-medium">
            <span className="text-blue-400 font-semibold">{totalOrdersCount}</span>
            <span className="ml-1">orders recorded</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-60"></div>
      </div>

      {/* 2. Total Payments */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payments</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(totalPaymentsAmount)}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-400 font-medium">
            <span className="text-emerald-400 font-semibold">{totalPaymentsCount}</span>
            <span className="ml-1">gateway charges</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-60"></div>
      </div>

      {/* 3. Reconciled Value */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reconciled Value</span>
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(totalReconciledAmount)}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-400 font-medium">
            <span className="text-teal-400 font-semibold">{reconciledRatio}%</span>
            <span className="ml-1">matched & verified</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400 opacity-60"></div>
      </div>

      {/* 4. Value in Dispute */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Value in Dispute</span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-slate-100 tracking-tight">
            {formatCurrency(totalDisputedAmount)}
          </div>
          <div className="mt-1 flex items-center text-xs text-slate-400 font-medium">
            <span className="text-amber-400 font-semibold">{discrepancyCount}</span>
            <span className="ml-1">discrepancies found</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400 opacity-60"></div>
      </div>

      {/* 5. Money at Risk */}
      <div className="glass-card p-5 rounded-2xl relative overflow-hidden group transition-all bg-gradient-to-br from-rose-950/30 to-slate-900/60 border-rose-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Money at Risk</span>
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-rose-200 tracking-tight">
            {formatCurrency(moneyAtRisk)}
          </div>
          <div className="mt-1 flex items-center text-xs text-rose-300/80 font-medium">
            <span>Direct financial exposure</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 to-red-500"></div>
      </div>
    </div>
  );
};
