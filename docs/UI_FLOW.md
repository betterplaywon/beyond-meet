# UI/UX 디자인 시스템

## 컬러 팔레트

```
Primary:      #FF6B6B (코랄 레드) - 주요 버튼
Secondary:    #4ECDC4 (민트 그린) - 보조 버튼
Accent:       #FFE66D (옐로우)    - 알림, 강조
Background:   #F7F7F7 (라이트 그레이)
Surface:      #FFFFFF (화이트)
Text Primary: #2D3436 (다크 그레이)
Text Secondary: #636E72 (미드 그레이)
Success:      #00B894 (그린)
Error:        #FF7675 (레드)
Online:       #00D9A3 (밝은 그린)
Offline:      #B2BEC3 (회색)
```

## 타이포그래피

```
Font: SF Pro (iOS) / Roboto (Android)

Heading 1: 32px Bold
Heading 2: 24px Bold
Heading 3: 20px SemiBold
Body 1:    16px Regular
Body 2:    14px Regular
Caption:   12px Regular
Button:    16px SemiBold
```

## 간격 및 반경

```
Spacing: xs(4) sm(8) md(16) lg(24) xl(32) xxl(48)
Radius:  Small(4) Medium(8) Large(16) Circle(50%)
```

---

## 화면 플로우

```
Splash → Welcome → Email Verification → Register/Login → Onboarding (권한) → Main Tabs
                         │                                                       │
                  [이메일 인증]                ┌────────────────────────┬────────┼────────────┐
                                             ▼                        ▼        ▼            ▼
                                           Home                    Friends   Profile      Admin*
                                             │                        │         │            │
                                             ▼                        ▼         ▼      ┌─────┼─────┐
                                       [랜덤 매칭]              [친구 통화 요청] [설정]  초대코드 모더레이션 신고
                                             │                        │
                                             └──────────┬─────────────┘
                                                        ▼
                                                 Incoming Call
                                                        │
                                                        ▼
                                                 Video Call (5분)
                                                        │
                                                        ▼
                                                  Call End
                                                 [친구 추가]

* Admin 탭은 ADMIN role 전용
```

---

## 주요 화면

| 화면 | 목적 |
|------|------|
| Email Verification | 회원가입 전 이메일 인증 |
| Home | 랜덤 매칭 시작 |
| Friends | 친구 목록, 온라인 상태, 직접 통화 |
| Profile | 프로필 조회/편집, 통화 기록, 설정 |
| Matching | 매칭 대기 중 로딩 |
| Incoming Call | 통화 수락/거절 |
| Video Call | 영상 통화 + 컨트롤 (음소거, 비디오, 카메라 전환, 배경) |
| Call End | 통화 종료, 친구 추가 |
| Admin | 관리자 대시보드, 통계 |
| Moderation Logs | AI 콘텐츠 분석 로그 |
| Reports | 사용자 신고 관리 |

---

## 통화 화면 레이아웃

```
┌─────────────────────────────┐
│ ⏱ 03:24 / 05:00             │ ← 타이머
│                             │
│      [상대방 영상]           │ ← 전체 화면
│                             │
│  ┌──────────┐               │
│  │ 내 영상   │               │ ← PIP (우측 상단)
│  └──────────┘               │
│                             │
│  [🎤] [📹] [🔄] [🌫] [❌]   │ ← 컨트롤
└─────────────────────────────┘

🎤 마이크    📹 비디오    🔄 카메라 전환
🌫 배경 블러  ❌ 종료
```

---

## 인터랙션

- **버튼 탭**: scale 0.95, 200ms
- **화면 전환**: 슬라이드 300ms
- **모달**: Slide up, 반투명 배경
- **토스트**: 상단 3초 자동 닫힘
- **햅틱**: 중요 액션 Heavy, 일반 Light

---

## 다국어 지원 (i18n)

### 지원 언어

| 언어 | 코드 | 상태 |
|------|------|------|
| 한국어 | ko | 기본 |
| 영어 | en | 지원 |
| 일본어 | ja | 지원 |

### 구현

- **라이브러리**: i18next, react-i18next
- **상태 관리**: Zustand (`languageStore.ts`)
- **번역 파일**: `mobile/src/i18n/locales/`

### 언어 변경

- 설정 화면에서 언어 선택 가능
- 앱 재시작 없이 즉시 적용
- 선택한 언어는 로컬 저장소에 저장

### 사용 예시

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <Text>{t('common.welcome')}</Text>;
};
```
