import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { runReconciliation, ParsedOrder, ParsedPayment } from '@/lib/reconciliation';

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userPayload.userId;
    const body = await req.json();
    const { recordType, id, refId, email, amount, currency, status, fee } = body;

    if (!id || amount == null) {
      return NextResponse.json({ error: 'Record ID and Amount are required fields.' }, { status: 400 });
    }

    if (recordType === 'ORDER') {
      await prisma.rawOrder.create({
        data: {
          userId,
          orderId: id.trim(),
          customerEmail: email ? email.trim() : null,
          amount: Number(amount),
          currency: currency || 'USD',
          status: status || 'COMPLETED',
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          level: 'INFO',
          event: 'MANUAL_ORDER_ADDED',
          message: `Manually added store order record ${id} ($${Number(amount).toFixed(2)})`,
        },
      });
    } else if (recordType === 'PAYMENT') {
      await prisma.rawPayment.create({
        data: {
          userId,
          paymentId: id.trim(),
          orderIdRef: refId ? refId.trim() : null,
          customerEmail: email ? email.trim() : null,
          amount: Number(amount),
          currency: currency || 'USD',
          status: status || 'SETTLED',
          feeAmount: fee ? Number(fee) : 0,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          level: 'INFO',
          event: 'MANUAL_PAYMENT_ADDED',
          message: `Manually added gateway payment transaction ${id} ($${Number(amount).toFixed(2)})`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid recordType. Must be ORDER or PAYMENT.' }, { status: 400 });
    }

    // Re-run reconciliation engine on updated raw records in DB
    const dbOrders = await prisma.rawOrder.findMany({ where: { userId } });
    const dbPayments = await prisma.rawPayment.findMany({ where: { userId } });

    const parsedOrders: ParsedOrder[] = dbOrders.map((o) => ({
      orderId: o.orderId,
      customerEmail: o.customerEmail || '',
      orderDate: o.orderDate,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      paymentMethod: o.paymentMethod || 'card',
      rawJson: {},
    }));

    const parsedPayments: ParsedPayment[] = dbPayments.map((p) => ({
      paymentId: p.paymentId,
      orderIdRef: p.orderIdRef || '',
      customerEmail: p.customerEmail || '',
      paymentDate: p.paymentDate,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      feeAmount: p.feeAmount,
      rawJson: {},
    }));

    const reconSummary = runReconciliation(parsedOrders, parsedPayments);

    // Save updated run
    const run = await prisma.reconciliationRun.create({
      data: {
        userId,
        name: `Manual Record Audit (${new Date().toLocaleTimeString()})`,
        totalOrdersCount: reconSummary.totalOrdersCount,
        totalPaymentsCount: reconSummary.totalPaymentsCount,
        totalOrdersAmount: reconSummary.totalOrdersAmount,
        totalPaymentsAmount: reconSummary.totalPaymentsAmount,
        totalReconciledAmount: reconSummary.totalReconciledAmount,
        totalDisputedAmount: reconSummary.totalDisputedAmount,
        moneyAtRisk: reconSummary.moneyAtRisk,
        discrepancies: {
          create: reconSummary.discrepancies.map((d) => ({
            userId,
            type: d.type,
            severity: d.severity,
            orderId: d.orderId || null,
            paymentId: d.paymentId || null,
            customerEmail: d.customerEmail || null,
            orderAmount: d.orderAmount ?? null,
            paymentAmount: d.paymentAmount ?? null,
            difference: d.difference,
            orderStatus: d.orderStatus || null,
            paymentStatus: d.paymentStatus || null,
            description: d.description,
            status: 'OPEN',
          })),
        },
      },
      include: { discrepancies: true },
    });

    return NextResponse.json({
      success: true,
      message: `Manual ${recordType} record saved and audit re-calculated cleanly.`,
      runId: run.id,
    });
  } catch (error: any) {
    console.error('Manual Add Record error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add manual record.' }, { status: 500 });
  }
}
