'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface DiscrepancyItem {
  type: string;
  severity: string;
  difference?: number;
  moneyAtRisk?: number;
}

interface DiscrepancyChartsProps {
  discrepancies: DiscrepancyItem[];
}

const TYPE_LABELS: Record<string, string> = {
  UNMATCHED_ORDER: 'Unmatched Store Order',
  UNMATCHED_PAYMENT: 'Unmatched Gateway Payment',
  DUPLICATE_PAYMENT: 'Duplicate Payment Capture',
  AMOUNT_MISMATCH: 'Amount Misalignment',
  STATUS_MISMATCH: 'Status Mismatch',
  FEE_LEAKAGE: 'Gateway Fee Leakage',
  CURRENCY_MISMATCH: 'Currency Mismatch',
};

const COLOR_PALETTE: Record<string, string> = {
  UNMATCHED_ORDER: '#ef4444', // red
  UNMATCHED_PAYMENT: '#f97316', // orange
  DUPLICATE_PAYMENT: '#eab308', // yellow
  AMOUNT_MISMATCH: '#3b82f6', // blue
  STATUS_MISMATCH: '#8b5cf6', // purple
  FEE_LEAKAGE: '#ec4899', // pink
  CURRENCY_MISMATCH: '#06b6d4', // cyan
};

export const DiscrepancyCharts: React.FC<DiscrepancyChartsProps> = ({ discrepancies }) => {
  // Aggregate counts by type
  const typeCounts: Record<string, number> = {};
  const typeRisk: Record<string, number> = {};

  discrepancies.forEach((item) => {
    const risk = item.moneyAtRisk ?? Math.abs(item.difference || 0);
    typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    typeRisk[item.type] = (typeRisk[item.type] || 0) + risk;
  });

  const donutData = Object.keys(typeCounts).map((key) => ({
    name: TYPE_LABELS[key] || key,
    count: typeCounts[key],
    color: COLOR_PALETTE[key] || '#64748b',
  }));

  const barData = Object.keys(typeRisk).map((key) => ({
    name: TYPE_LABELS[key] || key,
    risk: typeRisk[key],
    color: COLOR_PALETTE[key] || '#64748b',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Donut Chart */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Discrepancy Distribution by Type</h3>
        <p className="text-xs text-slate-500 mb-4">Frequency count of audit mismatches identified</p>

        {donutData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No discrepancy data available
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Money at Risk by Category ($)</h3>
        <p className="text-xs text-slate-500 mb-4">Total financial risk exposure per issue type</p>

        {barData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            No financial risk data available
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [
                    `$${Number(value || 0).toFixed(2)}`,
                    'Money at Risk',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    color: '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
