import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { sendReconciliationAlertEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/logs -> fetch user's audit logs
export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.auditLog.findMany({
      where: { userId: userPayload.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs.' }, { status: 500 });
  }
}

// POST /api/logs -> trigger test email alert or manual log creation
export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, recipientEmail } = body;

    if (action === 'TEST_EMAIL') {
      const emailResult = await sendReconciliationAlertEmail({
        toEmail: recipientEmail || 'alanthomasbiju01@gmail.com',
        subject: '🔔 [Test Alert] LedgerPulse Revenue Reconciliation System Audit',
        batchName: 'Manual Controller System Audit Test',
        totalOrdersCount: 185,
        totalPaymentsCount: 187,
        totalReconciledAmount: 39688.55,
        totalDisputedAmount: 2916.44,
        moneyAtRisk: 1757.79,
        discrepanciesCount: 30,
        topDiscrepancies: [
          { type: 'STATUS_MISMATCH', severity: 'CRITICAL', orderId: 'ORD-1701', difference: 175.0, description: 'Order CANCELLED in store, payment SETTLED in gateway.' },
          { type: 'DUPLICATE_PAYMENT', severity: 'CRITICAL', orderId: 'ORD-1502', difference: 128.74, description: 'Double payment captured in payment gateway.' },
        ],
      });

      // Save event into AuditLog
      const log = await prisma.auditLog.create({
        data: {
          userId: userPayload.userId,
          level: emailResult.success ? 'SUCCESS' : 'WARNING',
          event: 'EMAIL_ALERT_TRIGGERED',
          message: emailResult.success
            ? `Reconciliation email alert sent to ${recipientEmail || 'alanthomasbiju01@gmail.com'}`
            : `Email alert failed: ${emailResult.message}`,
          details: JSON.stringify(emailResult),
        },
      });

      return NextResponse.json({ success: emailResult.success, message: emailResult.message, log });
    }

    return NextResponse.json({ error: 'Invalid action parameter.' }, { status: 400 });
  } catch (error: any) {
    console.error('Audit Log POST error:', error);
    return NextResponse.json({ error: 'Failed to process audit log action.' }, { status: 500 });
  }
}
