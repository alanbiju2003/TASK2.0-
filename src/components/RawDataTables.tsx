'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileSpreadsheet, CreditCard, ArrowUpDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

export interface RawOrderRecord {
  id: string;
  orderId: string;
  customerEmail?: string | null;
  orderDate?: string | Date | null;
  amount: number;
  currency: string;
  status: string;
}

export interface RawPaymentRecord {
  id: string;
  paymentId: string;
  orderIdRef?: string | null;
  customerEmail?: string | null;
  paymentDate?: string | Date | null;
  amount: number;
  currency: string;
  status: string;
  feeAmount: number;
}

interface RawOrdersTableProps {
  orders: RawOrderRecord[];
}

export const RawOrdersTable: React.FC<RawOrdersTableProps> = ({ orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof RawOrderRecord>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        return (
          o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (o.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [orders, searchTerm, sortField, sortOrder]);

  const totalItems = filteredOrders.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / pageSize) || 1;

  const paginatedOrders = useMemo(() => {
    if (pageSize === 'ALL') return filteredOrders;
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const toggleSort = (field: keyof RawOrderRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Raw Order ID, Customer Email, Status..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
              setPageSize(val);
              setCurrentPage(1);
            }}
            className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-slate-700"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value="ALL">Show All Records</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Customer Email</th>
              <th className="py-3 px-4">Order Date</th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Net Amount</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Currency</th>
              <th className="py-3 px-4">Store Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No raw store order records found in database.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-700">{o.orderId}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{o.customerEmail || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {o.orderDate ? new Date(o.orderDate).toLocaleString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">${o.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700">
                      {o.currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-700 uppercase">{o.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing <strong className="text-slate-800">{paginatedOrders.length}</strong> of{' '}
          <strong className="text-slate-800">{totalItems}</strong> raw order records
        </div>
        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface RawPaymentsTableProps {
  payments: RawPaymentRecord[];
}

export const RawPaymentsTable: React.FC<RawPaymentsTableProps> = ({ payments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof RawPaymentRecord>('amount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        return (
          p.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.orderIdRef || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.status || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? 0;
        const valB = b[sortField] ?? 0;
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [payments, searchTerm, sortField, sortOrder]);

  const totalItems = filteredPayments.length;
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(totalItems / pageSize) || 1;

  const paginatedPayments = useMemo(() => {
    if (pageSize === 'ALL') return filteredPayments;
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const toggleSort = (field: keyof RawPaymentRecord) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Transaction Ref, Order Ref, Email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-slate-300 shadow-sm text-xs text-slate-700">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
              setPageSize(val);
              setCurrentPage(1);
            }}
            className="bg-transparent focus:outline-none text-xs font-semibold cursor-pointer text-slate-700"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value="ALL">Show All Records</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Transaction Ref</th>
              <th className="py-3 px-4">Order Reference</th>
              <th className="py-3 px-4">Processed Date</th>
              <th className="py-3 px-4 text-right cursor-pointer" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end space-x-1">
                  <span>Captured Amount</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Gateway Fee</th>
              <th className="py-3 px-4">Currency</th>
              <th className="py-3 px-4">Gateway Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No raw gateway payment records found in database.
                </td>
              </tr>
            ) : (
              paginatedPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{p.paymentId}</td>
                  <td className="py-3.5 px-4 font-mono text-blue-700 font-semibold">{p.orderIdRef || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">${p.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-600">${p.feeAmount.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700">
                      {p.currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-700 uppercase">{p.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Showing <strong className="text-slate-800">{paginatedPayments.length}</strong> of{' '}
          <strong className="text-slate-800">{totalItems}</strong> raw payment records
        </div>
        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
