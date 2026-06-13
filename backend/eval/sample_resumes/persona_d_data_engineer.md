# 최유진 — 데이터 엔지니어 (5년)

## 기술 스택
- **언어**: Python, SQL, Scala
- **처리 엔진**: Apache Spark 3.4, Flink (기초)
- **오케스트레이션**: Apache Airflow 2.7, Prefect
- **변환**: dbt (Data Build Tool) 1.7
- **데이터 웨어하우스**: Snowflake, BigQuery
- **스트리밍**: Apache Kafka 3.5
- **인프라**: AWS EMR, Glue, S3, Terraform

## 프로젝트 경험

### 1. 실시간 이벤트 파이프라인 재설계 (핀테크, 2023.02 ~ 2024.04)
배치 기반 리포팅을 실시간으로 전환. 데이터 지연 500ms → 50ms, 일별 처리량 30억 건.

기존 배치는 1시간 단위 집계라 사기 탐지팀이 현재 이상 거래를 즉시 파악할 수 없었다. Kafka를 이벤트 버스로 도입하고 Flink로 5초 tumbling window 집계를 구현했다. Kafka 파티셔닝 전략으로 user_id 기반 파티션을 사용해 동일 사용자의 이벤트가 동일 파티션에 모이도록 했다. 이를 통해 사용자별 세션 집계 시 상태(stateful) 처리가 가능해졌다.

Exactly-once 처리 보장: Kafka transactional producer와 Flink checkpointing을 조합해 장애 시 중복 없는 재처리를 구현했다. 체크포인트 간격 10초로 설정해 장애 복구 시 최대 손실 데이터는 10초분.

### 2. 데이터 웨어하우스 현대화 (이커머스, 2021.09 ~ 2023.01)
Redshift + 수작업 SQL에서 Snowflake + dbt로 마이그레이션. 쿼리 비용 40% 절감.

dbt 도입으로 SQL 변환 로직의 버전 관리와 테스트가 가능해졌다. `dbt test`로 not_null, unique, referential integrity를 자동 검증하고, `dbt docs generate`로 데이터 리니지를 가시화했다. 기존에 담당자만 알던 지표 계산 로직이 코드로 명문화되어 온보딩 시간이 2주 → 3일로 단축됐다.

Snowflake의 클러스터 키를 `ORDER_DATE`와 `CUSTOMER_REGION`으로 설정해 월별 매출 집계 쿼리의 스캔 비용을 75% 줄였다. micro-partition pruning 원리를 이해하고 쿼리 패턴에 맞는 클러스터 키 설계가 핵심이었다.

증분 처리(incremental model): dbt의 `is_incremental()` 매크로로 전체 재처리 없이 신규 데이터만 처리. 일 2억 건 트랜잭션 테이블의 dbt run 시간을 4시간 → 12분으로 단축했다.

### 3. Airflow DAG 표준화 및 모니터링 (전사, 2020.07 ~ 2021.08)
80개 이상의 DAG를 운영하면서 실패 원인 추적과 SLA 관리 체계를 구축.

DAG 실패율이 월 15%에 달했는데, 주원인은 upstream 데이터 지연과 외부 API 타임아웃이었다. `on_failure_callback`으로 Slack 알림을 구현하고, 중요 DAG에 SLA miss callback을 추가했다. 공통 로직(S3 업로드, DB 연결)을 Custom Operator로 추상화해 코드 중복을 60% 줄였다.

TaskGroup으로 복잡한 DAG를 논리 단위로 묶어 가독성을 높이고, Dynamic Task Mapping으로 파티션별 병렬 처리를 구현했다.

### 4. 대규모 Spark ETL 최적화
월 5TB 로그 처리 Spark 잡의 실행 시간을 6시간 → 45분으로 단축.

Spark UI의 Stage 탭에서 Data Skew를 발견했다 — 특정 파티션이 전체 데이터의 35%를 처리하고 있었다. Salting 기법으로 skewed 키에 랜덤 접두사를 추가해 파티션을 고르게 분산시켰다. Broadcast Join으로 작은 dimension 테이블(100MB 이하)을 각 executor에 캐싱해 shuffle 비용을 제거했다.

또한 Parquet 포맷과 파티셔닝(`PARTITION BY year, month`)으로 저장해 후속 쿼리의 파일 스캔 범위를 90% 줄였다.

## 기술 심화

**데이터 품질 관리**: Great Expectations 라이브러리로 파이프라인에 데이터 품질 검사를 삽입. 스키마 드리프트, 값 범위 이상, null 비율 임계값 초과 시 DAG 실패 처리.

**파티셔닝 전략**: OLAP 쿼리 패턴 분석 후 범위 파티셔닝(날짜)과 해시 파티셔닝(user_id)을 조합. 큰 테이블에서 특정 날짜 범위 + 특정 사용자 세그먼트 조회가 잦은 경우 두 컬럼 복합 파티션이 단일 파티션 대비 쿼리 비용 50% 절감.
