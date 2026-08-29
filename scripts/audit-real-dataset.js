const fs = require('fs');
const path = require('path');
const { parseOrdersCSV, parsePaymentsCSV, runReconciliation } = require('../src/lib/reconciliation.ts');

const ordersCsv = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'orders.csv'), 'utf8');
const paymentsCsv = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'payments.csv'), 'utf8');

const orders = parseOrdersCSV(ordersCsv);
const payments = parsePaymentsCSV(paymentsCsv);
const result = runReconciliation(orders, payments);

console.log("==================================================");
console.log("   REAL DATASET RECONCILIATION AUDIT RESULTS     ");
console.log("==================================================\n");

console.log(`Total Store Orders Parsed: ${result.totalOrdersCount}`);
console.log(`Total Gateway Payments Parsed: ${result.totalPaymentsCount}`);
console.log(`Total Orders Value: $${result.totalOrdersAmount.toFixed(2)}`);
console.log(`Total Payments Value: $${result.totalPaymentsAmount.toFixed(2)}`);
console.log(`Total Reconciled Value: $${result.totalReconciledAmount.toFixed(2)}`);
console.log(`Total Value in Dispute: $${result.totalDisputedAmount.toFixed(2)}`);
console.log(`Total Money at Risk: $${result.moneyAtRisk.toFixed(2)}`);
console.log(`Total Discrepancies Count: ${result.discrepancies.length}\n`);

// Breakdown by discrepancy type
const typeCounts = {};
const typeRisk = {};

result.discrepancies.forEach(d => {
  typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
  typeRisk[d.type] = (typeRisk[d.type] || 0) + d.moneyAtRisk;
});

console.log("--- Discrepancy Type Breakdown ---");
Object.keys(typeCounts).forEach(type => {
  console.log(`- ${type}: ${typeCounts[type]} items | Money at Risk: $${typeRisk[type].toFixed(2)}`);
});

console.log("\n--- Top Critical Discrepancies Sample ---");
result.discrepancies.slice(0, 10).forEach((d, i) => {
  console.log(`[${i+1}] ${d.severity} | ${d.type} | Ref: ${d.orderId || d.paymentId} | Risk: $${d.moneyAtRisk.toFixed(2)}`);
  console.log(`    Detail: ${d.description}`);
});
