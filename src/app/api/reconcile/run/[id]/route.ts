import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = params.id;
    const run = await prisma.reconciliationRun.findFirst({
      where: { id: runId, userId: userPayload.userId },
      include: {
        discrepancies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Reconciliation run not found.' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error: any) {
    console.error('Get run error:', error);
    return NextResponse.json({ error: 'Failed to fetch reconciliation run details.' }, { status: 500 });
  }
}
