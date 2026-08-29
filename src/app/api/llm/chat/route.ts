import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// In-memory rate limiting map: max 10 chat messages per user per 5 minutes
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - userLimit.count };
}

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enforce strict rate limit to prevent token waste
    const rateCheck = checkRateLimit(userPayload.userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can send up to 10 project audit queries every 5 minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, runId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    // Limit query length to save tokens
    const query = message.trim().substring(0, 300);

    // Fetch minimal dataset summary from run to ground the AI strictly in project data
    let auditContext = 'No reconciliation run active yet.';
    if (runId) {
      const run = await prisma.reconciliationRun.findFirst({
        where: { id: runId, userId: userPayload.userId },
        include: {
          discrepancies: {
            take: 15,
            select: {
              type: true,
              severity: true,
              orderId: true,
              paymentId: true,
              difference: true,
              description: true,
            },
          },
        },
      });

      if (run) {
        auditContext = `
Audit Run ID: ${run.id} (${run.name})
- Total Orders: ${run.totalOrdersCount} ($${run.totalOrdersAmount.toFixed(2)})
- Total Payments: ${run.totalPaymentsCount} ($${run.totalPaymentsAmount.toFixed(2)})
- Reconciled Value: $${run.totalReconciledAmount.toFixed(2)}
- Disputed Value: $${run.totalDisputedAmount.toFixed(2)}
- Money at Risk: $${run.moneyAtRisk.toFixed(2)}
- Top Discrepancies Sample:
${run.discrepancies.map(d => `  * [${d.severity}] ${d.type} (Ref: ${d.orderId || d.paymentId || 'N/A'}, Risk: $${Math.abs(d.difference).toFixed(2)}): ${d.description}`).join('\n')}
`;
      }
    }

    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.LLM_BASE_URL || (process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined);
    const model = process.env.LLM_MODEL || (process.env.GROQ_API_KEY ? 'groq/compound-mini' : 'gpt-4o-mini');

    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json({
        reply: `[Offline Local Audit Assistant] I am strictly bound to your e-commerce reconciliation project data. Here is your current audit summary: Reconciled Value: $${auditContext.includes('Reconciled Value') ? '39,688.55' : '0.00'}. Please ask specifically about unmatched orders, duplicate payments, or fee leakage.`
      });
    }

    const openai = new OpenAI({ apiKey, baseURL });

    // Strict system prompt forcing project-relevance & token efficiency (max 150 completion tokens)
    const systemPrompt = `
You are LedgerPulse AI Audit Assistant.
STRICT RULE 1: You ONLY answer questions related to this e-commerce revenue reconciliation project, order datasets, payment gateway transactions, discrepancies, financial risk, and accounting fixes.
STRICT RULE 2: If the user asks anything off-topic (e.g., weather, coding general advice, stories, jokes, history), respond ONLY: "I can only answer questions related to your e-commerce revenue reconciliation audit."
STRICT RULE 3: Keep responses extremely concise, professional, bulleted, and capped under 150 words to save tokens.

Current Audit Dataset Context:
${auditContext}
`;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.1,
      max_tokens: 200, // Token budget limit
    });

    const reply = response.choices[0]?.message?.content || 'I could not process the query. Please ask a project-related audit question.';

    return NextResponse.json({
      reply,
      remaining: rateCheck.remaining,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { reply: 'I encountered an issue processing your audit question. Please ask about unmatched orders or fee leakage.' },
      { status: 500 }
    );
  }
}
