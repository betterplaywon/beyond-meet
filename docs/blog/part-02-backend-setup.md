# 영상 데이팅 앱 만들기 #2 - Node.js + TypeScript 백엔드 프로젝트 초기 세팅

> **이전 글 요약**: Part 1에서는 Beyond Meet 프로젝트의 기획 배경과 기술 스택을 선정했다. React Native + Node.js 조합으로 iOS/Android 동시 개발하고, 9개 무료 서비스 조합으로 $0/월 운영하는 전략을 세웠다.

이번 글에서는 본격적으로 **백엔드 개발 환경을 처음부터 구축**한다. 프론트엔드 개발자 입장에서 백엔드 세팅은 낯설었지만, 공식 문서를 읽으며 하나씩 따라했다.

---

## 📌 이번 파트에서 다룰 내용

- Node.js 프로젝트 초기화
- TypeScript 설정 (tsconfig.json)
- Express 서버 기본 구조
- 폴더 구조 설계 (Controller-Service 패턴)
- 개발 도구 설정 (ts-node-dev, Morgan, Helmet)
- 환경변수 관리 (.env)
- CORS 설정
- 첫 API 엔드포인트 작성 (Health Check)
- 로컬에서 서버 실행 확인

---

## 💡 왜 TypeScript를 사용하는가?

처음에는 JavaScript만으로 시작하려고 했다. 프론트엔드에서 React Native에 TypeScript를 쓰고 있긴 했지만, 백엔드는 JavaScript가 더 간단할 것 같았다.

그런데 Express 튜토리얼을 따라하다가 문제가 생겼다.

```javascript
// JavaScript로 작성했을 때
function createUser(data) {
  // data에 뭐가 들어있는지 모름
  return prisma.user.create({ data });
}

// 나중에 이렇게 호출했는데...
createUser({ email: 'test@example.com' });  // password가 빠졌는데 에러가 안 남
```

함수를 호출할 때 필수 필드를 빼먹었는데도 실행 전까진 에러가 안 났다. 런타임에 가서야 "password가 없다"는 에러가 떴다.

React Native에서는 TypeScript 덕분에 이런 실수를 막을 수 있었다. "백엔드도 TypeScript 쓰면 되지 않을까?" 싶어서 검색해봤다.

### TypeScript의 장점 (찾아보니...)

```
✅ 타입 안정성: 컴파일 타임에 에러 발견 (런타임 에러 감소)
✅ IDE 자동완성: VS Code에서 강력한 IntelliSense 지원
✅ 리팩토링 안전성: 타입 체크로 안전한 코드 변경
✅ 코드 가독성: 함수 시그니처만으로 사용법 파악 가능
```

TypeScript로 바꾸니 이렇게 됐다:

```typescript
interface CreateUserData {
  email: string;
  password: string;
  nickname: string;
}

function createUser(data: CreateUserData) {
  return prisma.user.create({ data });
}

// 이제 password를 빼먹으면 빨간 줄이 뜬다
createUser({ email: 'test@example.com' });  // ❌ 타입 에러!
```

VS Code에서 바로 에러를 보여줘서 훨씬 안전하게 개발할 수 있었다.

---

## 🛠️ Step 1: Node.js 프로젝트 초기화

### 1-1. 프로젝트 폴더 생성

```bash
mkdir beyond-meet
cd beyond-meet
mkdir backend
cd backend
```

### 1-2. package.json 생성

```bash
npm init -y
```

`npm init -y`를 실행하니 `package.json` 파일이 자동으로 생성됐다. 하지만 기본 설정은 우리 프로젝트에 맞지 않아서 수정했다.

**수정한 `package.json`**:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

**스크립트가 뭔지 찾아봤다**:
- `dev`: 개발 모드. 파일을 수정하면 자동으로 서버가 재시작된다.
- `build`: TypeScript 파일을 JavaScript로 변환한다.
- `start`: 프로덕션 모드. 변환된 JavaScript 파일을 실행한다.

React Native에서 `npm start`로 Metro Bundler를 실행하던 것처럼, 백엔드도 비슷한 구조구나 싶었다.

---

## 📦 Step 2: 필수 패키지 설치

Express 공식 문서를 보니 필요한 패키지가 정말 많았다. 하나씩 찾아보면서 설치했다.

### 2-1. 핵심 의존성 설치

```bash
npm install express cors dotenv helmet morgan
npm install typescript ts-node-dev @types/node @types/express @types/cors @types/morgan --save-dev
```

**이 패키지들이 뭔지 하나씩 찾아봤다**:

| 패키지 | 용도 | 왜 설치했나? |
|--------|------|-------------|
| `express` | 웹 프레임워크 | 백엔드 서버의 핵심. REST API를 만들 수 있다. |
| `cors` | CORS 설정 | React Native 앱에서 API를 호출하려면 필요하다고 함. |
| `dotenv` | 환경변수 관리 | DB 비밀번호 같은 걸 코드에 직접 쓰면 안 된다고 해서. |
| `helmet` | 보안 헤더 | XSS 공격 방어. 검색해보니 필수라고 나옴. |
| `morgan` | HTTP 로그 | 어떤 API가 호출됐는지 터미널에 표시해줌. 디버깅용. |
| `typescript` | TypeScript 컴파일러 | TS 파일을 JS로 변환. |
| `ts-node-dev` | 개발 서버 | Hot Reload 지원. nodemon 같은 거라고 함. |
| `@types/*` | 타입 정의 | TypeScript가 각 라이브러리의 타입을 알 수 있게 해줌. |

### CORS가 뭔지 몰라서 찾아봤다

"React Native API 호출 에러"로 검색하다가 CORS 개념을 알게 됐다.

- **CORS**: Cross-Origin Resource Sharing
- 웹 브라우저는 보안상 다른 도메인의 리소스를 차단한다.
- 예: `http://localhost:19006` (React Native 앱)에서 `http://localhost:5000` (백엔드)로 요청하면 차단됨.
- `cors` 패키지를 쓰면 특정 도메인만 허용할 수 있다.

### 2-2. 설치 확인

```bash
npm list express typescript
```

**현재 프로젝트 버전**:
- `express`: 5.1.0
- `typescript`: 5.9.3

---

## ⚙️ Step 3: TypeScript 설정

TypeScript 공식 문서를 보니 `tsconfig.json` 파일이 필요하다고 했다. 이 파일로 컴파일 옵션을 설정한다.

### 3-1. tsconfig.json 생성

처음에는 예시를 그대로 복사했는데, 각 옵션이 뭔지 몰라서 하나씩 찾아봤다.

**프로젝트 루트에 `tsconfig.json` 파일 생성**:

```json
{
  "compilerOptions": {
    "target": "ES2020",                  // Node.js 14+ 지원한다고 함
    "module": "commonjs",                // require() 방식 (Node.js 기본)
    "lib": ["ES2020"],                   // 사용할 JavaScript 기능
    "outDir": "./dist",                  // 컴파일된 JS 파일 저장 위치
    "rootDir": "./src",                  // TS 소스 파일 위치
    "strict": true,                      // 엄격한 타입 체크 (처음엔 귀찮지만 필수)
    "esModuleInterop": true,             // import/require 호환
    "skipLibCheck": true,                // 빌드 속도 향상
    "forceConsistentCasingInFileNames": true,  // 파일명 대소문자 체크
    "resolveJsonModule": true,           // JSON 파일 import 허용
    "moduleResolution": "node",          // Node.js 방식으로 모듈 찾기
    "declaration": true,                 // .d.ts 파일 생성 (타입 정의)
    "declarationMap": true,              // 디버깅용
    "sourceMap": true,                   // 디버깅용 소스맵
    "types": ["node"]                    // Node.js 타입 포함
  },
  "include": ["src/**/*"],               // 컴파일할 파일
  "exclude": ["node_modules", "dist"]    // 제외할 폴더
}
```

### 3-2. strict: true가 뭔지 찾아봤다

`strict: true`를 켜면 여러 옵션이 자동으로 활성화된다고 한다:
- `noImplicitAny`: 타입이 불명확하면 에러
- `strictNullChecks`: null/undefined 체크 강화
- `strictFunctionTypes`: 함수 타입 체크

처음엔 "에러가 너무 많이 나면 어떡하지?" 싶었는데, React Native에서도 strict 모드를 쓰고 있었다. 초기에 조금 귀찮아도 나중에 버그가 줄어든다고 해서 켰다.

---

## 📁 Step 4: 폴더 구조 설계

백엔드 폴더 구조를 어떻게 잡아야 할지 막막했다. "Node.js 폴더 구조"로 검색했더니 여러 패턴이 나왔다.

### 4-1. Controller-Service 패턴을 선택한 이유

MVC 패턴, 3-tier 아키텍처 등 여러 방법이 있었는데, Controller-Service 패턴이 제일 많이 나왔다.

```
┌─────────────┐
│  Controller  │ → 요청 받고 응답 보내기만 (얇은 레이어)
└──────┬──────┘
       ▼
┌─────────────┐
│   Service    │ → 실제 비즈니스 로직 (두꺼운 레이어)
└──────┬──────┘
       ▼
┌─────────────┐
│   Database   │
└─────────────┘
```

처음엔 이해가 안 됐다. "Controller에서 DB 접근하면 안 되나?" 싶었다.

찾아보니 **관심사 분리**라는 개념이었다:
- Controller는 HTTP 요청/응답만 처리
- Service는 비즈니스 로직만 처리
- 이렇게 분리하면 Service만 테스트할 수 있다

**나쁜 예 (Controller에 로직 다 때려박기)**:
```typescript
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash: hashedPassword }
  });
  res.json({ user });
};
```

**좋은 예 (Service로 분리)**:
```typescript
// Controller는 얇게
export const register = async (req: Request, res: Response) => {
  const user = await registerUser(req.body);  // Service 호출
  res.status(201).json({ success: true, data: user });
};

// Service가 실제 로직 처리
async function registerUser(data) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: { email: data.email, passwordHash: hashedPassword }
  });
}
```

React Native에서도 API 호출 로직을 컴포넌트에서 분리하는 것과 비슷한 개념이구나 싶었다.

### 4-2. 폴더 생성

```bash
mkdir -p src/{controllers,services,routes,middlewares,config,utils,sockets,@types}
```

### 4-3. 최종 폴더 구조

```
backend/
├── src/
│   ├── controllers/    # HTTP 요청 처리
│   ├── services/       # 비즈니스 로직
│   ├── routes/         # API 라우트
│   ├── middlewares/    # 미들웨어 (인증, 에러 핸들러)
│   ├── config/         # DB, Redis 설정
│   ├── utils/          # 유틸 함수
│   ├── sockets/        # Socket.io
│   ├── @types/         # 타입 정의
│   ├── app.ts          # Express 설정
│   └── server.ts       # 서버 시작
├── dist/               # 빌드 결과
├── node_modules/
├── package.json
├── tsconfig.json
└── .env
```

---

## 🚀 Step 5: Express 앱 기본 구조 작성

Express 공식 문서를 보고 기본 서버를 만들어봤다. 처음에는 간단하게 시작했다가 점점 기능을 추가했다.

### 5-1. app.ts 작성

**`src/app.ts`**:

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// 환경변수 로드 (가장 먼저 실행해야 함)
dotenv.config();

const createApp = (): Application => {
  const app = express();

  // Helmet: 보안 헤더 설정
  app.use(helmet());

  // CORS: React Native 앱에서 API 호출 허용
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }));

  // JSON 파싱 (req.body를 사용하려면 필요)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Morgan: HTTP 로그 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Health Check 엔드포인트
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 404 핸들러
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  });

  // 에러 핸들러
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Internal server error'
      }
    });
  });

  return app;
};

export default createApp;
```

**작성하면서 찾아본 것들**:

1. **helmet()이 뭔지 찾아봤다**:
   - 보안 헤더를 자동으로 설정해준다고 함
   - XSS 공격, Clickjacking 같은 걸 막아준다
   - "Node.js 보안"으로 검색하면 항상 나오는 필수 패키지

2. **CORS origin 설정**:
   - React Native 앱 주소를 `.env`에 넣어서 관리
   - `ALLOWED_ORIGINS=http://localhost:19006,http://localhost:19000`
   - 프로덕션에서는 실제 도메인으로 바꾸면 됨

3. **morgan('dev')**:
   - API 요청이 들어올 때마다 터미널에 로그가 찍힌다
   ```
   GET /health 200 2.345 ms - 85
   POST /api/auth/login 401 45.123 ms - 112
   ```
   - 디버깅할 때 엄청 유용했다

4. **에러 핸들러**:
   - Express는 에러 핸들러를 가장 마지막에 등록해야 한다고 함
   - 모든 에러를 여기서 잡아서 통일된 형식으로 응답

### 5-2. server.ts 작성

**`src/server.ts`**:

```typescript
import http from 'http';
import createApp from './app';

const PORT = process.env.PORT || 3000;

const app = createApp();
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;
```

**Graceful Shutdown이 뭔지 찾아봤다**:

"Node.js 안전하게 종료"로 검색했더니 나왔다.

- 서버를 종료할 때 진행 중인 요청을 기다려줘야 한다
- `Ctrl+C`를 누르면 `SIGINT` 신호가 온다
- Docker나 PM2로 종료하면 `SIGTERM` 신호가 온다
- 이 신호를 받으면 서버를 안전하게 종료한다

처음엔 "그냥 `Ctrl+C` 누르면 되지 않나?" 싶었는데, 배포 환경에서는 필수라고 해서 추가했다.

**http.createServer(app)을 쓴 이유**:

나중에 Socket.io를 붙일 때 필요하다고 공식 문서에 나와있었다. `app.listen()`도 되지만, Socket.io 통합을 위해 `http.createServer()`를 사용했다.

---

## 🔐 Step 6: 환경변수 관리

DB 비밀번호나 JWT 시크릿 같은 민감한 정보를 코드에 직접 쓰면 안 된다는 걸 알았다. GitHub에 올리면 보안 문제가 생긴다.

### 6-1. .env 파일 생성

**`.env`** (프로젝트 루트):

```bash
# 서버 설정
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:19000

# 데이터베이스 (나중에 추가)
DATABASE_URL=

# JWT (나중에 추가)
JWT_SECRET=
JWT_REFRESH_SECRET=
```

### 6-2. .gitignore 추가

**`.gitignore`**:

```
node_modules/
dist/
.env
*.log
```

**중요**: `.env` 파일은 절대 Git에 커밋하면 안 된다! GitHub에 비밀번호가 올라가면 큰일 난다.

### 6-3. .env.example 생성

다른 개발자가 참고할 수 있도록 예시 파일을 만들었다.

**`.env.example`**:

```bash
# 서버 설정
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:19006

# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/beyondmeet

# JWT
JWT_SECRET=your-secret-key-at-least-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-at-least-32-characters
```

---

## ✅ Step 7: 서버 실행 및 테스트

드디어 서버를 실행해볼 차례다. 첫 시도에서 바로 돌아갔으면 좋겠지만...

### 7-1. 개발 서버 실행

```bash
npm run dev
```

**출력 결과**:
```
🚀 Server is running on port 5000
📍 Environment: development
🔗 Health check: http://localhost:5000/health
```

성공! 서버가 실행됐다.

### 7-2. Health Check 테스트

브라우저를 열고 `http://localhost:5000/health`에 접속했다.

**응답**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T10:30:00.000Z",
  "environment": "development"
}
```

curl로도 확인해봤다:

```bash
curl http://localhost:5000/health
```

똑같은 응답이 나왔다. 제대로 작동한다!

### 7-3. Hot Reload 확인

코드를 수정하면 자동으로 재시작되는지 테스트했다.

`src/app.ts`에서 Health Check 응답을 수정:

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is healthy!',  // 이 줄 추가
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
```

파일을 저장하니 터미널에 이렇게 나왔다:

```
[INFO] Restarting: src/app.ts has been modified
🚀 Server is running on port 5000
```

다시 curl로 확인:

```bash
curl http://localhost:5000/health
```

**응답**:
```json
{
  "status": "ok",
  "message": "Server is healthy!",
  "timestamp": "2026-01-07T10:31:00.000Z",
  "environment": "development"
}
```

Hot Reload가 작동한다! React Native의 Fast Refresh처럼 편하다.

---

## 🎯 현재까지 완성된 것

### 체크리스트

- [x] Node.js 프로젝트 초기화
- [x] TypeScript 설정 완료
- [x] Express 기본 구조 작성
- [x] 폴더 구조 설계 (Controller-Service 패턴)
- [x] 보안 설정 (helmet, CORS)
- [x] 개발 도구 설정 (ts-node-dev, morgan)
- [x] 환경변수 관리 (.env)
- [x] Health Check 엔드포인트
- [x] 에러 핸들링
- [x] Graceful Shutdown

### 파일 구조

```
backend/
├── src/
│   ├── app.ts          ✅ Express 앱 설정
│   └── server.ts       ✅ 서버 시작
├── .env                ✅ 환경변수
├── .env.example        ✅ 환경변수 예시
├── .gitignore          ✅ Git 무시 파일
├── package.json        ✅ 의존성 관리
└── tsconfig.json       ✅ TypeScript 설정
```

---

## 🚨 자주 발생하는 에러와 해결법

### 에러 1: `Cannot find module 'express'`

첫 실행에서 이 에러가 났다.

**원인**: `npm install`을 안 했거나, `node_modules` 폴더가 없음

**해결**:
```bash
npm install
```

### 에러 2: `SyntaxError: Cannot use import statement`

`node src/server.ts`로 직접 실행했더니 이 에러가 났다.

**원인**: TypeScript 파일을 Node.js가 직접 실행할 수 없음

**해결**:
```bash
# ❌ 잘못된 방법
node src/server.ts

# ✅ 올바른 방법
npm run dev
```

### 에러 3: `Port 5000 is already in use`

서버를 여러 번 실행했더니 포트가 이미 사용 중이라고 나왔다.

**원인**: 이전 서버 프로세스가 아직 종료 안 됨

**해결**:
```bash
# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

또는 `.env`에서 포트 변경:
```bash
PORT=3000
```

---

## 💡 프로덕션 빌드

개발이 완료되면 프로덕션 빌드를 만들어야 한다. TypeScript를 JavaScript로 변환하는 과정이다.

### 빌드 명령어

```bash
npm run build
```

**생성된 파일**:
```
dist/
├── app.js
├── app.js.map
├── server.js
└── server.js.map
```

TypeScript 파일이 JavaScript로 변환됐다. `.map` 파일은 디버깅용 소스맵이다.

### 프로덕션 실행

```bash
NODE_ENV=production npm start
```

**차이점**:
- Morgan 로그가 비활성화됨 (성능 향상)
- 소스맵으로 디버깅 가능

---

## 📚 다음 글 예고

**Part 3: 개발 환경 구축 - Mobile (React Native)**

다음 글에서는 React Native 프로젝트를 처음부터 세팅한다. 이 부분은 프론트엔드 개발자로서 익숙한 영역이라 훨씬 수월할 것 같다.

다룰 내용:
- React Native CLI로 프로젝트 생성
- TypeScript 설정
- 폴더 구조 설계 (screens, components, services, hooks, store)
- iOS/Android 개발 환경 설정
- 환경변수 관리 (react-native-dotenv)
- 첫 화면 구현

---

## 📖 참고 자료

### 공식 문서
- [Express 공식 문서](https://expressjs.com/)
- [TypeScript 공식 문서](https://www.typescriptlang.org/)
- [ts-node-dev](https://github.com/wclr/ts-node-dev)

### 추천 읽을거리
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## 💬 마치며

이 글에서는 Node.js + TypeScript 백엔드 프로젝트를 처음부터 세팅했다.

**핵심 요약**:
- ✅ TypeScript로 타입 안정성 확보
- ✅ Express + Helmet으로 보안 강화
- ✅ Controller-Service 패턴으로 관심사 분리
- ✅ ts-node-dev로 빠른 개발 사이클
- ✅ 환경변수로 민감 정보 관리

프론트엔드 개발자 입장에서 백엔드 세팅은 처음에 낯설었다. 하지만 Express 공식 문서와 여러 블로그 글을 참고하면서 하나씩 따라하니 생각보다 어렵지 않았다.

특히 Controller-Service 패턴은 React에서 컴포넌트와 로직을 분리하는 것과 비슷한 개념이라 이해가 빨랐다.

다음 글에서는 React Native 앱 프로젝트를 세팅한다. 익숙한 영역이라 더 자세하게 다룰 수 있을 것 같다.

**궁금한 점이나 피드백은 댓글로 남겨달라.** 🙌

---

**태그**: `Node.js` `TypeScript` `Express` `백엔드 개발` `REST API` `ts-node-dev` `Controller-Service 패턴`
