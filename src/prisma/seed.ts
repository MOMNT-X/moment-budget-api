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
    const existing = await prisma.budgetCategory.findFirst({
      where: {
        name,
        userId: null, // this is fine in `findFirst`
      },
    });

    if (!existing) {
      await prisma.budgetCategory.create({
        data: {
          name,
          userId: null,
          isDefault: true,
        },
      });
      console.log(`✓ Created/Updated category: ${name}`);
    } else {
      console.log(`⏭️  Skipped existing category: ${name}`);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
