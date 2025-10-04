import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const defaultCategories = [
    'Food',
    'Groceries',
    'Transportation',
    'Electricity Bills',
    'TV/Netflix',
    'Healthcare',
    'Entertainment',
    'Rent',
    'Shopping',
    'Education',
    'Utilities',
    'Insurance',
    'Savings',
  ];

  console.log('Seeding default categories...');

  for (const name of defaultCategories) {
    await prisma.budgetCategory.upsert({
      where: {
        name_userId: {
          name,
          userId: null as any,
        },
      },
      update: {},
      create: {
        name,
        userId: null,
        isDefault: true,
      },
    });
    console.log(`✓ Created/Updated category: ${name}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
