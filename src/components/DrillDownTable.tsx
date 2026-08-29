'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

export interface Discrepancy {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  orderId?: string | null;
  paymentId?: string | null;
  customerEmail?: string | null;
  orderAmount?: number | null;
  paymentAmount?: number | null;
  difference: number;
  currency?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'IGNORED';
  aiExplanation?: string | null;
}

interface DrillDownTableProps {
  discrepancies: Discrepancy[];
  onSelectDiscrepancy: (discrepancy: Discrepancy) => void;
  onUpdateStatus: (id: string, newStatus: Discrepancy['status']) => void;
}

const SEVERITY_BADGES: Record<string, string> = {
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_BADGES: Record<string, string> = {
  OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IGNORED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  UNMATCHED_ORDER: 'Unmatched Order',
  UNMATCHED_PAYMENT: 'Unmatched Payment',
  DUPLICATE_PAYMENT: 'Duplicate Payment',
  AMOUNT_MISMATCH: 'Amount Mismatch',
  STATUS_MISMATCH: 'Status Mismatch',
  FEE_LEAKAGE: 'Fee Leakage',
  CURRENCY_MISMATCH: 'Currency Mismatch',
};

export const DrillDownTable: React.FC<DrillDownTableProps> = ({
  discrepancies,
  onSelectDiscrepancy,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Discrepancy>('difference');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtering & Sorting Logic
  const filteredDiscrepancies = useMemo(() => {
    return discrepancies
      .filter((item) => {
        const matchesSearch =
          (item.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.paymentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

        return matchesSearch && matchesType && matchesSeverity && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [discrepancies, searchTerm, typeFilter, severityFilter, statusFilter, sortField, sortOrder]);

  const toggleSort = (field: keyof Discrepancy) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Table Toolbar Controls */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order ID, Payment Ref, Customer Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-slate-700"
            >
              <option value="ALL">All Discrepancy Types</option>
              {Object.keys(TYPE_LABELS).map((key) => (
                <option key={key} value={key}>
                  {TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-slate-700"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-slate-700"
            >
              <option value="ALL">All Audit Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="IGNORED">Ignored</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Discrepancy Type</th>
              <th className="py-3 px-4">Store Order ID</th>
              <th className="py-3 px-4">Gateway Payment Ref</th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('orderAmount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Store Net ($)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('paymentAmount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Gateway Amount ($)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('difference')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Variance / Risk ($)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Audit Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredDiscrepancies.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No audit discrepancies match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredDiscrepancies.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Severity Badge */}
                  <td className="py-3.5 px-4 font-semibold">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        SEVERITY_BADGES[item.severity] || SEVERITY_BADGES.LOW
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>

                  {/* Discrepancy Type */}
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    {TYPE_LABELS[item.type] || item.type}
                  </td>

                  {/* Order ID */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">
                    {item.orderId || <span className="text-slate-400 font-sans font-normal">—</span>}
                  </td>

                  {/* Payment ID */}
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {item.paymentId || <span className="text-slate-400 font-sans font-normal">—</span>}
                  </td>

                  {/* Store Amount */}
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                    {item.orderAmount != null ? (
                      <span>
                        ${item.orderAmount.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-400 font-mono font-normal">USD</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Gateway Amount */}
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                    {item.paymentAmount != null ? (
                      <span>
                        ${item.paymentAmount.toFixed(2)}{' '}
                        <span className="text-[10px] text-slate-400 font-mono font-normal">USD</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Difference / Risk */}
                  <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                    {item.difference !== 0 ? `$${Math.abs(item.difference).toFixed(2)}` : '$0.00'}
                  </td>

                  {/* Audit Status Dropdown */}
                  <td className="py-3.5 px-4">
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value as Discrepancy['status'])}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer focus:outline-none ${
                        STATUS_BADGES[item.status] || STATUS_BADGES.OPEN
                      }`}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_REVIEW">IN REVIEW</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="IGNORED">IGNORED</option>
                    </select>
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectDiscrepancy(item)}
                      className="px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all inline-flex items-center space-x-1.5 shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI Audit Explainer</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800">{filteredDiscrepancies.length}</strong> of{' '}
          <strong className="text-slate-800">{discrepancies.length}</strong> audit discrepancies
        </span>
        <span className="font-mono text-[11px]">Click "AI Audit Explainer" for transaction root cause</span>
      </div>
    </div>
  );
};
