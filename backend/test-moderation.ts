/**
 * AI 콘텐츠 모니터링 시스템 테스트 스크립트
 *
 * 실행 방법:
 * cd backend
 * npx ts-node test-moderation.ts
 */

import { imageClassification } from '@huggingface/inference';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

// 환경 변수 로드
dotenv.config({ path: path.join(__dirname, '.env') });

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

// 테스트용 샘플 이미지 로드 (실제 이미지 파일 사용)
const loadTestImage = (): string => {
  const imagePath = path.join(__dirname, '..', 'store-assets', 'icons', '250_image.jpg');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64Image}`;
};

const SAMPLE_IMAGE_BASE64 = loadTestImage();

interface TestResult {
  passed: number;
  failed: number;
  warnings: number;
}

const result: TestResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

/**
 * 테스트 1: 환경 변수 확인
 */
async function testEnvironmentVariables(): Promise<boolean> {
  log.title('테스트 1: 환경 변수 확인');

  const requiredEnvVars = [
    'HUGGINGFACE_API_KEY',
    'MODERATION_THRESHOLD_MINOR',
    'MODERATION_THRESHOLD_SEVERE',
  ];

  let allPresent = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log.success(`${envVar}: 설정됨`);
    } else {
      log.error(`${envVar}: 미설정`);
      allPresent = false;
    }
  }

  if (allPresent) {
    log.info(`MODERATION_THRESHOLD_MINOR: ${process.env.MODERATION_THRESHOLD_MINOR}`);
    log.info(`MODERATION_THRESHOLD_SEVERE: ${process.env.MODERATION_THRESHOLD_SEVERE}`);
    result.passed++;
    return true;
  } else {
    result.failed++;
    return false;
  }
}

/**
 * 테스트 2: Hugging Face API 연결 테스트
 */
async function testHuggingFaceAPI(): Promise<boolean> {
  log.title('테스트 2: Hugging Face API 연결');

  const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
  const HUGGINGFACE_MODEL = 'Falconsai/nsfw_image_detection';

  if (!HUGGINGFACE_API_KEY) {
    log.error('HUGGINGFACE_API_KEY가 설정되지 않았습니다.');
    result.failed++;
    return false;
  }

  try {
    log.info('API 요청 전송 중...');
    log.info('이미지 크기: 250x250 (모델 요구사항 224x224 충족)');

    // Base64를 Buffer로 변환
    const base64Data = SAMPLE_IMAGE_BASE64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Blob 생성 (content type 명시)
    const blob = new Blob([buffer], { type: 'image/png' });

    // imageClassification 함수 사용
    const data = await imageClassification({
      model: HUGGINGFACE_MODEL,
      inputs: blob,
      accessToken: HUGGINGFACE_API_KEY,
    });

    log.success('API 연결 성공');
    log.info(`응답 데이터: ${JSON.stringify(data, null, 2)}`);

    // NSFW 결과 확인
    const nsfwResult = data.find((r: { label: string; score: number }) => r.label === 'nsfw');
    if (nsfwResult) {
      log.info(`NSFW 신뢰도: ${(nsfwResult.score * 100).toFixed(2)}%`);
    }

    result.passed++;
    return true;
  } catch (error: unknown) {
    const err = error as { message?: string; statusCode?: number };

    if (err.statusCode === 503) {
      log.warning('모델이 로딩 중입니다. 20-30초 후 다시 시도하세요.');
      log.info('오류: ' + err.message);
      result.warnings++;
      return false;
    } else if (err.statusCode === 401) {
      log.error('API 키가 유효하지 않습니다. Hugging Face에서 확인하세요.');
      result.failed++;
      return false;
    } else {
      log.error(`API 오류: ${err.message || 'Unknown error'}`);
      result.failed++;
      return false;
    }
  }
}

/**
 * 테스트 3: 임계값 로직 테스트
 */
async function testThresholdLogic(): Promise<boolean> {
  log.title('테스트 3: 임계값 로직');

  const THRESHOLD_MINOR = parseFloat(process.env.MODERATION_THRESHOLD_MINOR || '0.3');
  const THRESHOLD_SEVERE = parseFloat(process.env.MODERATION_THRESHOLD_SEVERE || '0.6');

  type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';

  const determineAction = (confidence: number): ModerationAction => {
    if (confidence >= THRESHOLD_SEVERE) {
      return 'CALL_ENDED';
    } else if (confidence >= THRESHOLD_MINOR) {
      return 'WARNING_ISSUED';
    } else {
      return 'NONE';
    }
  };

  const testCases = [
    { confidence: 0.1, expected: 'NONE' },
    { confidence: 0.3, expected: 'WARNING_ISSUED' },
    { confidence: 0.5, expected: 'WARNING_ISSUED' },
    { confidence: 0.6, expected: 'CALL_ENDED' },
    { confidence: 0.9, expected: 'CALL_ENDED' },
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    const action = determineAction(testCase.confidence);
    const passed = action === testCase.expected;

    if (passed) {
      log.success(`신뢰도 ${testCase.confidence} → ${action}`);
    } else {
      log.error(`신뢰도 ${testCase.confidence} → 예상: ${testCase.expected}, 실제: ${action}`);
      allPassed = false;
    }
  }

  if (allPassed) {
    result.passed++;
    return true;
  } else {
    result.failed++;
    return false;
  }
}

/**
 * 테스트 3.5: 이미지 검증 로직
 */
async function testImageValidation(): Promise<boolean> {
  log.title('테스트 3.5: 이미지 검증 로직');

  const { validateImageForModeration } = await import('./src/utils/image-validator');

  // 테스트 1: 유효한 이미지 (250x250 실제 이미지)
  try {
    validateImageForModeration(SAMPLE_IMAGE_BASE64);
    log.success('✓ 유효한 이미지 통과 (250x250)');
  } catch (error: any) {
    log.error(`✗ 유효한 이미지가 실패함: ${error.message}`);
    result.failed++;
    return false;
  }

  // 테스트 2: 너무 작은 이미지 (1x1)
  const TINY_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  try {
    validateImageForModeration(TINY_IMAGE);
    log.error('✗ 1x1 이미지가 통과되면 안 됨');
    result.failed++;
    return false;
  } catch (error: any) {
    if (error.code === 'IMAGE_TOO_SMALL') {
      log.success('✓ 작은 이미지 거부됨 (예상된 동작)');
    } else {
      log.error(`✗ 잘못된 에러 코드: ${error.code}`);
      result.failed++;
      return false;
    }
  }

  result.passed++;
  return true;
}

/**
 * 테스트 4: 백엔드 서버 상태 확인 (선택사항)
 */
async function testBackendServer(): Promise<boolean> {
  log.title('테스트 4: 백엔드 서버 상태 확인 (선택사항)');

  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

  try {
    log.info(`서버 연결 시도: ${BACKEND_URL}`);

    const response = await axios.get(`${BACKEND_URL}/api`, {
      timeout: 5000,
    });

    log.success('백엔드 서버 응답 성공');
    log.info(`응답: ${JSON.stringify(response.data)}`);
    result.passed++;
    return true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      log.warning('백엔드 서버가 실행되지 않았습니다. (선택사항이므로 스킵)');
      log.info('서버 시작: npm run dev');
      result.warnings++;
      return false;
    } else {
      log.error(`서버 오류: ${error.message}`);
      result.failed++;
      return false;
    }
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════╗
║   AI 콘텐츠 모니터링 시스템 테스트                   ║
╚═══════════════════════════════════════════════════════╝
${colors.reset}`);

  // 테스트 실행
  await testEnvironmentVariables();
  await testHuggingFaceAPI();
  await testThresholdLogic();
  await testImageValidation();
  await testBackendServer();

  // 결과 요약
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}테스트 결과 요약${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}✓ 성공: ${result.passed}개${colors.reset}`);
  console.log(`${colors.red}✗ 실패: ${result.failed}개${colors.reset}`);
  console.log(`${colors.yellow}⚠ 경고: ${result.warnings}개${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  if (result.failed > 0) {
    log.error('일부 테스트가 실패했습니다. 위 로그를 확인하세요.');
    process.exit(1);
  } else if (result.warnings > 0) {
    log.warning('모든 필수 테스트가 통과했지만 일부 경고가 있습니다.');
    process.exit(0);
  } else {
    log.success('모든 테스트가 통과했습니다! 🎉');
    process.exit(0);
  }
}

// 테스트 실행
runTests().catch((error) => {
  log.error(`예상치 못한 오류: ${error.message}`);
  console.error(error);
  process.exit(1);
});
