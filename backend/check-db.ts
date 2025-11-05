/**
 * 데이터베이스 연결 및 초대 코드 확인 스크립트
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking database connection...\n');

  try {
    // 데이터베이스 연결 테스트
    await prisma.$connect();
    console.log('✅ Database connection successful!\n');

    // 초대 코드 확인
    const inviteCodes = await prisma.inviteCode.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    console.log(`📋 Active invite codes: ${inviteCodes.length}\n`);

    if (inviteCodes.length === 0) {
      console.log('⚠️  No invite codes found!');
      console.log('   Please run migration.sql in Supabase Dashboard.\n');
    } else {
      console.log('First 5 invite codes:');
      inviteCodes.slice(0, 5).forEach((code, index) => {
        console.log(`   ${index + 1}. ${code.code} (${code.usedCount}/${code.maxUses} used)`);
      });
      console.log('');
    }

    // 사용자 수 확인
    const userCount = await prisma.user.count();
    console.log(`👥 Total users: ${userCount}\n`);

    console.log('✨ Database check completed!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
