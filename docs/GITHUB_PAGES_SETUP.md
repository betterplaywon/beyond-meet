# GitHub Pages 호스팅 가이드

Beyond Meet의 Privacy Policy와 Terms of Service를 GitHub Pages에 무료로 호스팅하는 가이드입니다.

---

## 📋 개요

앱 스토어 제출 시 **Privacy Policy URL**과 **Terms of Service URL**이 필수입니다.

GitHub Pages를 사용하면:
- ✅ **완전 무료** 호스팅
- ✅ **HTTPS 자동 적용** (보안)
- ✅ **간편한 업데이트** (Git push만으로)
- ✅ **안정적인 서비스** (99.9% uptime)

---

## 🚀 Step 1: GitHub Pages 활성화

### 1.1 새 브랜치 생성 (gh-pages)

```bash
cd /Users/kang/Desktop/beyond-meet

# gh-pages 브랜치 생성
git checkout --orphan gh-pages

# 기존 파일 모두 제거 (정책 문서만 남김)
git rm -rf .

# docs/ 폴더의 정책 문서만 복사
git checkout main -- docs/PRIVACY_POLICY.md
git checkout main -- docs/TERMS_OF_SERVICE.md
```

### 1.2 HTML 파일 생성

GitHub Pages는 마크다운을 자동으로 렌더링하지 않으므로, HTML로 변환해야 합니다.

**방법 1: 온라인 변환 도구 사용 (권장)**

1. https://markdowntohtml.com 접속
2. `docs/PRIVACY_POLICY.md` 내용 복사 & 붙여넣기
3. Convert 클릭
4. 생성된 HTML을 `privacy-policy.html`로 저장

**방법 2: Pandoc 사용 (Mac)**

```bash
# Pandoc 설치 (Homebrew)
brew install pandoc

# Markdown → HTML 변환
pandoc docs/PRIVACY_POLICY.md -s -o privacy-policy.html --metadata title="Privacy Policy - Beyond Meet"
pandoc docs/TERMS_OF_SERVICE.md -s -o terms-of-service.html --metadata title="Terms of Service - Beyond Meet"
```

### 1.3 HTML 파일 스타일링 (선택사항)

기본 HTML은 스타일이 없으므로, 간단한 CSS를 추가할 수 있습니다:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Beyond Meet</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #FF6B6B;
            border-bottom: 2px solid #FF6B6B;
            padding-bottom: 10px;
        }
        h2 {
            color: #4A5568;
            margin-top: 30px;
        }
        a {
            color: #FF6B6B;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <!-- Markdown 변환된 HTML 내용 -->
</body>
</html>
```

### 1.4 index.html 생성 (선택사항)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Beyond Meet - Legal Documents</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
        }
        h1 {
            color: #FF6B6B;
        }
        .links {
            margin-top: 30px;
        }
        .links a {
            display: block;
            padding: 15px;
            margin: 10px 0;
            background: #FF6B6B;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
        }
        .links a:hover {
            background: #E85A5A;
        }
    </style>
</head>
<body>
    <h1>Beyond Meet</h1>
    <p>Video Dating App - Legal Documents</p>
    <div class="links">
        <a href="privacy-policy.html">Privacy Policy</a>
        <a href="terms-of-service.html">Terms of Service</a>
    </div>
</body>
</html>
```

### 1.5 Git 커밋 & 푸시

```bash
# 파일 추가
git add privacy-policy.html terms-of-service.html index.html

# 커밋
git commit -m "Add Privacy Policy and Terms of Service for GitHub Pages"

# 푸시 (gh-pages 브랜치)
git push origin gh-pages
```

---

## 🌐 Step 2: GitHub Pages 설정

### 2.1 GitHub Repository 설정

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Pages** 클릭
4. **Source** 섹션:
   - Branch: `gh-pages` 선택
   - Folder: `/ (root)` 선택
5. **Save** 클릭

### 2.2 배포 확인

배포는 약 1-2분 소요됩니다.

배포 완료 후 다음 URL로 접속 가능:

```
https://<your-username>.github.io/<repository-name>/privacy-policy.html
https://<your-username>.github.io/<repository-name>/terms-of-service.html
```

예시:
```
https://johndoe.github.io/beyond-meet/privacy-policy.html
https://johndoe.github.io/beyond-meet/terms-of-service.html
```

---

## 📝 Step 3: 앱 스토어에 URL 등록

### iOS App Store Connect

1. **App Store Connect** 접속
2. **My Apps** → Beyond Meet 선택
3. **App Information** 섹션:
   - **Privacy Policy URL**: `https://<your-username>.github.io/beyond-meet/privacy-policy.html`
4. **App Review Information** 섹션:
   - **Terms of Service URL** (선택사항): `https://<your-username>.github.io/beyond-meet/terms-of-service.html`

### Google Play Console

1. **Google Play Console** 접속
2. **Beyond Meet** 앱 선택
3. **Store presence** → **App content**
4. **Privacy Policy** 섹션:
   - URL 입력: `https://<your-username>.github.io/beyond-meet/privacy-policy.html`
5. **Terms of Service** (앱 내에서 링크 제공)

---

## 🔄 Step 4: 정책 업데이트 방법

Privacy Policy나 Terms of Service를 수정해야 할 경우:

### 4.1 메인 브랜치에서 수정

```bash
# main 브랜치로 이동
git checkout main

# 문서 수정
# docs/PRIVACY_POLICY.md 또는 docs/TERMS_OF_SERVICE.md 편집

# 커밋
git add docs/PRIVACY_POLICY.md
git commit -m "Update privacy policy"
git push origin main
```

### 4.2 gh-pages 브랜치에 반영

```bash
# gh-pages 브랜치로 이동
git checkout gh-pages

# main 브랜치에서 수정된 파일 가져오기
git checkout main -- docs/PRIVACY_POLICY.md

# Markdown → HTML 변환 (Pandoc 사용)
pandoc docs/PRIVACY_POLICY.md -s -o privacy-policy.html --metadata title="Privacy Policy - Beyond Meet"

# 커밋 & 푸시
git add privacy-policy.html
git commit -m "Update privacy policy HTML"
git push origin gh-pages

# main 브랜치로 돌아오기
git checkout main
```

**참고**: 업데이트 후 1-2분 내에 GitHub Pages에 자동 반영됩니다.

---

## 🎨 Step 5: 커스텀 도메인 사용 (선택사항)

만약 `beyondmeet.com`과 같은 도메인이 있다면:

### 5.1 DNS 설정 (도메인 등록업체)

CNAME 레코드 추가:
```
Type: CNAME
Host: legal (또는 docs)
Value: <your-username>.github.io
```

### 5.2 GitHub Pages 설정

1. GitHub Repository → Settings → Pages
2. **Custom domain** 입력: `legal.beyondmeet.com`
3. **Enforce HTTPS** 체크

배포 후 URL:
```
https://legal.beyondmeet.com/privacy-policy.html
https://legal.beyondmeet.com/terms-of-service.html
```

---

## ✅ 체크리스트

### GitHub Pages 설정

- [ ] gh-pages 브랜치 생성
- [ ] HTML 파일 생성 (privacy-policy.html, terms-of-service.html)
- [ ] index.html 생성 (선택사항)
- [ ] GitHub Pages 활성화 (Settings → Pages)
- [ ] URL 접속 테스트

### 앱 스토어 등록

- [ ] iOS App Store Connect에 Privacy Policy URL 등록
- [ ] Google Play Console에 Privacy Policy URL 등록
- [ ] 앱 내 설정에 링크 추가 (Settings → Privacy Policy / Terms of Service)

---

## 🐛 트러블슈팅

### 문제 1: 404 Error - Page not found

**원인**: GitHub Pages가 아직 배포되지 않았거나, 파일명이 잘못됨

**해결**:
1. GitHub Repository → Actions 탭에서 배포 상태 확인
2. 파일명 확인: `privacy-policy.html` (하이픈, 소문자)
3. 1-2분 대기 후 재시도

### 문제 2: HTML이 아니라 Markdown이 보임

**원인**: `.md` 파일을 직접 커밋함

**해결**:
1. Markdown을 HTML로 변환 (Pandoc 또는 온라인 도구)
2. `.html` 파일만 gh-pages 브랜치에 커밋

### 문제 3: 스타일이 깨짐

**원인**: CSS 누락

**해결**:
1. `<style>` 태그를 `<head>` 안에 추가
2. 또는 외부 CSS 파일 사용 (`<link rel="stylesheet" href="style.css">`)

---

## 📚 참고 자료

- **GitHub Pages 공식 문서**: https://docs.github.com/en/pages
- **Markdown to HTML 변환 도구**: https://markdowntohtml.com
- **Pandoc 공식 문서**: https://pandoc.org/MANUAL.html
- **Apple Privacy Policy 가이드**: https://developer.apple.com/app-store/review/guidelines/#privacy
- **Google Play Privacy Policy 요구사항**: https://support.google.com/googleplay/android-developer/answer/9859455

---

## 💡 대안: 다른 무료 호스팅 서비스

GitHub Pages 외에도 다음 서비스를 사용할 수 있습니다:

| 서비스            | URL 예시                                | 장점                  | 단점              |
| ----------------- | --------------------------------------- | --------------------- | ----------------- |
| **GitHub Pages**  | `username.github.io/repo/privacy.html`  | 무료, HTTPS, 안정적   | HTML 필요         |
| **Netlify**       | `yourapp.netlify.app/privacy`           | Markdown 자동 변환    | 계정 필요         |
| **Vercel**        | `yourapp.vercel.app/privacy`            | Next.js 지원          | 계정 필요         |
| **Firebase**      | `yourapp.web.app/privacy`               | Google 통합           | Firebase 설정 필요 |
| **Google Sites**  | `sites.google.com/view/yourapp/privacy` | 드래그앤드롭 UI       | URL이 긺         |

**권장**: GitHub Pages (가장 간단하고 무료)

---

**작성일**: 2025-11-26
**버전**: 1.0.0
