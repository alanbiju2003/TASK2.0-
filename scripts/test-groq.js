const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*"(.*)"\s*$/) || line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  console.log("Groq API Key loaded:", apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

  const openai = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  console.log("Calling Groq LLM API with model llama-3.1-8b-instant...");

  const prompt = `
You are a senior financial controller and e-commerce auditor.
Analyze the following revenue reconciliation discrepancy between the store order system and the payment gateway processor.

Discrepancy Details:
- Type: DUPLICATE_PAYMENT
- Severity: CRITICAL
- Store Order ID: ORD-1008
- Payment Gateway ID: PAY-5008A, PAY-5008B
- Customer Email: grace.hopper@example.com
- Order Amount: $199.99 (COMPLETED)
- Payment Amount: $399.98 (CAPTURED)
- Variance / Difference: $199.99
- Engine Finding: Order ORD-1008 ($199.99) has 2 separate payment transactions captured totaling $399.98. Customer double-charged by $199.99.

Instructions:
Respond strictly with a JSON object matching this schema:
{
  "summary": "Concise 1-2 sentence plain language overview of what happened",
  "probableRootCause": "Deep technical/operational root cause",
  "businessImpact": "Financial risk and customer satisfaction impact assessment",
  "recommendedActions": ["Clear action 1", "Clear action 2"]
}
`;

  const response = await openai.chat.completions.create({
    model: 'groq/compound-mini',
    messages: [
      { role: 'system', content: 'You are an expert e-commerce financial audit AI. Return valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  console.log("\n--- Live Groq LLM Output ---");
  console.log(response.choices[0].message.content);
}

testGroq().catch(console.error);
