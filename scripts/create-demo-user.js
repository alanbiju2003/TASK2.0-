const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUser() {
  const email = 'demo@ledgerpulse.com';
  const password = 'demo123456';
  const passwordHash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`Updated user ${email} password to '${password}'.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name: 'Demo Controller',
        passwordHash,
      },
    });
    console.log(`Created user ${email} with password '${password}'.`);
  }
}

createDemoUser().catch(console.error).finally(() => prisma.$disconnect());
