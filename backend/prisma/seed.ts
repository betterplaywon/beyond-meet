/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...\n');

  // 현재 유저 수 확인
  const userCount = await prisma.user.count();

  console.log(`👥 Current users: ${userCount}`);
  console.log('\n✅ Seeding verification completed!');
}

main()
  .catch((e: unknown) => {
    console.error('\n❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
