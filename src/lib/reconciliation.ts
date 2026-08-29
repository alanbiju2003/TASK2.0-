import Papa from 'papaparse';

export interface ParsedOrder {
  orderId: string;
  customerEmail: string;
  orderDate: Date | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  rawJson: Record<string, any>;
}

export interface ParsedPayment {
  paymentId: string;
  orderIdRef: string;
  customerEmail: string;
  paymentDate: Date | null;
  amount: number;
  currency: string;
  status: string;
  feeAmount: number;
  rawJson: Record<string, any>;
}

export interface DiscrepancyResult {
  type: 'UNMATCHED_ORDER' | 'UNMATCHED_PAYMENT' | 'AMOUNT_MISMATCH' | 'DUPLICATE_PAYMENT' | 'STATUS_MISMATCH' | 'FEE_LEAKAGE' | 'CURRENCY_MISMATCH';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  orderId?: string;
  paymentId?: string;
  customerEmail?: string;
  orderAmount?: number;
  paymentAmount?: number;
  difference: number;
  orderStatus?: string;
  paymentStatus?: string;
  description: string;
  moneyAtRisk: number;
}

export interface ReconciliationEngineSummary {
  totalOrdersCount: number;
  totalPaymentsCount: number;
  totalOrdersAmount: number;
  totalPaymentsAmount: number;
  totalReconciledAmount: number;
  totalDisputedAmount: number;
  moneyAtRisk: number;
  orders: ParsedOrder[];
  payments: ParsedPayment[];
  discrepancies: DiscrepancyResult[];
}

// Normalize object key helper
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s\-_]+/g, '_');
}

function parseRowAmount(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const clean = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function parseRowDate(val: any): Date | null {
  if (!val) return null;
  const str = String(val).trim();
  
  // Handle DD/MM/YYYY or DD/MM/YYYY HH:mm
  const euroMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (euroMatch) {
    const day = parseInt(euroMatch[1], 10);
    const month = parseInt(euroMatch[2], 10) - 1;
    const year = parseInt(euroMatch[3], 10);
    const hours = parseInt(euroMatch[4] || '0', 10);
    const mins = parseInt(euroMatch[5] || '0', 10);
    const secs = parseInt(euroMatch[6] || '0', 10);
    const d = new Date(Date.UTC(year, month, day, hours, mins, secs));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function parseOrdersCSV(csvText: string): ParsedOrder[] {
  const parseResult = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return parseResult.data.map((row) => {
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalized[normalizeKey(k)] = row[k];
    });

    const rawId = normalized.order_id || normalized.orderid || normalized.id || '';
    const cleanId = String(rawId).trim().toUpperCase();

    // Prefer net_amount over gross_amount if available, fallback to amount/total
    const amountVal = normalized.net_amount ?? normalized.amount ?? normalized.gross_amount ?? normalized.total ?? normalized.order_amount;

    return {
      orderId: cleanId,
      customerEmail: String(normalized.customer_email || normalized.email || '').trim().toLowerCase(),
      orderDate: parseRowDate(normalized.order_date || normalized.date || normalized.created_at || normalized.processed_at),
      amount: parseRowAmount(amountVal),
      currency: String(normalized.currency || 'USD').trim().toUpperCase(),
      status: String(normalized.status || 'COMPLETED').trim().toUpperCase(),
      paymentMethod: String(normalized.payment_method || normalized.method || '').trim(),
      rawJson: row,
    };
  }).filter(o => o.orderId.length > 0);
}

export function parsePaymentsCSV(csvText: string): ParsedPayment[] {
  const parseResult = Papa.parse<Record<string, any>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return parseResult.data.map((row) => {
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalized[normalizeKey(k)] = row[k];
    });

    const rawPayId = normalized.transaction_ref || normalized.payment_id || normalized.paymentid || normalized.id || '';
    const rawOrderRef = normalized.order_reference || normalized.order_id || normalized.order_id_ref || normalized.order_ref || '';

    return {
      paymentId: String(rawPayId).trim().toUpperCase(),
      orderIdRef: String(rawOrderRef).trim().toUpperCase(),
      customerEmail: String(normalized.customer_email || normalized.email || '').trim().toLowerCase(),
      paymentDate: parseRowDate(normalized.processed_at || normalized.payment_date || normalized.date || normalized.created_at),
      amount: parseRowAmount(normalized.amount || normalized.total || normalized.payment_amount),
      currency: String(normalized.currency || 'USD').trim().toUpperCase(),
      status: String(normalized.status || 'SETTLED').trim().toUpperCase(),
      feeAmount: parseRowAmount(normalized.fee || normalized.fee_amount || normalized.gateway_fee),
      rawJson: row,
    };
  }).filter(p => p.paymentId.length > 0);
}

export function runReconciliation(
  orders: ParsedOrder[],
  payments: ParsedPayment[],
  options: { amountTolerance?: number; maxFeeRatio?: number } = {}
): ReconciliationEngineSummary {
  const amountTolerance = options.amountTolerance ?? 0.05;
  const maxFeeRatio = options.maxFeeRatio ?? 0.035; // 3.5% standard fee threshold

  const discrepancies: DiscrepancyResult[] = [];

  // Group payments by orderIdRef
  const paymentsByOrderRef = new Map<string, ParsedPayment[]>();
  payments.forEach((p) => {
    if (p.orderIdRef) {
      const existing = paymentsByOrderRef.get(p.orderIdRef) || [];
      existing.push(p);
      paymentsByOrderRef.set(p.orderIdRef, existing);
    }
  });

  // Track matched payment IDs
  const matchedPaymentIds = new Set<string>();
  const matchedOrderIds = new Set<string>();

  let totalReconciledAmount = 0;

  // 1. Process Orders against Payments
  orders.forEach((ord) => {
    const matchingPayments = paymentsByOrderRef.get(ord.orderId) || [];

    if (matchingPayments.length === 0) {
      // UNMATCHED ORDER: Order completed in system, no payment record
      matchedOrderIds.add(ord.orderId);
      const isPaidStatus = ['COMPLETED', 'PAID', 'FULFILLED', 'DELIVERED'].includes(ord.status);
      
      discrepancies.push({
        type: 'UNMATCHED_ORDER',
        severity: isPaidStatus ? 'CRITICAL' : 'MEDIUM',
        orderId: ord.orderId,
        customerEmail: ord.customerEmail,
        orderAmount: ord.amount,
        paymentAmount: 0,
        difference: ord.amount,
        orderStatus: ord.status,
        description: `Order ${ord.orderId} status is ${ord.status} for $${ord.amount.toFixed(2)}, but no corresponding payment record was found in the payment gateway.`,
        moneyAtRisk: isPaidStatus ? ord.amount : 0,
      });
      return;
    }

    if (matchingPayments.length > 1) {
      // DUPLICATE PAYMENT: Multiple payments captured for one order ID
      matchingPayments.forEach(p => matchedPaymentIds.add(p.paymentId));
      matchedOrderIds.add(ord.orderId);

      const totalCaptured = matchingPayments.reduce((sum, p) => sum + (p.status === 'CAPTURED' || p.status === 'SETTLED' ? p.amount : 0), 0);
      const excessCharged = Math.max(0, totalCaptured - ord.amount);

      discrepancies.push({
        type: 'DUPLICATE_PAYMENT',
        severity: 'CRITICAL',
        orderId: ord.orderId,
        paymentId: matchingPayments.map(p => p.paymentId).join(', '),
        customerEmail: ord.customerEmail,
        orderAmount: ord.amount,
        paymentAmount: totalCaptured,
        difference: totalCaptured - ord.amount,
        orderStatus: ord.status,
        paymentStatus: matchingPayments.map(p => p.status).join(', '),
        description: `Order ${ord.orderId} ($${ord.amount.toFixed(2)}) has ${matchingPayments.length} separate payment transactions captured totaling $${totalCaptured.toFixed(2)}. Customer may have been double-charged by $${excessCharged.toFixed(2)}.`,
        moneyAtRisk: excessCharged,
      });
      return;
    }

    // Exactly 1 payment found
    const pay = matchingPayments[0];
    matchedPaymentIds.add(pay.paymentId);
    matchedOrderIds.add(ord.orderId);

    const diff = Math.abs(ord.amount - pay.amount);
    let hasDiscrepancy = false;

    // Check Amount Mismatch
    if (diff > amountTolerance) {
      hasDiscrepancy = true;
      const isUnderpaid = pay.amount < ord.amount;
      discrepancies.push({
        type: 'AMOUNT_MISMATCH',
        severity: 'HIGH',
        orderId: ord.orderId,
        paymentId: pay.paymentId,
        customerEmail: ord.customerEmail || pay.customerEmail,
        orderAmount: ord.amount,
        paymentAmount: pay.amount,
        difference: ord.amount - pay.amount,
        orderStatus: ord.status,
        paymentStatus: pay.status,
        description: `Amount mismatch for order ${ord.orderId}: Order is $${ord.amount.toFixed(2)} but gateway charged $${pay.amount.toFixed(2)} (${isUnderpaid ? 'underpaid' : 'overpaid'} by $${diff.toFixed(2)}).`,
        moneyAtRisk: diff,
      });
    }

    // Check Status Mismatch
    const isOrderCancelled = ['CANCELLED', 'REFUNDED', 'VOID'].includes(ord.status);
    const isPaymentCaptured = ['CAPTURED', 'SETTLED', 'SUCCESS'].includes(pay.status);
    const isOrderCompleted = ['COMPLETED', 'PAID', 'FULFILLED'].includes(ord.status);
    const isPaymentFailed = ['FAILED', 'DECLINED', 'REFUNDED'].includes(pay.status);

    if ((isOrderCancelled && isPaymentCaptured) || (isOrderCompleted && isPaymentFailed)) {
      hasDiscrepancy = true;
      const risk = isOrderCancelled && isPaymentCaptured ? pay.amount : (isOrderCompleted && isPaymentFailed ? ord.amount : 0);
      discrepancies.push({
        type: 'STATUS_MISMATCH',
        severity: 'CRITICAL',
        orderId: ord.orderId,
        paymentId: pay.paymentId,
        customerEmail: ord.customerEmail || pay.customerEmail,
        orderAmount: ord.amount,
        paymentAmount: pay.amount,
        difference: ord.amount - pay.amount,
        orderStatus: ord.status,
        paymentStatus: pay.status,
        description: isOrderCancelled && isPaymentCaptured
          ? `Order ${ord.orderId} is ${ord.status} in store, but payment ${pay.paymentId} remains ${pay.status} (unrefunded money owed to customer).`
          : `Order ${ord.orderId} is ${ord.status} in store, but payment ${pay.paymentId} status is ${pay.status} (goods sent without settled funds).`,
        moneyAtRisk: risk,
      });
    }

    // Check Excessive Fee Leakage
    if (pay.amount > 0 && pay.feeAmount > 0) {
      const feeRatio = pay.feeAmount / pay.amount;
      if (feeRatio > maxFeeRatio) {
        hasDiscrepancy = true;
        const expectedFee = pay.amount * maxFeeRatio;
        const excessFee = pay.feeAmount - expectedFee;
        discrepancies.push({
          type: 'FEE_LEAKAGE',
          severity: 'MEDIUM',
          orderId: ord.orderId,
          paymentId: pay.paymentId,
          customerEmail: ord.customerEmail || pay.customerEmail,
          orderAmount: ord.amount,
          paymentAmount: pay.amount,
          difference: pay.feeAmount,
          orderStatus: ord.status,
          paymentStatus: pay.status,
          description: `Gateway fee for payment ${pay.paymentId} is $${pay.feeAmount.toFixed(2)} (${(feeRatio * 100).toFixed(1)}% of total transaction), exceeding the expected maximum rate threshold of ${(maxFeeRatio * 100).toFixed(1)}%. Excess fee cost: $${excessFee.toFixed(2)}.`,
          moneyAtRisk: excessFee,
        });
      }
    }

    // Check Currency Mismatch
    if (ord.currency !== pay.currency) {
      hasDiscrepancy = true;
      discrepancies.push({
        type: 'CURRENCY_MISMATCH',
        severity: 'MEDIUM',
        orderId: ord.orderId,
        paymentId: pay.paymentId,
        customerEmail: ord.customerEmail || pay.customerEmail,
        orderAmount: ord.amount,
        paymentAmount: pay.amount,
        difference: 0,
        orderStatus: ord.status,
        paymentStatus: pay.status,
        description: `Currency mismatch for order ${ord.orderId}: Store currency is ${ord.currency} while Payment Gateway charged in ${pay.currency}.`,
        moneyAtRisk: 0,
      });
    }

    if (!hasDiscrepancy) {
      totalReconciledAmount += ord.amount;
    }
  });

  // 2. Identify Unmatched Payments (Payments without any Store Order)
  payments.forEach((p) => {
    if (!matchedPaymentIds.has(p.paymentId)) {
      discrepancies.push({
        type: 'UNMATCHED_PAYMENT',
        severity: 'HIGH',
        paymentId: p.paymentId,
        orderId: p.orderIdRef || 'NONE',
        customerEmail: p.customerEmail,
        orderAmount: 0,
        paymentAmount: p.amount,
        difference: -p.amount,
        paymentStatus: p.status,
        description: `Payment ${p.paymentId} for $${p.amount.toFixed(2)} was captured in gateway, but no corresponding order exists in the store system (orphan payment / ghost charge).`,
        moneyAtRisk: p.amount,
      });
    }
  });

  // Financial totals
  const totalOrdersAmount = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDisputedAmount = discrepancies.reduce((sum, d) => sum + (d.orderAmount || d.paymentAmount || 0), 0);
  const moneyAtRisk = discrepancies.reduce((sum, d) => sum + d.moneyAtRisk, 0);

  return {
    totalOrdersCount: orders.length,
    totalPaymentsCount: payments.length,
    totalOrdersAmount,
    totalPaymentsAmount,
    totalReconciledAmount,
    totalDisputedAmount,
    moneyAtRisk,
    orders,
    payments,
    discrepancies,
  };
}
