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
  difference?: number;
  orderAmount?: number | null;
  paymentAmount?: number | null;
  severity?: string;
}

interface DiscrepancyChartsProps {
  discrepancies: DiscrepancyItem[];
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  UNMATCHED_ORDER: { label: 'Unmatched Order', color: '#f43f5e' }, // Rose
  UNMATCHED_PAYMENT: { label: 'Unmatched Payment', color: '#f59e0b' }, // Amber
  AMOUNT_MISMATCH: { label: 'Amount Mismatch', color: '#3b82f6' }, // Blue
  DUPLICATE_PAYMENT: { label: 'Duplicate Payment', color: '#ec4899' }, // Pink
  STATUS_MISMATCH: { label: 'Status Mismatch', color: '#a855f7' }, // Purple
  FEE_LEAKAGE: { label: 'Fee Leakage', color: '#10b981' }, // Emerald
  CURRENCY_MISMATCH: { label: 'Currency Mismatch', color: '#06b6d4' }, // Cyan
};

export const DiscrepancyCharts: React.FC<DiscrepancyChartsProps> = ({ discrepancies }) => {
  // Aggregate count by type
  const typeCounts: Record<string, number> = {};
  const typeRisk: Record<string, number> = {};

  discrepancies.forEach((d) => {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    const riskVal = Math.abs(d.difference || d.orderAmount || d.paymentAmount || 0);
    typeRisk[d.type] = (typeRisk[d.type] || 0) + riskVal;
  });

  const pieData = Object.keys(typeCounts).map((type) => ({
    name: TYPE_LABELS[type]?.label || type,
    value: typeCounts[type],
    color: TYPE_LABELS[type]?.color || '#94a3b8',
  }));

  const barData = Object.keys(typeRisk).map((type) => ({
    name: TYPE_LABELS[type]?.label || type,
    risk: typeRisk[type],
    color: TYPE_LABELS[type]?.color || '#3b82f6',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Donut Chart - Count by Discrepancy Type */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
          Discrepancy Breakdown by Type
        </h3>
        <p className="text-xs text-slate-400 mb-4">Volume distribution across discrepancy categories</p>
        
        <div className="h-[240px] w-full flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`${value} discrepancies`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-500">No discrepancies detected</div>
          )}
        </div>

        {/* Custom Legend */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 truncate">{item.name}:</span>
              <span className="font-semibold text-slate-100">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Bar Chart - Financial Risk by Category */}
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-1">
          Financial Risk Exposure ($)
        </h3>
        <p className="text-xs text-slate-400 mb-4">Money at risk distribution across discrepancy types</p>

        <div className="h-[240px] w-full">
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Money at Risk']}
                />
                <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-slate-500 h-full flex items-center justify-center">No risk data available</div>
          )}
        </div>
      </div>
    </div>
  );
};
