'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, FileText, CheckSquare } from 'lucide-react';
import { Discrepancy } from './DrillDownTable';

interface AiExplanationModalProps {
  discrepancy: Discrepancy | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: string) => void;
}

interface LLMExplanation {
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
  const [explanation, setExplanation] = useState<LLMExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (discrepancy) {
      // Check if existing explanation is cached
      if (discrepancy.aiExplanation) {
        try {
          const parsed = JSON.parse(discrepancy.aiExplanation);
          setExplanation(parsed);
          setError(null);
          return;
        } catch (e) {
          // ignore error, fetch fresh
        }
      }
      // Otherwise trigger AI explanation
      fetchExplanation(discrepancy.id);
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [discrepancy]);

  const fetchExplanation = async (discrepancyId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discrepancyId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI explanation.');
      }
      setExplanation(data.explanation);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with AI service.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!discrepancy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel max-w-3xl w-full rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-100">{discrepancy.type.replace(/_/g, ' ')}</h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                    discrepancy.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {discrepancy.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Ref ID: {discrepancy.orderId || discrepancy.paymentId || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status Changer */}
            <select
              value={discrepancy.status}
              onChange={(e) => onUpdateStatus(discrepancy.id, e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="OPEN">Status: OPEN</option>
              <option value="IN_REVIEW">Status: IN REVIEW</option>
              <option value="RESOLVED">Status: RESOLVED</option>
              <option value="IGNORED">Status: IGNORED</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Side-by-Side Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Order System */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Store Order System</span>
                <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                  {discrepancy.orderStatus || 'N/A'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-mono font-medium">{discrepancy.orderId || 'NOT FOUND'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Email:</span>
                  <span>{discrepancy.customerEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Order Total Amount:</span>
                  <span className="font-bold text-slate-100">
                    {discrepancy.orderAmount != null ? `$${discrepancy.orderAmount.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Processor */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Payment Processor</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  {discrepancy.paymentStatus || 'N/A'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Transaction ID:</span>
                  <span className="font-mono font-medium">{discrepancy.paymentId || 'NOT FOUND'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Email:</span>
                  <span>{discrepancy.customerEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Captured Amount:</span>
                  <span className="font-bold text-slate-100">
                    {discrepancy.paymentAmount != null ? `$${discrepancy.paymentAmount.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Variance Banner */}
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="font-semibold">Reconciliation Engine Variance:</span>
              <span className="text-slate-300">{discrepancy.description}</span>
            </div>
            <span className="font-bold text-rose-300 font-mono text-sm ml-2">
              ${Math.abs(discrepancy.difference).toFixed(2)}
            </span>
          </div>

          {/* AI Explanation Card */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 p-5 rounded-xl border border-indigo-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider">AI Plain-Language Analysis & Action Plan</h4>
              </div>
              <button
                onClick={() => fetchExplanation(discrepancy.id)}
                disabled={isLoading}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-analyze</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                <p className="text-xs text-slate-400 font-medium">Generating financial controller explanation via AI...</p>
              </div>
            ) : error ? (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300">
                {error}
              </div>
            ) : explanation ? (
              <div className="space-y-4 text-xs">
                {/* Summary */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">What Happened</h5>
                  <p className="text-slate-200 leading-relaxed font-medium bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    {explanation.summary}
                  </p>
                </div>

                {/* Root Cause & Business Impact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <h5 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Probable Root Cause</h5>
                    <p className="text-slate-300 leading-relaxed">{explanation.probableRootCause}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <h5 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">Business Impact</h5>
                    <p className="text-slate-300 leading-relaxed">{explanation.businessImpact}</p>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div>
                  <h5 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Recommended Resolution Checklist</span>
                  </h5>
                  <ul className="space-y-1.5">
                    {explanation.recommendedActions.map((action, idx) => (
                      <li key={idx} className="flex items-start space-x-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-slate-200">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Powered by Deterministic Audit Engine + OpenAI AI Explainer</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
