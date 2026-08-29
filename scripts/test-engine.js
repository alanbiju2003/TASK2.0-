const { parseOrdersCSV, parsePaymentsCSV, runReconciliation } = require('../src/lib/reconciliation.ts');
const assert = require('assert');

console.log("==================================================");
console.log("   LedgerPulse Automated Engine Audit Test Suite  ");
console.log("==================================================\n");

// 1. Test Data Setup
const sampleOrdersCSV = `order_id,customer_email,order_date,net_amount,status
ORD-1001,john.doe@example.com,2026-08-01T10:15:00Z,150.00,COMPLETED
ORD-1004,charlie.brown@example.com,2026-08-02T14:30:00Z,320.00,COMPLETED
ORD-1006,eva.green@example.com,2026-08-04T12:00:00Z,500.00,COMPLETED
ORD-1008,grace.hopper@example.com,2026-08-05T08:20:00Z,199.99,COMPLETED
ORD-1009,harry.potter@example.com,2026-08-05T17:00:00Z,120.00,CANCELLED`;

const samplePaymentsCSV = `transaction_ref,order_reference,customer_email,processed_at,amount,fee,status
PAY-5001,ORD-1001,john.doe@example.com,2026-08-01T10:15:05Z,150.00,4.65,SETTLED
PAY-5006,ORD-1006,eva.green@example.com,2026-08-04T12:00:10Z,450.00,13.35,SETTLED
PAY-5008A,ORD-1008,grace.hopper@example.com,2026-08-05T08:20:00Z,199.99,6.10,SETTLED
PAY-5008B,ORD-1008,grace.hopper@example.com,2026-08-05T08:20:02Z,199.99,6.10,SETTLED
PAY-5009,ORD-1009,harry.potter@example.com,2026-08-05T17:00:12Z,120.00,3.78,SETTLED
PAY-9999,ORD-UNKNOWN,orphan.user@example.com,2026-08-08T18:00:00Z,350.00,10.45,SETTLED`;

// 2. Execute Engine
const orders = parseOrdersCSV(sampleOrdersCSV);
const payments = parsePaymentsCSV(samplePaymentsCSV);
const result = runReconciliation(orders, payments);

console.log(`✓ Parsed ${orders.length} orders and ${payments.length} payments.`);
console.log(`✓ Reconciliation Engine identified ${result.discrepancies.length} discrepancies.`);

// Assertions
try {
  assert.strictEqual(orders.length, 5, "Orders count should be 5");
  assert.strictEqual(payments.length, 6, "Payments count should be 6");

  // Check UNMATCHED_ORDER for ORD-1004
  const unmatchedOrder = result.discrepancies.find(d => d.type === 'UNMATCHED_ORDER' && d.orderId === 'ORD-1004');
  assert.ok(unmatchedOrder, "Should identify ORD-1004 as UNMATCHED_ORDER");
  assert.strictEqual(unmatchedOrder.moneyAtRisk, 320.00, "Risk for ORD-1004 should be $320.00");
  console.log("✓ PASSED: UNMATCHED_ORDER detection (ORD-1004)");

  // Check DUPLICATE_PAYMENT for ORD-1008
  const duplicatePay = result.discrepancies.find(d => d.type === 'DUPLICATE_PAYMENT' && d.orderId === 'ORD-1008');
  assert.ok(duplicatePay, "Should identify ORD-1008 as DUPLICATE_PAYMENT");
  assert.strictEqual(duplicatePay.moneyAtRisk, 199.99, "Risk for ORD-1008 duplicate charge should be $199.99");
  console.log("✓ PASSED: DUPLICATE_PAYMENT detection (ORD-1008)");

  // Check AMOUNT_MISMATCH for ORD-1006
  const amountMismatch = result.discrepancies.find(d => d.type === 'AMOUNT_MISMATCH' && d.orderId === 'ORD-1006');
  assert.ok(amountMismatch, "Should identify ORD-1006 as AMOUNT_MISMATCH");
  assert.strictEqual(amountMismatch.difference, 50.00, "Variance should be $50.00");
  console.log("✓ PASSED: AMOUNT_MISMATCH detection (ORD-1006)");

  // Check STATUS_MISMATCH for ORD-1009
  const statusMismatch = result.discrepancies.find(d => d.type === 'STATUS_MISMATCH' && d.orderId === 'ORD-1009');
  assert.ok(statusMismatch, "Should identify ORD-1009 as STATUS_MISMATCH");
  console.log("✓ PASSED: STATUS_MISMATCH detection (ORD-1009)");

  // Check UNMATCHED_PAYMENT for PAY-9999
  const unmatchedPayment = result.discrepancies.find(d => d.type === 'UNMATCHED_PAYMENT' && d.paymentId === 'PAY-9999');
  assert.ok(unmatchedPayment, "Should identify PAY-9999 as UNMATCHED_PAYMENT");
  console.log("✓ PASSED: UNMATCHED_PAYMENT detection (PAY-9999)");

  console.log("\n==================================================");
  console.log("  ALL RECONCILIATION ENGINE TESTS PASSED (5/5)  ");
  console.log("==================================================");
} catch (err) {
  console.error("\n❌ TEST FAILED:", err.message);
  process.exit(1);
}
