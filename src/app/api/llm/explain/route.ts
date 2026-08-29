import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { explainDiscrepancy } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { discrepancyId } = body;

    if (!discrepancyId) {
      return NextResponse.json({ error: 'Discrepancy ID is required.' }, { status: 400 });
    }

    const discrepancy = await prisma.discrepancy.findFirst({
      where: { id: discrepancyId, userId: userPayload.userId },
    });

    if (!discrepancy) {
      return NextResponse.json({ error: 'Discrepancy not found.' }, { status: 404 });
    }

    // Call LLM service
    const explanation = await explainDiscrepancy({
      type: discrepancy.type,
      severity: discrepancy.severity,
      orderId: discrepancy.orderId || undefined,
      paymentId: discrepancy.paymentId || undefined,
      customerEmail: discrepancy.customerEmail || undefined,
      orderAmount: discrepancy.orderAmount || undefined,
      paymentAmount: discrepancy.paymentAmount || undefined,
      difference: discrepancy.difference,
      orderStatus: discrepancy.orderStatus || undefined,
      paymentStatus: discrepancy.paymentStatus || undefined,
      description: discrepancy.description,
    });

    // Cache explanation back into database
    await prisma.discrepancy.update({
      where: { id: discrepancy.id },
      data: { aiExplanation: JSON.stringify(explanation) },
    });

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error: any) {
    console.error('LLM explanation API error:', error);
    return NextResponse.json({ error: 'Failed to generate AI explanation.' }, { status: 500 });
  }
}
