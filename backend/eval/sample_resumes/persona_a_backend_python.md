# 김민준 — Python 백엔드 엔지니어 (3년)

## 기술 스택
- **언어**: Python 3.11, SQL
- **프레임워크**: FastAPI, SQLAlchemy 2.0 (async), Alembic
- **데이터베이스**: PostgreSQL 15, Redis 7
- **메시지큐**: Celery + RabbitMQ
- **인프라**: Docker, AWS EC2/RDS/ElastiCache
- **기타**: pytest, GitHub Actions, Pydantic v2

## 프로젝트 경험

### 1. 전자상거래 API 서버 성능 개선 (스타트업, 2023.03 ~ 2024.02)
대형 쇼핑몰 백엔드 API의 TPS를 500에서 2,000으로 끌어올린 프로젝트.

기존 시스템은 Django ORM의 동기 쿼리를 그대로 사용하고 있었고, 동시 요청 100건 이상에서 응답 지연이 심각했다. SQLAlchemy async 세션으로 마이그레이션하고, 단일 엔드포인트에서 N+1 쿼리 38개를 `selectinload`와 `joinedload`를 조합해 4개로 줄였다. 그 결과 p99 응답시간이 1,200ms에서 180ms로 감소했다.

또한 상품 목록 조회 API에 Redis 캐싱 전략을 도입했다. TTL 기반 캐시와 이벤트 기반 무효화(상품 수정 시 해당 키 삭제)를 병행해서, 캐시 히트율 87%를 달성하면서도 데이터 정합성 문제를 0건으로 유지했다.

기술적 트레이드오프: async 세션은 트랜잭션 관리가 복잡해지는 단점이 있다. 특히 중첩 트랜잭션에서 `AsyncSession.begin_nested()` 사용 시 rollback 범위를 명확히 지정하지 않으면 데이터 불일치가 발생한다. 이를 방지하기 위해 트랜잭션 유닛마다 컨텍스트 매니저를 명시적으로 적용하는 팀 컨벤션을 도입했다.

### 2. 비동기 결제 처리 파이프라인 (핀테크, 2022.09 ~ 2023.02)
PG사 API 호출 지연으로 인한 사용자 대기 문제를 Celery 비동기 큐로 해결.

결제 요청을 즉시 수락하고 Celery worker에서 PG 호출을 처리하는 패턴으로 전환했다. 작업 재시도 정책(`max_retries=3`, exponential backoff)을 설정하고, 실패 작업은 Dead Letter Queue로 라우팅해 별도 관리했다. 결제 완료 이벤트는 WebSocket으로 클라이언트에 실시간 통지했다.

이 구조에서 idempotency key를 PostgreSQL unique constraint로 구현해 중복 결제를 방지했다. 재시도 시에도 동일 idempotency key가 있으면 기존 결제 결과를 반환하는 방식이다.

### 3. 내부 분석 API 서버 구축 (B2B SaaS, 2022.03 ~ 2022.08)
FastAPI 기반 내부 데이터 분석 API. JWT 인증 + RBAC 권한 모델 설계.

`python-jose`로 RS256 알고리즘 JWT를 발급하고, `fastapi.Depends`를 활용해 의존성 주입 방식으로 인증 미들웨어를 구현했다. 역할(Role)은 `admin`, `analyst`, `viewer` 3단계로 나누고, 엔드포인트별 권한 체크를 데코레이터 패턴으로 추상화했다. 권한 변경 시 기존 토큰 무효화를 위해 Redis에 revoke 리스트를 관리했다.

### 4. 대용량 CSV 배치 처리 최적화
월 2,000만 건 트랜잭션 리포트를 생성하는 배치 작업의 실행 시간을 4시간에서 35분으로 단축.

병목은 Python 레벨 루프에서 레코드를 하나씩 INSERT하는 부분이었다. `COPY FROM STDIN`(psycopg3 binary copy)으로 교체해 bulk insert 성능을 약 7배 향상시켰다. 또한 집계 쿼리에서 윈도우 함수(`ROW_NUMBER OVER PARTITION BY`)를 사용해 애플리케이션 레벨 집계를 DB로 내려 메모리 사용량을 80% 감소시켰다.

## 기술 심화

**Connection Pool 관리**: `asyncpg` pool size를 서버 CPU 코어 수 × 4로 설정하고, 피크 타임에 pool exhaustion 발생 시 `pool_timeout` 예외를 별도 503으로 핸들링해 upstream에 명확한 신호를 전달.

**테스트 전략**: 단위 테스트는 `pytest-asyncio`로 async 함수를 커버하고, 통합 테스트는 Docker Compose로 실제 PostgreSQL + Redis를 띄워 실행. Mock DB 사용 시 실제 쿼리 최적화 효과를 검증할 수 없어 실 DB 통합 테스트를 우선한다는 팀 원칙을 가지고 있다.
