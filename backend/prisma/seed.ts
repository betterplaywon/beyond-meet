import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Beta 테스트용 초대 코드는 migration.sql에서 이미 생성됨 (BETA2025-001 ~ BETA2025-020)

  // 생성된 초대 코드 확인
  const allCodes = await prisma.inviteCode.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });

  console.log(`📋 Active invite codes: ${allCodes.length}`);
  console.log('\nFirst 5 codes:');
  allCodes.slice(0, 5).forEach((code, index) => {
    console.log(`   ${index + 1}. ${code.code} (${code.usedCount}/${code.maxUses} used)`);
  });

  console.log('\n✅ Seeding verification completed!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
