# 정다은 — 풀스택 엔지니어 (3년)

## 기술 스택
- **백엔드**: Node.js (Express, NestJS), GraphQL (Apollo Server)
- **프론트엔드**: React 18, TypeScript, Tailwind CSS
- **데이터베이스**: MongoDB (Mongoose), PostgreSQL, Redis
- **실시간**: WebSocket (Socket.io), Server-Sent Events
- **인프라**: AWS (EC2, S3, CloudFront, Lambda), Vercel
- **기타**: Jest, Supertest, Docker

## 프로젝트 경험

### 1. SaaS 실시간 협업 툴 개발 (스타트업, 2022.11 ~ 2024.03)
Notion 유사 협업 문서 도구. 동시 편집, 실시간 커서 공유, 댓글 기능. MAU 5,000명.

실시간 동시 편집의 핵심 문제는 충돌 해결(Conflict Resolution)이었다. Operational Transformation(OT) 대신 CRDT(Conflict-free Replicated Data Type) 라이브러리(Yjs)를 선택했다. OT는 서버 중앙 조정이 필요해 서버 확장 시 복잡도가 급증하는 반면, CRDT는 각 클라이언트가 로컬에서 병합 가능해 서버 부하가 낮았다.

WebSocket 연결 관리: Socket.io의 Room 기능으로 문서별 채널을 분리하고, 연결 수가 많아질 때 Redis Adapter로 여러 서버 인스턴스 간 메시지를 pub/sub으로 전달했다. 피크 타임에 동시 WebSocket 연결 1,200개를 단일 서버에서 처리할 때 메모리 사용량이 2GB에 달해, sticky session과 로드밸런서 조합으로 3대로 수평 확장했다.

### 2. GraphQL API 설계 및 N+1 문제 해결 (커머스, 2022.02 ~ 2022.10)
REST API를 GraphQL로 전환. 클라이언트 요청 수 60% 감소, 과대/과소 페칭 해소.

GraphQL N+1 문제: 게시물 목록 조회 시 작성자 정보를 가져오기 위해 게시물 수만큼 별도 쿼리가 발생했다. DataLoader를 구현해 배치 처리를 적용했다. DataLoader는 동일 이벤트 루프 틱 내의 요청을 모아 단일 배치 쿼리로 처리한다. 100개 게시물 조회 시 101번 쿼리 → 2번 쿼리로 감소해 응답시간이 1,400ms → 120ms로 개선됐다.

스키마 설계에서 Mutation의 응답 타입에 변경된 객체 전체를 반환하도록 컨벤션을 잡아, 클라이언트가 캐시를 수동으로 업데이트하지 않아도 Apollo Client의 자동 캐시 갱신이 동작하게 했다.

### 3. 소셜 로그인 및 JWT 인증 시스템 (B2C 앱, 2021.08 ~ 2022.01)
Google, Kakao OAuth 2.0 통합 + JWT 기반 세션 관리. 가입 전환율 35% 향상.

JWT Access Token(만료 15분) + Refresh Token(만료 7일) 조합으로 설계했다. Refresh Token은 HttpOnly Secure Cookie로 저장해 XSS 공격으로부터 보호하고, Access Token은 메모리에만 보관해 localStorage의 XSS 취약점을 피했다.

Token Rotation 전략: Refresh Token 사용 시 새 Refresh Token을 발급하고 이전 토큰을 Redis에서 무효화(Reuse Detection). 탈취된 Refresh Token으로 재사용 시도를 감지하면 해당 계정의 모든 세션을 강제 로그아웃하는 보안 정책을 적용했다.

### 4. 이미지 업로드 최적화 및 CDN 구성
S3 + CloudFront 구성으로 이미지 로딩 속도 3.2초 → 0.4초, S3 대역폭 비용 70% 절감.

클라이언트에서 직접 S3에 업로드하는 Pre-signed URL 방식으로 서버 대역폭을 우회했다. 업로드 완료 후 S3 이벤트로 Lambda를 트리거해 이미지 리사이징(썸네일 생성)과 WebP 변환을 서버리스로 처리했다.

CloudFront에 Cache-Control 헤더를 설정해 정적 자산의 캐시 TTL을 365일로 설정하고, 콘텐츠 업데이트 시 CloudFront Invalidation 대신 파일명에 해시를 포함시켜(content hashing) 캐시 무효화 비용을 제거했다.

## 기술 심화

**MongoDB 스키마 설계**: NoSQL에서 데이터 모델링 핵심은 쿼리 패턴 선행 설계. Embedding(한 도큐먼트에 중첩)과 Referencing(별도 컬렉션 참조) 트레이드오프를 고려해, 함께 조회되는 데이터는 Embed하고 독립적으로 업데이트되는 데이터는 Reference로 분리했다. 댓글 수가 많은 경우 Bucket Pattern으로 댓글을 배열에 담되 배열 크기를 50개로 제한하고 다음 버킷으로 체이닝했다.

**NestJS 모듈 설계**: Dependency Injection 컨테이너를 활용해 서비스 간 의존성을 명시적으로 관리. 순환 의존성 발생 시 `forwardRef()`로 해결했으나, 이는 설계 문제의 신호로 인식하고 공통 서비스를 별도 SharedModule로 분리하는 리팩토링을 진행한 경험이 있다.
