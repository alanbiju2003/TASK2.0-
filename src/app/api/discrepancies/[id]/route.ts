import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'IGNORED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
    }

    const updated = await prisma.discrepancy.updateMany({
      where: {
        id: params.id,
        userId: userPayload.userId,
      },
      data: { status },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Discrepancy not found or access denied.' }, { status: 404 });
    }

    const discrepancy = await prisma.discrepancy.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, discrepancy });
  } catch (error: any) {
    console.error('Update discrepancy error:', error);
    return NextResponse.json({ error: 'Failed to update discrepancy status.' }, { status: 500 });
  }
}
