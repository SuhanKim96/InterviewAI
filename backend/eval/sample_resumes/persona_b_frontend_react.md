# 이서연 — 프론트엔드 엔지니어 (4년)

## 기술 스택
- **언어**: TypeScript 5, JavaScript ES2022
- **프레임워크**: React 18, Next.js 14 (App Router)
- **상태관리**: Zustand, TanStack Query (React Query)
- **스타일링**: Tailwind CSS, CSS Modules
- **테스트**: Vitest, React Testing Library, Playwright
- **빌드**: Vite, Webpack 5 (커스텀 설정 경험)
- **기타**: Storybook, Sentry, Lighthouse CI

## 프로젝트 경험

### 1. 실시간 분석 대시보드 리빌드 (SaaS B2B, 2023.06 ~ 2024.04)
기존 jQuery 기반 대시보드를 React 18 + TypeScript로 완전히 재작성. 번들 사이즈 41% 감소, Largest Contentful Paint(LCP) 4.2초 → 1.1초 달성.

초기 번들 분석(Webpack Bundle Analyzer)에서 차트 라이브러리(~800KB)와 날짜 라이브러리(~400KB)가 전체 번들의 60%를 차지함을 발견했다. `React.lazy()`와 `Suspense`를 이용한 코드 스플리팅으로 초기 로드에 필요한 청크만 내려받도록 변경했다. 또한 `date-fns`에서 `Temporal API` polyfill로 교체해 날짜 처리 라이브러리 의존성을 제거했다.

차트 렌더링 최적화: 20개 차트가 동시에 리렌더링되는 문제를 `useMemo`와 `React.memo`로 해결했다. 단순 메모이제이션보다 참조 동일성(referential equality)을 유지하는 데이터 정규화가 더 효과적이었다. Zustand selector를 사용해 필요한 슬라이스만 구독하도록 설계하여 불필요한 리렌더링을 85% 줄였다.

### 2. Next.js App Router 마이그레이션 (커머스, 2022.11 ~ 2023.05)
Pages Router에서 App Router로 마이그레이션하며 SSR/SSG/ISR 혼합 전략 수립.

상품 목록 페이지는 `generateStaticParams()`로 상위 카테고리 페이지를 빌드 타임에 생성(SSG)하고, 개별 상품 상세 페이지는 `revalidate = 60`으로 ISR 적용해 최신성과 성능 균형을 맞췄다. 사용자별 개인화 콘텐츠(장바구니, 추천 상품)는 클라이언트 컴포넌트로 분리해 서버/클라이언트 경계를 명확히 했다.

Server Actions로 폼 제출 로직을 서버로 이전해 API Route를 30% 줄였다. 단, Server Action은 직렬화 가능한 데이터만 반환할 수 있어 복잡한 에러 객체 처리 시 주의가 필요하다는 점을 팀에 문서화했다.

### 3. 디자인 시스템 구축 (인하우스, 2021.08 ~ 2022.10)
Storybook 기반 컴포넌트 라이브러리 구축. 30개 컴포넌트, 디자이너-개발자 협업 워크플로우 정립.

접근성(a11y)을 핵심 요구사항으로 설정했다. `@storybook/addon-a11y`로 각 컴포넌트의 WCAG 2.1 AA 준수 여부를 자동 검사하고, Keyboard navigation과 ARIA 속성을 모든 인터랙티브 컴포넌트에 적용했다. 스크린리더 테스트(NVDA)를 통해 폼 에러 메시지의 `role="alert"` 누락 버그를 발견해 수정한 경험이 있다.

### 4. 성능 모니터링 체계 구축
Lighthouse CI를 GitHub Actions에 통합해 PR마다 Core Web Vitals 회귀 자동 감지.

임계값 설정: LCP < 2.5초, FID < 100ms, CLS < 0.1. 임계값 초과 시 PR merge 블록. 초기에 `useEffect` 내 DOM 조작이 CLS를 0.35까지 올린 사례를 발견하고 수정했다.

TanStack Query의 `staleTime`과 `gcTime` 튜닝으로 불필요한 네트워크 요청을 45% 줄이고, 데이터 freshness도 보장하는 캐싱 전략을 수립했다.

## 기술 심화

**React 18 Concurrent Features**: `useTransition`으로 검색 입력 시 UI 블로킹 없이 결과 업데이트. `startTransition`으로 낮은 우선순위 업데이트를 표시해 타이핑 반응성을 유지.

**TypeScript 엄격 모드 운용**: `strict: true`, `noUncheckedIndexedAccess` 활성화. 제네릭 기반 API 응답 타입 자동 추론으로 런타임 타입 오류를 빌드 단계에서 70% 차단한 경험이 있다.
