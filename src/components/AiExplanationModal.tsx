'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, ShieldCheck, FileText, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Discrepancy } from './DrillDownTable';

interface AiExplanationModalProps {
  discrepancy: Discrepancy | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: Discrepancy['status']) => void;
}

interface LLMOutput {
  summary: string;
  probableRootCause: string;
  businessImpact: string;
  recommendedActions: string[];
}

export const AiExplanationModal: React.FC<AiExplanationModalProps> = ({
  discrepancy,
  onClose,
  onUpdateStatus,
}) => {
  const [explanation, setExplanation] = useState<LLMOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (discrepancy) {
      fetchExplanation(discrepancy);
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [discrepancy]);

  const fetchExplanation = async (item: Discrepancy) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discrepancyId: item.id,
          type: item.type,
          severity: item.severity,
          orderId: item.orderId,
          paymentId: item.paymentId,
          customerEmail: item.customerEmail,
          orderAmount: item.orderAmount,
          paymentAmount: item.paymentAmount,
          difference: item.difference,
          orderStatus: item.orderStatus,
          paymentStatus: item.paymentStatus,
          description: item.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI explanation.');
      }

      setExplanation(data.explanation);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating AI audit explanation.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!discrepancy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white max-w-3xl w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>AI Root Cause & Resolution Audit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  {discrepancy.severity} RISK
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Ref: {discrepancy.orderId || discrepancy.paymentId || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Side-by-Side Transaction Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Order System Record */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Store Order System</span>
                <span className="text-[11px] font-mono font-semibold text-slate-700">{discrepancy.orderId || 'NOT FOUND'}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded Net Amount:</span>
                  <span className="font-bold text-slate-900">
                    {discrepancy.orderAmount != null ? `$${discrepancy.orderAmount.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Store Status:</span>
                  <span className="font-semibold text-blue-700 uppercase">{discrepancy.orderStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Email:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[140px]">{discrepancy.customerEmail || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Gateway Processor Record */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Processor</span>
                <span className="text-[11px] font-mono font-semibold text-slate-700">{discrepancy.paymentId || 'NOT FOUND'}</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Captured Amount:</span>
                  <span className="font-bold text-slate-900">
                    {discrepancy.paymentAmount != null ? `$${discrepancy.paymentAmount.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway Status:</span>
                  <span className="font-semibold text-indigo-700 uppercase">{discrepancy.paymentStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Financial Variance:</span>
                  <span className="font-bold text-rose-600">
                    ${Math.abs(discrepancy.difference).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Engine Audit Finding Banner */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Deterministic Engine Finding</h4>
            <p className="text-xs text-blue-950 leading-relaxed font-medium">{discrepancy.description}</p>
          </div>

          {/* AI Explanation Area */}
          {isLoading && (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-600 font-semibold">Generating LLM Financial Analysis & Root Cause...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchExplanation(discrepancy)}
                className="px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {explanation && !isLoading && (
            <div className="space-y-5 animate-fadeIn">
              {/* Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">1. Executive Summary</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {explanation.summary}
                </p>
              </div>

              {/* Probable Root Cause */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">2. Technical & Operational Root Cause</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {explanation.probableRootCause}
                </p>
              </div>

              {/* Business & Risk Impact */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">3. Business Risk & Financial Impact</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {explanation.businessImpact}
                </p>
              </div>

              {/* Recommended Action Plan */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">4. Recommended Action Protocol</h4>
                <div className="space-y-2">
                  {explanation.recommendedActions.map((action, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 bg-blue-50/40 border border-blue-100 p-3 rounded-xl text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span className="font-medium">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Update Status:</span>
            <select
              value={discrepancy.status}
              onChange={(e) => {
                onUpdateStatus(discrepancy.id, e.target.value as Discrepancy['status']);
                onClose();
              }}
              className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-800 cursor-pointer shadow-sm"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="IGNORED">IGNORED</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm"
          >
            Close Audit Window
          </button>
        </div>
      </div>
    </div>
  );
};
