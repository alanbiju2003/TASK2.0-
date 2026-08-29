'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';

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
  orderStatus?: string | null;
  paymentStatus?: string | null;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'IGNORED';
  aiExplanation?: string | null;
}

interface DrillDownTableProps {
  discrepancies: Discrepancy[];
  onSelectDiscrepancy: (item: Discrepancy) => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}

export const DrillDownTable: React.FC<DrillDownTableProps> = ({
  discrepancies,
  onSelectDiscrepancy,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter logic
  const filteredData = useMemo(() => {
    return discrepancies.filter((item) => {
      const matchSearch =
        (item.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.paymentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === 'ALL' || item.type === selectedType;
      const matchSeverity = selectedSeverity === 'ALL' || item.severity === selectedSeverity;
      const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;

      return matchSearch && matchType && matchSeverity && matchStatus;
    });
  }, [discrepancies, searchTerm, selectedType, selectedSeverity, selectedStatus]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'IN_REVIEW':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'IGNORED':
        return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
      default:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">Discrepancy Audit Log</h2>
          <p className="text-xs text-slate-400">
            Drill-down into individual order & payment variances. Click any row for AI analysis.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order, Payment ID, Email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500/60 w-56"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500/60"
          >
            <option value="ALL">All Discrepancy Types</option>
            <option value="UNMATCHED_ORDER">Unmatched Order</option>
            <option value="UNMATCHED_PAYMENT">Unmatched Payment</option>
            <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
            <option value="DUPLICATE_PAYMENT">Duplicate Payment</option>
            <option value="STATUS_MISMATCH">Status Mismatch</option>
            <option value="FEE_LEAKAGE">Fee Leakage</option>
            <option value="CURRENCY_MISMATCH">Currency Mismatch</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500/60"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500/60"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Order Ref</th>
              <th className="py-3 px-4">Gateway Payment Ref</th>
              <th className="py-3 px-4 text-right">Store Amount</th>
              <th className="py-3 px-4 text-right">Gateway Amount</th>
              <th className="py-3 px-4 text-right">Variance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-center">AI Insights</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-xs">
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectDiscrepancy(item)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${getSeverityBadge(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                    {getTypeLabel(item.type)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {item.orderId ? (
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.orderId}
                      </span>
                    ) : (
                      <span className="text-slate-600">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {item.paymentId ? (
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {item.paymentId}
                      </span>
                    ) : (
                      <span className="text-slate-600">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-200">
                    {item.orderAmount != null ? `$${item.orderAmount.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-slate-200">
                    {item.paymentAmount != null ? `$${item.paymentAmount.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-400">
                    {item.difference !== 0 ? `$${Math.abs(item.difference).toFixed(2)}` : '$0.00'}
                  </td>
                  <td
                    className="py-3 px-4 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                      className={`px-2 py-1 text-[11px] font-semibold rounded-md border text-slate-200 bg-slate-900 focus:outline-none cursor-pointer ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_REVIEW">IN REVIEW</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="IGNORED">IGNORED</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDiscrepancy(item);
                      }}
                      className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-400 bg-indigo-950/60 hover:bg-indigo-900/80 px-2.5 py-1 rounded-lg border border-indigo-700/50 transition-all group-hover:scale-105"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Explain</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No discrepancies matched your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
        <div>
          Showing <span className="font-semibold text-slate-200">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-200">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of{' '}
          <span className="font-semibold text-slate-200">{filteredData.length}</span> discrepancies
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-300 font-medium px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
