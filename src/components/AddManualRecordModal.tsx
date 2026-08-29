'use client';

import React, { useState } from 'react';
import { X, Plus, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, CreditCard } from 'lucide-react';

interface AddManualRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (runId: string) => void;
}

export const AddManualRecordModal: React.FC<AddManualRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recordType, setRecordType] = useState<'ORDER' | 'PAYMENT'>('ORDER');
  const [id, setId] = useState('');
  const [refId, setRefId] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [status, setStatus] = useState('COMPLETED');
  const [fee, setFee] = useState('0');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !amount.trim()) {
      setError('ID and Amount are required fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/raw/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordType,
          id: id.trim(),
          refId: refId.trim(),
          email: email.trim(),
          amount: parseFloat(amount),
          currency,
          status,
          fee: parseFloat(fee || '0'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save record.');
      }

      onSuccess(data.runId);
      onClose();
      setId('');
      setRefId('');
      setEmail('');
      setAmount('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error saving manual record.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Manual Database Record</h3>
              <p className="text-xs text-slate-500 font-medium">Insert a custom order or payment to test audit engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Record Type Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setRecordType('ORDER');
                setStatus('COMPLETED');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                recordType === 'ORDER' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Store Order Record</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRecordType('PAYMENT');
                setStatus('SETTLED');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                recordType === 'PAYMENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Gateway Payment Record</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {recordType === 'ORDER' ? 'Order ID *' : 'Transaction Ref *'}
              </label>
              <input
                type="text"
                required
                placeholder={recordType === 'ORDER' ? 'ORD-9999' : 'TXN800999'}
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            {recordType === 'PAYMENT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Order Reference</label>
                <input
                  type="text"
                  placeholder="ORD-9999"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className={recordType === 'ORDER' ? 'col-span-2' : ''}>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Email</label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="199.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
              >
                {recordType === 'ORDER' ? (
                  <>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </>
                ) : (
                  <>
                    <option value="SETTLED">SETTLED</option>
                    <option value="CAPTURED">CAPTURED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="PENDING">PENDING</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {recordType === 'PAYMENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gateway Processing Fee ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="5.50"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !id.trim() || !amount.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving & Auditing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save & Run Audit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
