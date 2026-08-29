import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { parseOrdersCSV, parsePaymentsCSV, runReconciliation } from '@/lib/reconciliation';
import { sendReconciliationAlertEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    let ordersCsvText = '';
    let paymentsCsvText = '';
    let batchName = 'Reconciliation Batch ' + new Date().toLocaleString();

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const ordersFile = formData.get('ordersFile') as File | null;
      const paymentsFile = formData.get('paymentsFile') as File | null;

      if (!ordersFile || !paymentsFile) {
        return NextResponse.json({ error: 'Both orders.csv and payments.csv files are required.' }, { status: 400 });
      }

      ordersCsvText = await ordersFile.text();
      paymentsCsvText = await paymentsFile.text();
      if (formData.get('name')) {
        batchName = String(formData.get('name'));
      }
    } else {
      const body = await req.json();
      ordersCsvText = body.ordersCsv;
      paymentsCsvText = body.paymentsCsv;
      if (body.name) batchName = body.name;
    }

    if (!ordersCsvText || !paymentsCsvText) {
      return NextResponse.json({ error: 'Missing orders or payments CSV data.' }, { status: 400 });
    }

    // 1. Parse CSVs
    const orders = parseOrdersCSV(ordersCsvText);
    const payments = parsePaymentsCSV(paymentsCsvText);

    if (orders.length === 0 && payments.length === 0) {
      return NextResponse.json({ error: 'Both CSV files appear to be empty or malformed.' }, { status: 400 });
    }

    // 2. Save Raw Datasets into Database
    await prisma.rawOrder.deleteMany({ where: { userId: userPayload.userId } });
    await prisma.rawPayment.deleteMany({ where: { userId: userPayload.userId } });

    await prisma.rawOrder.createMany({
      data: orders.map((o) => ({
        userId: userPayload.userId,
        orderId: o.orderId,
        customerEmail: o.customerEmail || null,
        orderDate: o.orderDate ? new Date(o.orderDate) : null,
        amount: o.amount ?? 0,
        currency: o.currency || 'USD',
        status: o.status || 'COMPLETED',
      })),
    });

    await prisma.rawPayment.createMany({
      data: payments.map((p) => ({
        userId: userPayload.userId,
        paymentId: p.paymentId || 'PAY-REF',
        orderIdRef: p.orderIdRef || null,
        customerEmail: p.customerEmail || null,
        paymentDate: p.paymentDate ? new Date(p.paymentDate) : null,
        amount: p.amount,
        currency: p.currency || 'USD',
        status: p.status || 'SETTLED',
        feeAmount: p.feeAmount || 0,
      })),
    });

    // 3. Run Reconciliation Engine
    const reconSummary = runReconciliation(orders, payments);

    // 4. Save Reconciliation Run & Discrepancies to Database
    const run = await prisma.reconciliationRun.create({
      data: {
        userId: userPayload.userId,
        name: batchName,
        totalOrdersCount: reconSummary.totalOrdersCount,
        totalPaymentsCount: reconSummary.totalPaymentsCount,
        totalOrdersAmount: reconSummary.totalOrdersAmount,
        totalPaymentsAmount: reconSummary.totalPaymentsAmount,
        totalReconciledAmount: reconSummary.totalReconciledAmount,
        totalDisputedAmount: reconSummary.totalDisputedAmount,
        moneyAtRisk: reconSummary.moneyAtRisk,
        discrepancies: {
          create: reconSummary.discrepancies.map((d) => ({
            userId: userPayload.userId,
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
      include: {
        discrepancies: true,
      },
    });

    // 5. Create System Audit Log Entry
    const logEntry = await prisma.auditLog.create({
      data: {
        userId: userPayload.userId,
        level: reconSummary.moneyAtRisk > 0 ? 'WARNING' : 'SUCCESS',
        event: 'RECONCILIATION_RUN_COMPLETED',
        message: `Reconciliation run "${batchName}" completed. ${reconSummary.discrepancies.length} discrepancies found ($${reconSummary.moneyAtRisk.toFixed(2)} money at risk).`,
        details: JSON.stringify({
          runId: run.id,
          totalOrders: reconSummary.totalOrdersCount,
          totalPayments: reconSummary.totalPaymentsCount,
          reconciledAmount: reconSummary.totalReconciledAmount,
          disputedAmount: reconSummary.totalDisputedAmount,
          moneyAtRisk: reconSummary.moneyAtRisk,
        }),
      },
    });

    // 6. Trigger Email Alert to alanthomasbiju01@gmail.com if money at risk exists
    if (reconSummary.moneyAtRisk > 0) {
      const emailResult = await sendReconciliationAlertEmail({
        toEmail: process.env.NOTIFICATION_EMAIL || 'alanthomasbiju01@gmail.com',
        subject: `🚨 [Audit Alert] ${reconSummary.discrepancies.length} Revenue Discrepancies Found ($${reconSummary.moneyAtRisk.toFixed(2)} Risk)`,
        batchName,
        totalOrdersCount: reconSummary.totalOrdersCount,
        totalPaymentsCount: reconSummary.totalPaymentsCount,
        totalReconciledAmount: reconSummary.totalReconciledAmount,
        totalDisputedAmount: reconSummary.totalDisputedAmount,
        moneyAtRisk: reconSummary.moneyAtRisk,
        discrepanciesCount: reconSummary.discrepancies.length,
        topDiscrepancies: reconSummary.discrepancies.slice(0, 5),
      });

      // Save email alert status to AuditLog
      await prisma.auditLog.create({
        data: {
          userId: userPayload.userId,
          level: emailResult.success ? 'SUCCESS' : 'WARNING',
          event: 'EMAIL_ALERT_TRIGGERED',
          message: emailResult.success
            ? `Reconciliation alert email successfully sent to ${process.env.NOTIFICATION_EMAIL || 'alanthomasbiju01@gmail.com'}`
            : `Email alert attempt: ${emailResult.message}`,
          details: JSON.stringify(emailResult),
        },
      });
    }

    return NextResponse.json({
      success: true,
      runId: run.id,
      summary: {
        runId: run.id,
        name: run.name,
        createdAt: run.createdAt,
        totalOrdersCount: run.totalOrdersCount,
        totalPaymentsCount: run.totalPaymentsCount,
        totalOrdersAmount: run.totalOrdersAmount,
        totalPaymentsAmount: run.totalPaymentsAmount,
        totalReconciledAmount: run.totalReconciledAmount,
        totalDisputedAmount: run.totalDisputedAmount,
        moneyAtRisk: run.moneyAtRisk,
        discrepancyCount: run.discrepancies.length,
      },
      discrepancies: run.discrepancies,
    });
  } catch (error: any) {
    console.error('Data Ingestion Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to ingest data and run reconciliation.' }, { status: 500 });
  }
}
