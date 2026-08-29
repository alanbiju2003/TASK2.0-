import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runs = await prisma.reconciliationRun.findMany({
      where: { userId: userPayload.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        totalOrdersCount: true,
        totalPaymentsCount: true,
        totalOrdersAmount: true,
        totalPaymentsAmount: true,
        totalReconciledAmount: true,
        totalDisputedAmount: true,
        moneyAtRisk: true,
        _count: {
          select: { discrepancies: true },
        },
      },
    });

    return NextResponse.json({ runs });
  } catch (error: any) {
    console.error('List runs error:', error);
    return NextResponse.json({ error: 'Failed to fetch reconciliation runs.' }, { status: 500 });
  }
}
