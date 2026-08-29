import OpenAI from 'openai';

export interface LLMExplanationInput {
  type: string;
  severity: string;
  orderId?: string;
  paymentId?: string;
  customerEmail?: string;
  orderAmount?: number;
  paymentAmount?: number;
  difference?: number;
  orderStatus?: string;
  paymentStatus?: string;
  description: string;
}

export interface LLMExplanationOutput {
  summary: string;
  probableRootCause: string;
  businessImpact: string;
  recommendedActions: string[];
}

export async function explainDiscrepancy(input: LLMExplanationInput): Promise<LLMExplanationOutput> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Fallback engine if no OpenAI API Key provided
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('sk-proj-...')) {
    return generateFallbackExplanation(input);
  }

  try {
    const openai = new OpenAI({ apiKey });

    const prompt = `
You are a senior financial controller and e-commerce auditor.
Analyze the following revenue reconciliation discrepancy between the store order system and the payment gateway processor.

Discrepancy Details:
- Type: ${input.type}
- Severity: ${input.severity}
- Store Order ID: ${input.orderId || 'N/A'}
- Payment Gateway ID: ${input.paymentId || 'N/A'}
- Customer Email: ${input.customerEmail || 'N/A'}
- Order Amount: $${(input.orderAmount || 0).toFixed(2)} (${input.orderStatus || 'N/A'})
- Payment Amount: $${(input.paymentAmount || 0).toFixed(2)} (${input.paymentStatus || 'N/A'})
- Variance / Difference: $${(input.difference || 0).toFixed(2)}
- Engine Finding: ${input.description}

Instructions:
Respond strictly with a JSON object matching this schema:
{
  "summary": "Concise 1-2 sentence plain language overview of what happened",
  "probableRootCause": "Deep technical/operational root cause (e.g. gateway webhook failure, human typo, partial refund issue)",
  "businessImpact": "Financial risk and customer satisfaction impact assessment",
  "recommendedActions": ["Clear actionable step 1", "Clear actionable step 2", "Clear actionable step 3"]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert e-commerce financial audit AI. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2, // Low temperature for deterministic, analytical explanations
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return generateFallbackExplanation(input);
    }

    const parsed = JSON.parse(content) as LLMExplanationOutput;
    return {
      summary: parsed.summary || input.description,
      probableRootCause: parsed.probableRootCause || 'Unspecified system synchronization anomaly.',
      businessImpact: parsed.businessImpact || 'Potential revenue leak or financial record misalignment.',
      recommendedActions: Array.isArray(parsed.recommendedActions) && parsed.recommendedActions.length > 0
        ? parsed.recommendedActions
        : ['Verify gateway transaction logs', 'Contact merchant support'],
    };
  } catch (error) {
    console.error('LLM API call error, using fallback explainer:', error);
    return generateFallbackExplanation(input);
  }
}

function generateFallbackExplanation(input: LLMExplanationInput): LLMExplanationOutput {
  switch (input.type) {
    case 'UNMATCHED_ORDER':
      return {
        summary: `Order ${input.orderId || 'N/A'} was marked ${input.orderStatus} in the store database for $${(input.orderAmount || 0).toFixed(2)}, but no corresponding transaction exists in the payment gateway.`,
        probableRootCause: 'Payment gateway API webhook failure during checkout, or manual order creation without upfront payment capture.',
        businessImpact: `100% money at risk ($${(input.orderAmount || 0).toFixed(2)}). Goods or digital items may have been fulfilled without capturing payment.`,
        recommendedActions: [
          'Verify if customer was charged under a different email or offline payment channel.',
          'Check payment gateway webhook error logs around transaction timestamp.',
          'If uncollected, reach out to customer to collect payment or void fulfillment.'
        ]
      };

    case 'UNMATCHED_PAYMENT':
      return {
        summary: `Payment ${input.paymentId || 'N/A'} for $${(input.paymentAmount || 0).toFixed(2)} was successfully captured in the gateway, but has no corresponding store order record.`,
        probableRootCause: 'Database transaction rollback on store frontend after payment authorization, or manual virtual terminal charge.',
        businessImpact: `Unallocated revenue of $${(input.paymentAmount || 0).toFixed(2)}. Customer may have paid without receiving order confirmation or fulfillment.`,
        recommendedActions: [
          `Search order database by email (${input.customerEmail || 'unknown'}) to locate abandoned cart.`,
          'Verify whether a duplicate cart or draft order was created.',
          'Issue refund or create corresponding order in store system.'
        ]
      };

    case 'DUPLICATE_PAYMENT':
      return {
        summary: `Order ${input.orderId || 'N/A'} ($${(input.orderAmount || 0).toFixed(2)}) has multiple captured payment transactions totaling $${(input.paymentAmount || 0).toFixed(2)}.`,
        probableRootCause: 'Customer clicked checkout button multiple times during payment processing timeout, or double API retry execution.',
        businessImpact: `Customer double-charge hazard ($${(input.difference || 0).toFixed(2)} overcharge). Triggers chargeback risks and negative reviews.`,
        recommendedActions: [
          `Immediately initiate partial refund for duplicate payment transaction (${input.paymentId || 'gateway ID'}).`,
          'Check frontend checkout button debounce logic and API retry limits.',
          'Notify customer proactively regarding the auto-refund.'
        ]
      };

    case 'AMOUNT_MISMATCH':
      return {
        summary: `Order amount ($${(input.orderAmount || 0).toFixed(2)}) does not match gateway captured payment ($${(input.paymentAmount || 0).toFixed(2)}). Variance: $${Math.abs(input.difference || 0).toFixed(2)}.`,
        probableRootCause: 'Uncaptured tax calculations, promotional coupon discount desynchronization, or currency conversion rounding drift.',
        businessImpact: `Revenue variance of $${Math.abs(input.difference || 0).toFixed(2)}. Accumulates over time into ledger discrepancy.`,
        recommendedActions: [
          'Compare item line totals, shipping fees, and taxes on store order vs gateway line items.',
          'Verify promotion code application in checkout pipeline.',
          'Adjust ledger line item or request supplementary payment if undercharged.'
        ]
      };

    case 'STATUS_MISMATCH':
      return {
        summary: `Order status (${input.orderStatus}) conflicts with payment processor status (${input.paymentStatus}).`,
        probableRootCause: 'Order was cancelled or refunded in store UI without calling gateway refund API, or vice versa.',
        businessImpact: 'Operational mismatch. Either store holds funds for cancelled order, or goods shipped for failed payment.',
        recommendedActions: [
          'Cross-reference refund timestamp in gateway dashboard.',
          'Trigger synchronous payment status check from gateway API.',
          'Synchronize order status across store and accounting ledger.'
        ]
      };

    case 'FEE_LEAKAGE':
      return {
        summary: `Payment processor fee of $${(input.difference || 0).toFixed(2)} exceeds contract rate threshold.`,
        probableRootCause: 'Cross-border international credit card processing surcharge, tier-3 card penalty, or incorrect interchange rate tier.',
        businessImpact: 'Profit margin erosion and merchant gateway fee overcharging.',
        recommendedActions: [
          'Review payment processor fee schedule contract.',
          'Identify card type (international, corporate amex) used for this charge.',
          'File fee dispute ticket with merchant acquirer.'
        ]
      };

    default:
      return {
        summary: input.description,
        probableRootCause: 'Data inconsistency across payment processor and e-commerce store systems.',
        businessImpact: 'Minor financial audit discrepancy.',
        recommendedActions: [
          'Review raw CSV records side-by-side.',
          'Verify transaction in merchant portal.'
        ]
      };
  }
}
