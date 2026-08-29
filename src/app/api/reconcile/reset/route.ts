import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userPayload.userId;

    // Delete all records for this user to allow fresh dataset testing
    await prisma.$transaction([
      prisma.discrepancy.deleteMany({ where: { userId } }),
      prisma.reconciliationRun.deleteMany({ where: { userId } }),
      prisma.rawOrder.deleteMany({ where: { userId } }),
      prisma.rawPayment.deleteMany({ where: { userId } }),
      prisma.auditLog.deleteMany({ where: { userId } }),
    ]);

    // Create log entry for the reset
    await prisma.auditLog.create({
      data: {
        userId,
        level: 'INFO',
        event: 'DATABASE_RESET',
        message: 'Audit database cleared successfully for fresh CSV upload testing.',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Audit database records cleared. You can now upload new CSV datasets or test fresh reconciliation runs.',
    });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return NextResponse.json({ error: 'Failed to clear database records.' }, { status: 500 });
  }
}
