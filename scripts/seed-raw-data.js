const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { parseOrdersCSV, parsePaymentsCSV, runReconciliation } = require('../src/lib/reconciliation.ts');

const prisma = new PrismaClient();

async function seedRawData() {
  console.log("Seeding raw orders and raw payments into database...");

  const ordersCsv = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'orders.csv'), 'utf8');
  const paymentsCsv = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'payments.csv'), 'utf8');

  const parsedOrders = parseOrdersCSV(ordersCsv);
  const parsedPayments = parsePaymentsCSV(paymentsCsv);

  // Ensure demo user exists
  const demoEmail = 'demo@ledgerpulse.com';
  const passwordHash = await bcrypt.hash('demo123456', 10);

  let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        name: 'Demo Controller',
        passwordHash,
      },
    });
  } else {
    await prisma.user.update({
      where: { email: demoEmail },
      data: { passwordHash },
    });
  }

  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const user of users) {
    console.log(`Seeding data for user: ${user.email} (${user.id})`);

    // Clear old raw data
    await prisma.rawOrder.deleteMany({ where: { userId: user.id } });
    await prisma.rawPayment.deleteMany({ where: { userId: user.id } });

    // Seed raw orders
    await prisma.rawOrder.createMany({
      data: parsedOrders.map(o => ({
        userId: user.id,
        orderId: o.orderId,
        customerEmail: o.customerEmail || null,
        orderDate: o.orderDate ? new Date(o.orderDate) : null,
        amount: o.amount ?? 0,
        currency: o.currency || 'USD',
        status: o.status || 'COMPLETED',
      }))
    });

    // Seed raw payments
    await prisma.rawPayment.createMany({
      data: parsedPayments.map(p => ({
        userId: user.id,
        paymentId: p.paymentId || 'PAY-REF',
        orderIdRef: p.orderIdRef || null,
        customerEmail: p.customerEmail || null,
        paymentDate: p.paymentDate ? new Date(p.paymentDate) : null,
        amount: p.amount,
        currency: p.currency || 'USD',
        status: p.status || 'SETTLED',
        feeAmount: p.feeAmount || 0,
      }))
    });

    // Run reconciliation & seed run if none exists
    const runs = await prisma.reconciliationRun.findMany({ where: { userId: user.id } });
    if (runs.length === 0) {
      const reconSummary = runReconciliation(parsedOrders, parsedPayments);
      await prisma.reconciliationRun.create({
        data: {
          userId: user.id,
          name: 'Real E-Commerce Audit Dataset Batch',
          totalOrdersCount: reconSummary.totalOrdersCount,
          totalPaymentsCount: reconSummary.totalPaymentsCount,
          totalOrdersAmount: reconSummary.totalOrdersAmount,
          totalPaymentsAmount: reconSummary.totalPaymentsAmount,
          totalReconciledAmount: reconSummary.totalReconciledAmount,
          totalDisputedAmount: reconSummary.totalDisputedAmount,
          moneyAtRisk: reconSummary.moneyAtRisk,
          discrepancies: {
            create: reconSummary.discrepancies.map(d => ({
              userId: user.id,
              type: d.type,
              severity: d.severity,
              orderId: d.orderId || null,
              paymentId: d.paymentId || null,
              customerEmail: d.customerEmail || null,
              orderAmount: d.orderAmount ?? null,
              paymentAmount: d.paymentAmount ?? null,
              difference: d.difference,
              orderStatus: d.orderStatus || null,
              paymentStatus: d.paymentStatus || null,
              description: d.description,
              status: 'OPEN',
            }))
          }
        }
      });
    }

    console.log(`✓ Seeded ${parsedOrders.length} raw orders and ${parsedPayments.length} raw payments for ${user.email}.`);
  }

  console.log("\n==================================================");
  console.log("  SUCCESSFULLY SEEDED ALL RAW DATABASE RECORDS    ");
  console.log("==================================================");
}

seedRawData().catch(console.error).finally(() => prisma.$disconnect());
