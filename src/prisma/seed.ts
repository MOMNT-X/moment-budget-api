import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const categories = ['Food', 'Transport', 'Rent', 'Healthcare', 'Entertainment'];
  for (const name of categories) {
    await prisma.budgetCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
