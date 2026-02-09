# 프론트엔드 개발자 인터뷰 예상 질문 (경력 기반)

> devdive studio, devdive, semoAI, 다윈중개 프로젝트 기반 예상 질문 및 모범 답변

---

## 1. devdive studio 프로젝트

### 1.1 멀티스텝 파이프라인 설계

#### Q1. AI 서비스 생성 파이프라인을 어떻게 설계했나요?

**모범 답변**:
```
사용자가 아이디어만 입력하면 OpenAI Assistants API가 서비스를 기획하고,
V0로 코드를 생성하여 Vercel에 자동 배포하는 E2E 파이프라인을 설계했습니다.

[5단계 파이프라인 구조]
1. 아이디어 입력 → 2. AI 서비스 기획 생성(OpenAI Assistants API)
→ 3. 세부 실행 계획 생성(Pro Assistant) → 4. V0 코드 생성 → 5. Vercel 배포

[핵심 설계 포인트]

1. 순차 실행 제어
   - 이전 Task에서 생성된 v0 URL 존재 여부 확인
   - URL 확인 후에만 다음 Task 버튼 활성화
   - 작업 순서를 강제하여 파이프라인 일관성 보장

2. chatId 기반 채팅 연속성
   - 첫 Task에서 생성된 chatId를 이후 모든 Task에서 재사용
   - 같은 스레드에서 반복 수정 가능
   - 컨텍스트 유지로 AI 응답 품질 향상

3. 폴링 기반 상태 추적
   - 각 단계별 비동기 작업 상태를 주기적으로 확인
   - 장시간(최대 10분) 작업의 안정성 확보

[성과]
- 페이지 이동 없는 즉각적인 편집으로 베타 사용자 편의성 제공
- 복잡한 비동기 파이프라인을 직관적인 단계별 UI로 제공
- 변경 없이 저장 버튼 클릭 시 불필요한 서버 요청 차단
```

---

#### Q2. 계층 저장소 설계의 필요성과 구현 방법은?

**모범 답변**:
```typescript
// 최대 10분 이상 소요되는 작업 중 페이지 새로고침이나 브라우저 종료 시에도
// 진행 상태를 유지해야 하는 요구사항이 있었습니다.

// [3계층 저장소 설계]

// 1. React State (즉시 UI 반영)
// - 현재 작업 상태, UI 상태
// - 가장 빠른 반응성
const [currentTask, setCurrentTask] = useState<Task | null>(null);

// 2. localStorage (7일 유지)
// - 브라우저 종료 후에도 복구 가능
// - 클라이언트 사이드 캐시
localStorage.setItem('devdive_session', JSON.stringify({
  service_plan,
  tasks,
  v0_project_id,
  v0_chat_id,
  current_preview
}));

// 3. Redis (6시간 유지, 서버 측)
// - 다른 디바이스에서도 복구 가능
// - 서버 재시작에도 데이터 유지
await redis.set(`session:${userId}`, sessionData, 'EX', 21600);

// [진행 상태 스냅샷 객체 구성]
interface SessionSnapshot {
  service_plan: ServicePlan;
  tasks: Task[];
  v0_project_id: string;
  v0_chat_id: string;
  v0_results: V0Result[];
  chat_messages: Message[];
  current_preview: string;
}

// [페이지 진입 시 자동 복구 로직]
const restoreSession = async () => {
  // 1. 서버(Redis)에서 마지막 세션 데이터 로드
  const serverSession = await api.getSession();

  // 2. 고착 상태 초기화
  // v0Generating, isChatResponding 등 진행 중 플래그는 false로 리셋
  const sanitizedSession = {
    ...serverSession,
    v0Generating: false,
    isChatResponding: false
  };

  // 3. 상태 복원
  setSessionState(sanitizedSession);
};

// [성과]
// - 페이지 새로고침, 브라우저 종료 후에도 작업 연속성 보장
// - 장시간 AI 작업 중 예기치 않은 종료에도 데이터 손실 방지
```

---

### 1.2 안정성 / 에러 처리

#### Q3. V0 완료 확인을 위한 다중 확인 전략을 설명해주세요.

**모범 답변**:
```typescript
// 네트워크 오류나 API 장애 시에도 V0 생성 결과를 복구할 수 있도록
// 4단계 폴백 체인을 구현했습니다.

// [4단계 폴백 체인]
const checkV0Completion = async (projectId: string): Promise<V0Result | null> => {
  // 1단계: 백엔드 서버 response 확인
  try {
    const serverResult = await api.getV0Status(projectId);
    if (serverResult.completed) return serverResult;
  } catch (e) {
    console.log('Server check failed, trying V0 API directly');
  }

  // 2단계: 직접 V0 API 조회
  try {
    const v0Result = await v0Api.getProject(projectId);
    if (v0Result.status === 'completed') return v0Result;
  } catch (e) {
    console.log('V0 API failed, checking localStorage');
  }

  // 3단계: localStorage 캐시 확인
  const cachedResult = localStorage.getItem(`v0_result_${projectId}`);
  if (cachedResult) {
    const parsed = JSON.parse(cachedResult);
    if (parsed.completed) return parsed;
  }

  // 4단계: V0 프로젝트 최근 채팅 검색
  try {
    const chatHistory = await v0Api.getChatHistory(projectId);
    const completionMessage = chatHistory.find(msg =>
      msg.type === 'completion' && msg.url
    );
    if (completionMessage) return { url: completionMessage.url, completed: true };
  } catch (e) {
    console.log('All fallback methods failed');
  }

  return null;
};

// [각 단계의 역할]
// 1단계: 가장 빠른 응답, 서버 상태 동기화
// 2단계: 서버 장애 시 V0 직접 확인
// 3단계: 네트워크 완전 단절 시 로컬 캐시 활용
// 4단계: 모든 캐시 손실 시 원본 데이터 복구

// [성과]
// - 네트워크 오류나 API 장애 시에도 결과 복구 가능
// - 사용자 작업 손실 최소화
```

---

#### Q4. CORS 우회 프록시는 왜 필요했고 어떻게 구현했나요?

**모범 답변**:
```typescript
// V0 배포 URL의 CORS 제약으로 iframe에서 외부 URL을 직접 표시할 수 없었습니다.

// [문제 상황]
// V0에서 생성된 프리뷰 URL을 iframe으로 표시하려 했으나
// CORS 정책으로 인해 브라우저가 차단

// [해결: Next.js API Route로 프록시 구현]
// /api/preview-proxy/route.ts
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PreviewBot/1.0)',
      },
    });

    const html = await response.text();

    // 상대 경로를 절대 경로로 변환
    const processedHtml = html
      .replace(/src="\//g, `src="${new URL(url).origin}/`)
      .replace(/href="\//g, `href="${new URL(url).origin}/`);

    return new NextResponse(processedHtml, {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// [클라이언트에서 사용]
<iframe
  src={`/api/preview-proxy?url=${encodeURIComponent(v0PreviewUrl)}`}
  className="w-full h-full"
/>

// [추가 고려사항]
// - URL 화이트리스트로 악의적 URL 차단
// - 캐싱 헤더 추가로 성능 최적화
// - 에러 발생 시 폴백 UI 제공
```

---

## 2. devdive 프로젝트

### 2.1 렌더링 전략 (RSC/SSR/CSR)

#### Q5. next-mdx-remote/rsc를 도입한 이유와 구현 방법은?

**모범 답변**:
```typescript
// 기존 클라이언트 사이드 MDX 파싱(react-markdown)으로 인한
// 초기 로딩 지연 문제를 해결하기 위해 React Server Components로 전환했습니다.

// [기존 문제점 - 클라이언트 사이드 파싱]
// 1. 마크다운 파일 다운로드
// 2. JavaScript 번들 다운로드 (react-markdown, 플러그인들)
// 3. 클라이언트에서 파싱 실행
// 4. 파싱 완료 후 렌더링
// → FCP에서 LCP까지 평균 3초 소요

// [해결: React Server Components에서 MDX 파싱]
// app/models/[slug]/page.tsx (Server Component)
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypePrettyCode from 'rehype-pretty-code';

async function ModelDocsPage({ params }: { params: { slug: string } }) {
  const { tab } = searchParams;

  // 서버에서 마크다운 파일 로드
  const markdown = await fetchModelDocs(params.slug, tab);

  return (
    <article>
      <MDXRemote
        source={markdown}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],  // GitHub 마크다운 문법 지원
            rehypePlugins: [
              [rehypePrettyCode, { theme: 'github-dark' }]  // Shiki 구문 강조
            ],
          },
        }}
        components={customMDXComponents}
      />
    </article>
  );
}

// [커스텀 MDX 컴포넌트]
const customMDXComponents = {
  // 외부 링크에 target="_blank" 자동 추가
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  // 렌더링 최적화
  p: ({ children }) => (
    <p style={{ contentVisibility: 'auto' }}>
      {children}
    </p>
  ),
};

// [탭 기반 콘텐츠 전환]
// URL searchParams로 intro/docs 탭 상태 관리
// 서버에서 선택된 탭의 마크다운만 렌더링
// → 불필요한 마크다운 파싱 방지

// [성과]
// - API 문서 렌더링 시간 감소 (3s → 0.8s)
// - contentVisibility 적용으로 긴 마크다운 문서의 스크롤 성능 개선
// - JavaScript 번들 크기 감소 (react-markdown 번들 불필요)
```

---

#### Q6. SSR, CSR, ISR의 차이점과 각각 어떤 상황에서 사용했나요?

**모범 답변**:
```typescript
// devdive 프로젝트에서 페이지 특성에 따라 렌더링 전략을 다르게 적용했습니다.

// [1. SSR (Server-Side Rendering)]
// 사용 케이스: AI 모델 상세 페이지 - 항상 최신 데이터 필요
// app/models/[slug]/page.tsx
export const dynamic = 'force-dynamic';  // 매 요청마다 서버 렌더링

async function ModelPage({ params }) {
  const model = await fetchModel(params.slug);  // 요청 시점에 데이터 fetching
  return <ModelDetail model={model} />;
}

// 장점: 항상 최신 데이터, SEO 최적화
// 단점: 서버 부하, TTFB 증가

// [2. CSR (Client-Side Rendering)]
// 사용 케이스: 콘솔 대시보드 - 인증 필요, 실시간 데이터
// app/console/dashboard/page.tsx
'use client';

function DashboardPage() {
  const { data: usage } = useSuspenseQuery({
    queryKey: ['usage'],
    queryFn: fetchUsageStats,
    refetchInterval: 30000,  // 30초마다 갱신
  });

  return <UsageChart data={usage} />;
}

// 장점: 인터랙티브, 실시간 업데이트
// 단점: 초기 로딩 시 빈 화면, SEO 불리

// [3. ISR (Incremental Static Regeneration)]
// 사용 케이스: 모델 목록 페이지 - 자주 변경되지 않는 데이터
// app/models/page.tsx
export const revalidate = 3600;  // 1시간마다 재생성

async function ModelsListPage() {
  const models = await fetchModels();
  return <ModelList models={models} />;
}

// 장점: 빠른 로딩(정적), 적절한 신선도
// 단점: 즉시 반영 불가

// [4. RSC + Streaming]
// 사용 케이스: API 문서 페이지 - 무거운 컴포넌트 점진적 로딩
// app/models/[slug]/docs/page.tsx
import { Suspense } from 'react';

async function DocsPage({ params }) {
  return (
    <div>
      <DocsHeader />  {/* 즉시 렌더링 */}
      <Suspense fallback={<DocsSkeleton />}>
        <DocsContent slug={params.slug} />  {/* 스트리밍 */}
      </Suspense>
    </div>
  );
}

// 장점: 부분 로딩으로 LCP 개선
// 단점: 구현 복잡도 증가

// [선택 기준]
// | 특성 | SSR | CSR | ISR | RSC+Streaming |
// |------|-----|-----|-----|---------------|
// | SEO 필요 | O | X | O | O |
// | 실시간 데이터 | O | O | X | O |
// | 빠른 초기 로딩 | X | X | O | O |
// | 인터랙티브 | X | O | X | 부분적 |
```

---

### 2.2 공통 UI 컴포넌트 설계

#### Q7. Compound Component 패턴으로 Modal/Table을 어떻게 설계했나요?

**모범 답변**:
```typescript
// Props drilling 없이 유연한 조합이 가능하도록
// Compound Component 패턴을 적용했습니다.

// [Modal Compound Component 구현]
// components/Modal/index.tsx

interface ModalContextValue {
  isOpen: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// Root 컴포넌트
function ModalRoot({
  children,
  isOpen,
  onClose
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <ModalContext.Provider value={{ isOpen, onClose }}>
      <div className="modal-backdrop" onClick={onClose}>
        {children}
      </div>
    </ModalContext.Provider>
  );
}

// 서브 컴포넌트들
function Overlay({ children }: { children: ReactNode }) {
  return <div className="modal-overlay">{children}</div>;
}

function Content({ children }: { children: ReactNode }) {
  return (
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function Header({ children }: { children: ReactNode }) {
  return <div className="modal-header">{children}</div>;
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="modal-title">{children}</h2>;
}

function Body({ children }: { children: ReactNode }) {
  return <div className="modal-body">{children}</div>;
}

function CloseButton() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('CloseButton must be used within Modal');

  return (
    <button onClick={context.onClose} className="modal-close">
      ✕
    </button>
  );
}

// 조합하여 export
export const Modal = Object.assign(ModalRoot, {
  Overlay,
  Content,
  Header,
  Title,
  Body,
  CloseButton,
});

// [사용 예시 - 필요한 요소만 선택적 사용]
<Modal isOpen={isOpen} onClose={handleClose}>
  <Modal.Overlay>
    <Modal.Content>
      <Modal.Header>
        <Modal.Title>결제 확인</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Body>
        <PaymentForm />
      </Modal.Body>
    </Modal.Content>
  </Modal.Overlay>
</Modal>

// [Table Compound Component - 동일 패턴]
export const Table = Object.assign(TableRoot, {
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Caption,
});

// [장점]
// 1. 유연한 조합 - 필요한 서브컴포넌트만 사용
// 2. 일관된 스타일과 동작 보장
// 3. Props drilling 제거
// 4. 타입 안전성 유지
```

---

#### Q8. Polymorphic Component 패턴으로 Button을 어떻게 구현했나요?

**모범 답변**:
```typescript
// Button 컴포넌트가 <button>, <a>, <Link> 등 다양한 요소로 렌더링되면서
// 동일한 스타일과 타입 안전성을 유지해야 했습니다.

// [Mantine의 createPolymorphicComponent 활용]
import {
  createPolymorphicComponent,
  Box,
  BoxProps
} from '@mantine/core';
import { forwardRef } from 'react';

// 버튼 Props 정의
interface ButtonProps extends BoxProps {
  variant?: 'filled' | 'outline' | 'subtle' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// 스타일 객체
const getButtonStyles = (variant: string, size: string) => ({
  // 16가지 variant/size 조합
  padding: sizes[size].padding,
  fontSize: sizes[size].fontSize,
  backgroundColor: variants[variant].bg,
  color: variants[variant].color,
  // ...
});

// Polymorphic Button 구현
const _Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'filled', size = 'md', loading, children, ...props }, ref) => {
    return (
      <Box
        component="button"  // 기본값
        ref={ref}
        style={getButtonStyles(variant, size)}
        disabled={loading}
        {...props}
      >
        {loading && <Spinner size={size} />}
        {children}
      </Box>
    );
  }
);

// Polymorphic 컴포넌트로 변환
export const Button = createPolymorphicComponent<'button', ButtonProps>(_Button);

// [사용 예시 - 다양한 요소로 렌더링]

// 1. 기본 button
<Button variant="filled" onClick={handleClick}>
  저장
</Button>

// 2. anchor 태그로 렌더링
<Button component="a" href="https://example.com" target="_blank">
  외부 링크
</Button>

// 3. Next.js Link로 렌더링
<Button component={Link} href="/dashboard">
  대시보드로 이동
</Button>

// 4. react-router Link로 렌더링
<Button component={RouterLink} to="/profile">
  프로필
</Button>

// [타입 안전성]
// component prop에 따라 허용되는 props가 자동으로 변경됨
<Button component="a" href="..." />  // ✅ href 허용
<Button href="..." />  // ❌ 타입 에러 (button에는 href 없음)

// [성과]
// - 16가지 variant/size 조합 지원
// - Button, UnstyledButton 등에서 동일 패턴 재사용
// - 타입 안전한 다형성 렌더링
```

---

### 2.3 개발 생산성 / DX 개선

#### Q9. pnpm 마이그레이션으로 어떤 문제를 해결했나요?

**모범 답변**:
```
yarn classic 환경에서 발생한 유령 의존성(phantom dependency) 문제를
pnpm 마이그레이션으로 해결했습니다.

[문제 상황: 유령 의존성]
- A 패키지가 B 패키지에 의존
- B 패키지가 C 패키지에 의존
- 코드에서 직접 import C를 사용 (package.json에 없음)
- B 패키지 업데이트로 C 제거 시 → 런타임 에러!

// 실제 발생 사례
import something from 'internal-package';  // package.json에 없음
// yarn에서는 동작, pnpm에서는 에러

[pnpm의 해결 방식: 심볼릭 링크 기반 의존성 관리]
node_modules/
├── .pnpm/                    # 실제 패키지 저장소
│   ├── react@18.2.0/
│   └── lodash@4.17.21/
├── react -> .pnpm/react@18.2.0/node_modules/react  # 심볼릭 링크
└── lodash -> .pnpm/lodash@4.17.21/node_modules/lodash

- package.json에 명시된 의존성만 node_modules 루트에 링크
- 유령 의존성 접근 시 명확한 에러 발생
- 의도하지 않은 의존성 사용 차단

[마이그레이션 과정]
1. yarn.lock 삭제
2. node_modules 삭제
3. package.json의 scripts 수정 (yarn → pnpm)
4. pnpm install 실행
5. pnpm-lock.yaml 생성 확인
6. 유령 의존성 발견 시 package.json에 명시적 추가

[성과]
- 유령 의존성 문제 완전 해결
- 빌드 시간 27% 감소
- 디스크 사용량 19% 감소 (하드 링크로 중복 제거)
- CI/CD 파이프라인 속도 향상
```

---

#### Q10. OpenAPI 기반 TypeScript 타입 자동 생성 파이프라인을 설명해주세요.

**모범 답변**:
```typescript
// 백엔드 API 스키마 변경 시 프론트엔드 타입을 수동으로 업데이트하면서
// 타입 불일치로 인한 런타임 에러가 발생했습니다.

// [문제 상황]
// 1. 백엔드: API 응답 필드명 변경 (userName → username)
// 2. 프론트: 기존 타입 그대로 사용
// 3. 런타임: undefined 접근 에러!

// [해결: OpenAPI 스펙 기반 타입 자동 생성]

// 1. OpenAPI 스펙 병합 (여러 서비스의 API 스펙 통합)
// openapi-merge.yaml
inputs:
  - inputFile: ./specs/auth-api.yaml
  - inputFile: ./specs/model-api.yaml
  - inputFile: ./specs/payment-api.yaml
output: ./merged-api.yaml

// 2. 타입 생성 설정
// openapitools.json
{
  "generator-cli": {
    "generators": {
      "typescript-models": {
        "generatorName": "typescript-fetch",
        "output": "./src/models",
        "glob": "./merged-api.yaml",
        "additionalProperties": {
          "modelPropertyNaming": "camelCase",
          "enumPropertyNaming": "UPPERCASE",
          "supportsES6": true,
          "withInterfaces": true
        }
      }
    }
  }
}

// 3. 커스텀 Mustache 템플릿 (코딩 컨벤션 적용)
// templates/modelGeneric.mustache
{{#models}}
{{#model}}
export interface {{classname}} {
{{#vars}}
  {{#description}}/** {{description}} */{{/description}}
  {{name}}{{^required}}?{{/required}}: {{dataType}};
{{/vars}}
}
{{/model}}
{{/models}}

// 4. package.json 스크립트
{
  "scripts": {
    "api:merge": "openapi-merge-cli --config openapi-merge.yaml",
    "api:generate": "openapi-generator-cli generate",
    "generate": "npm run api:merge && npm run api:generate"
  }
}

// [생성된 타입 예시]
// src/models/User.ts (자동 생성)
export interface User {
  /** 사용자 고유 ID */
  id: string;
  /** 사용자 이메일 */
  email: string;
  /** 사용자명 */
  username: string;  // 자동으로 최신 필드명 반영
  createdAt: string;
}

// [사용 방법]
import { User, ApiResponse } from '@/models';

const fetchUser = async (id: string): Promise<ApiResponse<User>> => {
  const response = await api.get(`/users/${id}`);
  return response.data;  // 타입 자동 추론
};

// [성과]
// - 41개 모델 타입 자동 생성
// - API 변경 시 npm run generate 한 번으로 타입 동기화
// - 컴파일 타임에 API 응답 타입 검증
// - 런타임 타입 불일치 에러 제거
```

---

### 2.4 CI/CD 및 테스트 자동화

#### Q11. Playwright MCP 기반 E2E 테스트 환경을 어떻게 구축했나요?

**모범 답변**:
```typescript
// 사용자 시나리오를 직접 테스트해보며 검증하는 불편함과
// 인증/인가가 필요한 페이지의 Core Web Vitals 메트릭 수집이 필요했습니다.

// [Playwright MCP 활용]
// 단일 브라우저 컨텍스트에서 인증 상태를 유지하며 여러 페이지 테스트

// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'https://devdive.ai',
    storageState: 'playwright/.auth/user.json',  // 인증 상태 저장
  },
  projects: [
    {
      name: 'authenticated',
      use: { storageState: 'playwright/.auth/user.json' },
    },
  ],
});

// [E2E 테스트 예시]
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('사용자 시나리오 테스트', () => {
  test('로그인 → 모델 선택 → API 키 생성', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. 대시보드 이동 확인
    await expect(page).toHaveURL('/dashboard');

    // 3. 모델 페이지로 이동
    await page.click('text=모델');
    await page.click('text=GPT-4');

    // 4. API 키 생성
    await page.click('text=API 키 생성');
    await expect(page.locator('.api-key')).toBeVisible();
  });
});

// [Lighthouse CI 통합]
// lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      url: [
        'https://devdive.ai/',
        'https://devdive.ai/models',
        'https://devdive.ai/console/dashboard',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

// [Core Web Vitals 메트릭 수집 + CloudWatch 연동]
// .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  schedule:
    - cron: '0 0 1 * *'  # 매월 1일 실행

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouse.config.js'

      - name: Push to CloudWatch
        run: |
          aws cloudwatch put-metric-data \
            --metric-name LCP \
            --namespace WebVitals \
            --value ${{ steps.lighthouse.outputs.lcp }}

// [성과]
// - 1일 소요되던 QA 프로세스를 3시간 이내로 단축
// - 실제 사용자 시나리오 기반 E2E 테스트로 품질 보장
// - 매월 Core Web Vitals 메트릭 자동 수집 및 모니터링
```

---

#### Q12. 회원가입 멀티스텝 폼의 히스토리 상태 관리를 어떻게 개선했나요?

**모범 답변**:
```typescript
// 회원가입 퍼널 구현 시 뒤로가기 핸들러와 히스토리 상태 관리로
// 코드 복잡도가 증가하는 문제가 있었습니다.

// [기존 문제점]
// 1. 브라우저 뒤로가기 시 폼 데이터 손실
// 2. 뒤로가기 핸들러 직접 구현 필요
// 3. 단일 폼 컨텍스트로 스텝별 타입 추론 범위 문제

// [기존 코드 - 복잡한 히스토리 관리]
const [step, setStep] = useState(1);
const [formData, setFormData] = useState({});

useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    if (e.state?.step) {
      setStep(e.state.step);
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);

const goToNext = () => {
  const nextStep = step + 1;
  window.history.pushState({ step: nextStep }, '', `?step=${nextStep}`);
  setStep(nextStep);
};

// [해결: @use-funnel/browser 도입]
import { useFunnel } from '@use-funnel/browser';

// 스텝별 타입 정의
interface Step1Data {
  email: string;
}

interface Step2Data extends Step1Data {
  password: string;
  passwordConfirm: string;
}

interface Step3Data extends Step2Data {
  name: string;
  phone: string;
}

// 퍼널 훅 사용
function SignupPage() {
  const funnel = useFunnel<{
    step1: Step1Data;
    step2: Step2Data;
    step3: Step3Data;
  }>({
    id: 'signup-funnel',
    initial: {
      step: 'step1',
      context: { email: '' },
    },
  });

  return (
    <funnel.Render
      step1={({ context, history }) => (
        <EmailStep
          email={context.email}
          onNext={(email) => history.push('step2', { ...context, email })}
        />
      )}
      step2={({ context, history }) => (
        <PasswordStep
          data={context}  // Step2Data 타입으로 추론됨
          onNext={(passwords) => history.push('step3', { ...context, ...passwords })}
          onBack={() => history.back()}
        />
      )}
      step3={({ context }) => (
        <ProfileStep
          data={context}  // Step3Data 타입으로 추론됨
          onSubmit={() => submitSignup(context)}
        />
      )}
    />
  );
}

// [각 스텝 내 폼 검증은 React Hook Form + Zod]
function EmailStep({ email, onNext }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email },
  });

  return (
    <form onSubmit={handleSubmit((data) => onNext(data.email))}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">다음</button>
    </form>
  );
}

// [성과]
// - 히스토리 관리 관련 이벤트 핸들러 및 상태 로직 전체 제거
// - URL 쿼리 기반 뒤로가기/앞으로가기 자동 처리
// - 스텝별 타입 추론으로 데이터 범위 명확화
// - 히스토리와 폼 상태 관심사 분리
```

---

## 3. semoAI 프로젝트

### 3.1 대용량 파일 업로드 최적화

#### Q13. AWS S3 Multipart Upload를 어떻게 구현했나요?

**모범 답변**:
```typescript
// 채팅 페이지에서 대용량 첨부파일 전송 시 긴 업로드 시간으로
// 사용자 피드백이 있었습니다.

// [문제 상황]
// - 850MB 파일 업로드에 36초 이상 소요
// - 업로드 중 진행률 표시 없음
// - 업로드 실패 시 처음부터 다시 시작

// [해결: Multipart Upload 구현]

// 1. 업로드 초기화 (서버)
const initiateUpload = async (filename: string, fileType: string) => {
  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `uploads/${Date.now()}_${filename}`,
    ContentType: fileType,
  });

  const { UploadId, Key } = await s3Client.send(command);
  return { uploadId: UploadId, key: Key };
};

// 2. 청크 분할 및 병렬 업로드 (클라이언트)
const CHUNK_SIZE = 10 * 1024 * 1024;  // 10MB

const uploadFile = async (file: File, onProgress: (percent: number) => void) => {
  // 업로드 초기화
  const { uploadId, key } = await api.initiateUpload(file.name, file.type);

  // 파일을 청크로 분할
  const chunks: Blob[] = [];
  let start = 0;
  while (start < file.size) {
    chunks.push(file.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE;
  }

  // Presigned URL 획득 및 병렬 업로드
  const uploadPromises = chunks.map(async (chunk, index) => {
    const { presignedUrl } = await api.getPresignedUrl(uploadId, key, index + 1);

    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
    });

    // 진행률 업데이트
    const completedParts = index + 1;
    onProgress((completedParts / chunks.length) * 100);

    return {
      PartNumber: index + 1,
      ETag: response.headers.get('ETag'),
    };
  });

  const parts = await Promise.all(uploadPromises);

  // 업로드 완료
  await api.completeUpload(uploadId, key, parts);

  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
};

// 3. 에러 핸들링 - 특정 청크만 재시도
const uploadWithRetry = async (
  chunk: Blob,
  partNumber: number,
  maxRetries = 3
) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadChunk(chunk, partNumber);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(Math.pow(2, attempt) * 1000);  // 지수 백오프
    }
  }
};

// 4. 진행률 UI
function UploadProgress({ percent }: { percent: number }) {
  return (
    <div className="upload-progress">
      <div
        className="progress-bar"
        style={{ width: `${percent}%` }}
      />
      <span>{Math.round(percent)}%</span>
    </div>
  );
}

// [성과]
// - 850MB 파일 기준 업로드 시간 36.04s → 23.50s (35% 단축)
// - 실시간 진행률 표시로 사용자 경험 개선
// - 청크 실패 시 해당 청크만 재시도로 안정성 향상
// - 무의미한 새로고침/페이지 이탈 감소
```

---

### 3.2 Server Driven UI

#### Q14. Server Driven UI를 어떻게 구현했고, 어떤 문제를 해결했나요?

**모범 답변**:
```typescript
// 홈화면 UI를 주기적으로 업데이트할 때마다
// 프론트엔드 코드 수정 및 배포가 필요해 리소스 낭비가 발생했습니다.

// [문제 상황]
// - 이벤트 배너 추가 → 프론트엔드 배포 필요
// - 추천 서비스 순서 변경 → 프론트엔드 배포 필요
// - 긴급 공지 → 프론트엔드 배포 후 반영

// [해결: Server Driven UI 아키텍처]

// 1. 서버에서 전달하는 JSON 스키마 정의
interface SDUIComponent {
  type: 'banner' | 'card' | 'list' | 'text' | 'button';
  id: string;
  props: Record<string, any>;
  children?: SDUIComponent[];
  style?: CSSProperties;
  actions?: SDUIAction[];
}

interface SDUIAction {
  type: 'navigate' | 'openUrl' | 'showModal' | 'apiCall';
  payload: Record<string, any>;
}

// 2. 서버 응답 예시
{
  "screen": "home",
  "components": [
    {
      "type": "banner",
      "id": "event-banner",
      "props": {
        "imageUrl": "https://cdn.example.com/event.jpg",
        "title": "신규 가입 이벤트"
      },
      "style": { "marginBottom": 16 },
      "actions": [
        { "type": "navigate", "payload": { "path": "/event/signup" } }
      ]
    },
    {
      "type": "list",
      "id": "recommended-services",
      "props": {
        "title": "추천 서비스",
        "direction": "horizontal"
      },
      "children": [
        {
          "type": "card",
          "id": "service-1",
          "props": {
            "title": "AI 챗봇",
            "description": "맞춤형 AI 챗봇 구축",
            "thumbnail": "https://cdn.example.com/chatbot.jpg"
          }
        }
      ]
    }
  ]
}

// 3. 동적 컴포넌트 렌더러
const componentMap: Record<string, React.ComponentType<any>> = {
  banner: BannerComponent,
  card: CardComponent,
  list: ListComponent,
  text: TextComponent,
  button: ButtonComponent,
};

function SDUIRenderer({ component }: { component: SDUIComponent }) {
  const Component = componentMap[component.type];

  if (!Component) {
    console.warn(`Unknown component type: ${component.type}`);
    return null;
  }

  const handleAction = (action: SDUIAction) => {
    switch (action.type) {
      case 'navigate':
        router.push(action.payload.path);
        break;
      case 'openUrl':
        window.open(action.payload.url, '_blank');
        break;
      case 'showModal':
        openModal(action.payload.modalId);
        break;
      case 'apiCall':
        api.post(action.payload.endpoint, action.payload.data);
        break;
    }
  };

  return (
    <Component
      {...component.props}
      style={component.style}
      onAction={(action: SDUIAction) => handleAction(action)}
    >
      {component.children?.map((child) => (
        <SDUIRenderer key={child.id} component={child} />
      ))}
    </Component>
  );
}

// 4. 홈 화면에서 사용
function HomePage() {
  const { data: screenConfig } = useQuery({
    queryKey: ['sdui', 'home'],
    queryFn: () => api.getScreenConfig('home'),
    staleTime: 5 * 60 * 1000,  // 5분 캐시
  });

  return (
    <div>
      {screenConfig?.components.map((component) => (
        <SDUIRenderer key={component.id} component={component} />
      ))}
    </div>
  );
}

// [성과]
// - 프론트엔드 코드 수정 및 배포 없이 UI 업데이트 가능
// - 팀 리소스 절약 및 배포 지연 해소
// - 마케팅팀에서 직접 이벤트 배너 추가/수정 가능
```

---

## 4. 다윈중개 프로젝트

### 4.1 실거래가 기반 검증 시스템

#### Q15. 비정상 거래 금액 등록 방지 시스템을 어떻게 구현했나요?

**모범 답변**:
```typescript
// 매물 등록 시 실수로 비정상적인 가격을 입력하는 케이스가 발생하여
// 유저와 중개인 간 갈등 및 커뮤니케이션 비용이 발생했습니다.

// [문제 상황]
// - 3억 매물을 30억으로 입력
// - 전세 8억을 월세 800만원으로 착각하여 입력
// - 실거래가 대비 비정상적으로 높거나 낮은 가격 등록

// [해결: 실거래가 기반 가격 검증 로직]

// 1. 실거래가 데이터 조회
const fetchRealTransactionPrice = async (
  address: string,
  propertyType: string,
  area: number
) => {
  const response = await api.get('/real-transaction-prices', {
    params: { address, propertyType, area },
  });

  return {
    avgPrice: response.data.avgPrice,
    minPrice: response.data.minPrice,
    maxPrice: response.data.maxPrice,
    recentTransactions: response.data.transactions,
  };
};

// 2. 가격 검증 로직
const validatePrice = (
  inputPrice: number,
  realTransactionData: RealTransactionData
): ValidationResult => {
  const { avgPrice, minPrice, maxPrice } = realTransactionData;

  // 허용 범위: 최저가의 70% ~ 최고가의 150%
  const lowerBound = minPrice * 0.7;
  const upperBound = maxPrice * 1.5;

  if (inputPrice < lowerBound) {
    return {
      isValid: false,
      type: 'TOO_LOW',
      message: `입력하신 금액이 최근 실거래가(${formatPrice(minPrice)}~${formatPrice(maxPrice)})보다 매우 낮습니다.`,
      suggestion: avgPrice,
    };
  }

  if (inputPrice > upperBound) {
    return {
      isValid: false,
      type: 'TOO_HIGH',
      message: `입력하신 금액이 최근 실거래가보다 매우 높습니다.`,
      suggestion: avgPrice,
    };
  }

  // 경고 범위: 평균가의 ±30%
  if (Math.abs(inputPrice - avgPrice) / avgPrice > 0.3) {
    return {
      isValid: true,
      type: 'WARNING',
      message: `입력하신 금액이 평균 실거래가(${formatPrice(avgPrice)})와 차이가 있습니다.`,
    };
  }

  return { isValid: true, type: 'OK' };
};

// 3. UI 컴포넌트
function PriceInput({ value, onChange, propertyInfo }) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handlePriceChange = async (price: number) => {
    onChange(price);

    const realData = await fetchRealTransactionPrice(
      propertyInfo.address,
      propertyInfo.type,
      propertyInfo.area
    );

    const result = validatePrice(price, realData);
    setValidation(result);
  };

  const handleSubmit = () => {
    if (validation?.type === 'TOO_LOW' || validation?.type === 'TOO_HIGH') {
      setShowConfirmModal(true);  // 확인 모달 표시
    } else {
      submitForm();
    }
  };

  return (
    <div>
      <input
        type="number"
        value={value}
        onChange={(e) => handlePriceChange(Number(e.target.value))}
      />

      {validation?.type === 'WARNING' && (
        <div className="warning-message">
          ⚠️ {validation.message}
        </div>
      )}

      {(validation?.type === 'TOO_LOW' || validation?.type === 'TOO_HIGH') && (
        <div className="error-message">
          ❌ {validation.message}
          <br />
          추천 가격: {formatPrice(validation.suggestion)}
        </div>
      )}

      {/* 비정상 가격 입력 시 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitForm}
        title="가격 확인"
        message="입력하신 가격이 실거래가와 큰 차이가 있습니다. 정말 이 가격으로 등록하시겠습니까?"
      />
    </div>
  );
}

// [성과]
// - 거래 금액 관련 커뮤니케이션 비용 100% 감소
// - 비정상 가격 등록으로 인한 분쟁 사전 차단
```

---

#### Q16. 중개보수 수수료 계산기를 어떻게 구현했나요?

**모범 답변**:
```typescript
// 수수료 정보 미제공으로 매물 상세 페이지 이탈율이 증가하는 문제가 있었습니다.

// [중개보수 요율표 기반 계산 로직]
const BROKERAGE_FEE_TABLE = {
  // 매매
  sale: {
    under50m: { rate: 0.006, max: 250000 },      // 5천만 미만: 0.6%, 최대 25만
    under200m: { rate: 0.005, max: 800000 },     // 2억 미만: 0.5%, 최대 80만
    under900m: { rate: 0.004, max: null },       // 9억 미만: 0.4%
    over900m: { rate: 0.009, max: null },        // 9억 이상: 협의 (0.9% 이내)
  },
  // 전세
  lease: {
    under50m: { rate: 0.005, max: 200000 },
    under100m: { rate: 0.004, max: 300000 },
    under300m: { rate: 0.003, max: null },
    over300m: { rate: 0.008, max: null },
  },
  // 월세
  rent: {
    // 환산보증금 = 보증금 + (월세 × 100)
    // 환산보증금 기준으로 전세와 동일 적용
  },
};

// 지역별 요율 차이 (서울 vs 그 외)
const REGIONAL_MULTIPLIER = {
  seoul: 1.0,
  metropolitan: 0.9,  // 광역시
  other: 0.8,         // 그 외 지역
};

// 수수료 계산 함수
const calculateBrokerageFee = (
  transactionType: 'sale' | 'lease' | 'rent',
  price: number,
  monthlyRent?: number,
  region: string = 'seoul'
): BrokerageFeeResult => {
  let targetPrice = price;

  // 월세인 경우 환산보증금 계산
  if (transactionType === 'rent' && monthlyRent) {
    targetPrice = price + (monthlyRent * 100);
  }

  // 가격 구간별 요율 결정
  const table = transactionType === 'sale'
    ? BROKERAGE_FEE_TABLE.sale
    : BROKERAGE_FEE_TABLE.lease;

  let feeInfo;
  if (targetPrice < 50000000) {
    feeInfo = table.under50m;
  } else if (targetPrice < 200000000) {
    feeInfo = table.under200m;
  } else if (targetPrice < 900000000) {
    feeInfo = table.under900m;
  } else {
    feeInfo = table.over900m;
  }

  // 기본 수수료 계산
  let fee = targetPrice * feeInfo.rate;

  // 상한선 적용
  if (feeInfo.max && fee > feeInfo.max) {
    fee = feeInfo.max;
  }

  // 지역별 보정
  const regionalFactor = REGIONAL_MULTIPLIER[region] || 1.0;
  fee = fee * regionalFactor;

  return {
    fee: Math.round(fee),
    rate: feeInfo.rate * 100,
    maxFee: feeInfo.max,
    targetPrice,
    transactionType,
  };
};

// 수수료 계산기 UI
function BrokerageFeeCalculator({ property }) {
  const [transactionType, setTransactionType] = useState<'sale' | 'lease' | 'rent'>('sale');
  const [price, setPrice] = useState(property.price);
  const [monthlyRent, setMonthlyRent] = useState(0);

  const feeResult = useMemo(
    () => calculateBrokerageFee(transactionType, price, monthlyRent, property.region),
    [transactionType, price, monthlyRent, property.region]
  );

  return (
    <div className="fee-calculator">
      <h3>중개보수 계산기</h3>

      <div className="transaction-type-selector">
        <button
          className={transactionType === 'sale' ? 'active' : ''}
          onClick={() => setTransactionType('sale')}
        >
          매매
        </button>
        <button
          className={transactionType === 'lease' ? 'active' : ''}
          onClick={() => setTransactionType('lease')}
        >
          전세
        </button>
        <button
          className={transactionType === 'rent' ? 'active' : ''}
          onClick={() => setTransactionType('rent')}
        >
          월세
        </button>
      </div>

      <div className="price-inputs">
        <label>
          {transactionType === 'rent' ? '보증금' : '거래금액'}
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>

        {transactionType === 'rent' && (
          <label>
            월세
            <input
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      <div className="result">
        <p>적용 요율: {feeResult.rate}%</p>
        <p className="fee-amount">
          예상 중개보수: <strong>{formatPrice(feeResult.fee)}</strong>
        </p>
        {feeResult.maxFee && (
          <p className="max-fee">상한액: {formatPrice(feeResult.maxFee)}</p>
        )}
      </div>
    </div>
  );
}

// [성과]
// - 수수료 관련 고객 문의 70% 감소
// - 매물 상세 페이지 이탈율 감소
// - 사용자가 예상 비용을 미리 확인하여 거래 의사결정 지원
```

---

## 5. 최신 React 기술 심화

### 5.1 Concurrent Rendering

#### Q17. React 18의 Concurrent Rendering을 실무에 어떻게 활용했나요?

**모범 답변**:
```typescript
// devdive 프로젝트에서 모델 목록 검색 시 타이핑이 끊기는 문제가 있었습니다.

// [문제 상황]
// - 수백 개의 AI 모델 목록을 필터링
// - 검색어 입력 시마다 전체 리스트 리렌더링
// - 타이핑 지연으로 사용자 경험 저하

// [해결: useTransition 활용]
function ModelSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [isPending, startTransition] = useTransition();

  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: fetchAllModels,
  });

  const handleSearch = (query: string) => {
    // 입력은 즉시 반영 (긴급 업데이트)
    setSearchQuery(query);

    // 필터링은 낮은 우선순위로 처리 (전환 업데이트)
    startTransition(() => {
      const filtered = models?.filter(model =>
        model.name.toLowerCase().includes(query.toLowerCase()) ||
        model.description.toLowerCase().includes(query.toLowerCase())
      ) ?? [];
      setFilteredModels(filtered);
    });
  };

  return (
    <div>
      <SearchInput
        value={searchQuery}
        onChange={handleSearch}
        placeholder="모델 검색..."
      />

      {isPending && <LoadingOverlay />}

      <ModelList
        models={filteredModels}
        style={{ opacity: isPending ? 0.7 : 1 }}
      />
    </div>
  );
}

// [useDeferredValue 활용 사례]
// 부모 컴포넌트에서 전달받은 props를 지연시킬 때
function ModelDetailModal({ modelId }: { modelId: string }) {
  const deferredModelId = useDeferredValue(modelId);

  const { data: model } = useSuspenseQuery({
    queryKey: ['model', deferredModelId],
    queryFn: () => fetchModel(deferredModelId),
  });

  // modelId !== deferredModelId면 이전 데이터 표시 중
  const isStale = modelId !== deferredModelId;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <ModelDetails model={model} />
    </div>
  );
}

// [성과]
// - 검색 타이핑 끊김 현상 해결
// - 필터링 중에도 부드러운 UI 유지
// - isPending으로 로딩 상태 시각적 피드백 제공
```

---

### 5.2 React Server Components

#### Q18. React Server Components를 어떤 기준으로 사용했나요?

**모범 답변**:
```typescript
// devdive 프로젝트에서 Next.js 14 App Router를 사용하며
// Server/Client Component를 명확히 구분했습니다.

// [구분 기준]

// Server Component로 구현 (기본값)
// 1. 정적 콘텐츠 (마크다운 문서, 소개 페이지)
// 2. 데이터 fetching이 필요한 페이지 (초기 로드)
// 3. 서버에서 직접 DB/API 접근이 필요한 경우

// Client Component로 구현 ('use client')
// 1. 이벤트 핸들러가 필요한 경우 (onClick, onChange)
// 2. 브라우저 API가 필요한 경우 (localStorage, window)
// 3. useState, useEffect 등 훅 사용
// 4. 실시간 업데이트가 필요한 경우

// [실제 적용 예시]

// Server Component: 모델 상세 페이지
// app/models/[slug]/page.tsx
async function ModelPage({ params }: { params: { slug: string } }) {
  // 서버에서 직접 데이터 fetching
  const model = await prisma.model.findUnique({
    where: { slug: params.slug },
    include: { pricing: true, features: true },
  });

  return (
    <div>
      <ModelHeader model={model} />
      <ModelDescription description={model.description} />

      {/* Client Component는 경계를 명확히 */}
      <Suspense fallback={<PricingCardSkeleton />}>
        <PricingCard pricing={model.pricing} />
      </Suspense>

      {/* 인터랙티브 요소만 Client Component */}
      <TryModelButton modelId={model.id} />
    </div>
  );
}

// Client Component: 인터랙티브 버튼
// components/TryModelButton.tsx
'use client';

function TryModelButton({ modelId }: { modelId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleTry = async () => {
    setIsLoading(true);
    try {
      await api.post(`/models/${modelId}/try`);
      router.push(`/playground/${modelId}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleTry} loading={isLoading}>
      무료 체험하기
    </Button>
  );
}

// [패턴: Server Component가 Client Component를 감싸기]
// ✅ 좋은 예: Server에서 데이터 fetch → Client에 props로 전달
async function ModelPage({ params }) {
  const model = await fetchModel(params.slug);  // Server에서 fetch

  return (
    <InteractiveModelViewer
      initialData={model}  // Client Component에 초기 데이터 전달
    />
  );
}

// ❌ 나쁜 예: Client Component 안에서 Server 데이터 fetch
'use client';
function ModelPage({ params }) {
  const { data: model } = useQuery(...);  // 클라이언트에서 추가 요청 발생
  return <ModelViewer model={model} />;
}

// [성과]
// - 초기 JavaScript 번들 크기 감소
// - TTFB 개선 (서버에서 데이터 준비 후 전송)
// - SEO 최적화 (서버 렌더링된 HTML)
```

---

## 6. 준비 체크리스트

### devdive studio
- [ ] 멀티스텝 파이프라인 설계 (5단계, 순차 실행, chatId 연속성)
- [ ] 3계층 저장소 설계 (React State, localStorage, Redis)
- [ ] V0 완료 다중 확인 전략 (4단계 폴백)
- [ ] CORS 우회 프록시 구현

### devdive
- [ ] RSC 기반 MDX 렌더링 최적화 (next-mdx-remote/rsc)
- [ ] SSR/CSR/ISR 렌더링 전략 구분
- [ ] Compound Component 패턴 (Modal, Table)
- [ ] Polymorphic Component 패턴 (Button)
- [ ] pnpm 마이그레이션 (유령 의존성 해결)
- [ ] OpenAPI 기반 타입 자동 생성

### CI/CD 및 테스트
- [ ] Playwright MCP 기반 E2E 테스트
- [ ] Lighthouse CI 통합
- [ ] Core Web Vitals 메트릭 수집 (CloudWatch)
- [ ] @use-funnel/browser 멀티스텝 폼 관리

### semoAI
- [ ] AWS S3 Multipart Upload 구현
- [ ] Server Driven UI 아키텍처

### 다윈중개
- [ ] 실거래가 기반 가격 검증 시스템
- [ ] 중개보수 요율표 기반 수수료 계산기

### 최신 React 기술
- [ ] Concurrent Rendering (useTransition, useDeferredValue)
- [ ] React Server Components 구분 기준
- [ ] Suspense + Streaming SSR
- [ ] Automatic Batching
