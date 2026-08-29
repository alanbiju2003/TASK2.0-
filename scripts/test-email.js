const fs = require('fs');
const path = require('path');

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

const { sendReconciliationAlertEmail } = require('../src/lib/email.ts');

async function testEmail() {
  console.log("Testing live SMTP email alert to alanthomasbiju01@gmail.com...");
  console.log("SMTP USER:", process.env.SMTP_USER);
  console.log("SMTP PASS:", process.env.SMTP_PASS ? "LOADED (***)" : "MISSING");

  const result = await sendReconciliationAlertEmail({
    toEmail: 'alanthomasbiju01@gmail.com',
    subject: '🚨 [Live Test Alert] LedgerPulse Revenue Reconciliation Audit Notification',
    batchName: 'Real E-Commerce Audit Dataset Batch',
    totalOrdersCount: 185,
    totalPaymentsCount: 187,
    totalReconciledAmount: 39688.55,
    totalDisputedAmount: 2916.44,
    moneyAtRisk: 1757.79,
    discrepanciesCount: 30,
    topDiscrepancies: [
      { type: 'STATUS_MISMATCH', severity: 'CRITICAL', orderId: 'ORD-1701', difference: 175.0, description: 'Order CANCELLED in store, payment TXN700173 remains SETTLED.' },
      { type: 'DUPLICATE_PAYMENT', severity: 'CRITICAL', orderId: 'ORD-1502', difference: 128.74, description: 'Order ORD-1502 has 2 separate payment transactions captured.' },
      { type: 'UNMATCHED_ORDER', severity: 'CRITICAL', orderId: 'ORD-1203', difference: 59.52, description: 'Order completed in store, no payment record in gateway.' },
      { type: 'CURRENCY_MISMATCH', severity: 'MEDIUM', orderId: 'ORD-1601', difference: 0.0, description: 'Store currency USD vs Payment Gateway EUR.' },
    ],
  });

  console.log("\n--- Live Email Service Result ---");
  console.log(result);
}

testEmail().catch(console.error);
