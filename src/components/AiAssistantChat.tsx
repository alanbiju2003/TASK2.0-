'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Shield, AlertCircle, RefreshCw } from 'lucide-react';

interface AiAssistantChatProps {
  runId?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantChat: React.FC<AiAssistantChatProps> = ({ runId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your LedgerPulse AI Financial Audit Assistant. Ask me anything specifically about your store orders, gateway payments, discrepancies, or revenue risk in this project.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim().substring(0, 300);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, runId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send query.');
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error communicating with AI assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-600/30 border border-blue-400/30 transition-all hover:scale-105 active:scale-95 group"
        >
          <Sparkles className="w-4 h-4 text-blue-100 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold tracking-wide">Ask Audit AI</span>
          <span className="bg-blue-800 text-[10px] text-blue-100 px-2 py-0.5 rounded-full font-mono">
            Project Scope
          </span>
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className="bg-white w-[380px] sm:w-[420px] h-[520px] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-1">
                  <span>Audit AI Assistant</span>
                  <Shield className="w-3 h-3 text-emerald-400 inline" />
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">Project Audit • Token Guarded</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Reminder Banner */}
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-[10px] text-blue-800 flex items-center justify-between font-medium">
            <span>Scope: Strictly limited to project audit & discrepancies</span>
            <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">Max 200 Tokens</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-normal'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">{msg.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-slate-600 p-2.5 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Analyzing project audit data...</span>
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Ask about unmatched orders, fee leakage..."
              value={input}
              maxLength={300}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
