# 한승우 — DevOps / SRE 엔지니어 (4년)

## 기술 스택
- **컨테이너/오케스트레이션**: Kubernetes 1.28 (EKS), Docker
- **IaC**: Terraform 1.6, Helm 3, ArgoCD
- **CI/CD**: GitHub Actions, Jenkins
- **모니터링**: Prometheus, Grafana, Loki, PagerDuty
- **클라우드**: AWS (EKS, RDS, ElastiCache, ALB, Route53)
- **보안**: Vault (HashiCorp), AWS IAM, OPA (Open Policy Agent)

## 프로젝트 경험

### 1. 멀티 테넌트 EKS 클러스터 운영 (SaaS B2B, 2023.01 ~ 2024.05)
30개 테넌트 서비스를 하나의 EKS 클러스터에서 운영. 클러스터 운영비 35% 절감.

테넌트 격리는 Kubernetes Namespace + NetworkPolicy + ResourceQuota 조합으로 구현했다. 테넌트 간 네트워크 차단을 위해 `default-deny-all` NetworkPolicy를 기본 적용하고, 서비스 간 통신이 필요한 경우만 명시적 허용 정책을 추가했다.

Karpenter로 노드 자동 프로비저닝을 설정해 주간 피크(오전 10시~오후 6시)에는 C5.2xlarge, 야간에는 t3.medium으로 자동 전환. Spot Instance 비율 70%로 설정해 컴퓨팅 비용을 45% 줄이면서 Spot Interruption Handler로 예상치 못한 종료에 대응했다.

HPA(Horizontal Pod Autoscaler)는 CPU와 커스텀 메트릭(RPS)을 동시에 사용하도록 설정했다. 단순 CPU 기반 HPA는 I/O 집약 서비스에서 scaling이 늦게 반응하는 문제가 있어, Prometheus Adapter로 RPS 메트릭을 K8s 메트릭 서버에 노출시켜 더 민감하게 반응하도록 했다.

### 2. 무중단 배포 파이프라인 구축 (이커머스, 2022.02 ~ 2022.12)
Blue-Green 배포에서 Argo Rollouts의 Canary 배포로 전환. 배포 관련 장애 100% → 0%.

기존 Blue-Green은 전체 트래픽이 한 번에 전환돼 문제 발견 시 영향이 컸다. Argo Rollouts로 5% → 25% → 100% 단계적 트래픽 전환으로 변경했다. 각 단계에서 에러율 > 1% 또는 p99 응답시간 > 500ms 시 자동 rollback 트리거. Analysis Template으로 Prometheus 쿼리를 기반으로 배포 성공 기준을 코드로 정의했다.

이 방식의 트레이드오프: Canary는 두 버전이 동시에 서비스되므로 DB 스키마 변경 시 하위 호환성이 필수다. `addColumn`은 문제없지만 `dropColumn`은 구 버전 서비스가 존재하는 동안 실행 불가. Expand-Contract 패턴으로 배포 전 column 추가 → 배포 후 구 column 제거 순서를 팀 컨벤션으로 정립했다.

### 3. 인프라 코드화 (IaC) 전환 (스타트업, 2021.03 ~ 2022.01)
수동 AWS 콘솔 관리에서 Terraform + ArgoCD GitOps로 완전 전환. 인프라 변경 리드타임 3일 → 2시간.

Terraform으로 VPC, EKS, RDS, ElastiCache를 코드화하고, 환경(dev/staging/prod)별 workspace를 분리했다. 모듈화로 VPC, EKS, DB 각각을 재사용 가능한 모듈로 작성해 새 환경 프로비저닝 시간을 4시간 → 20분으로 단축했다.

`terraform plan`을 GitHub Actions에서 PR 단계에 실행해 변경 사항을 peer review 대상으로 포함시켰다. Atlantis로 terraform apply를 PR comment(`atlantis apply`)로 트리거해 적용 로그를 PR에 기록했다.

### 4. SRE 온콜 체계 및 SLO 관리
SLO(Service Level Objective) 기반 온콜 운영. MTTD(평균 탐지 시간) 45분 → 3분.

서비스별 SLO(가용성 99.9%, p99 응답시간 < 200ms)를 Prometheus + Grafana로 시각화하고, Error Budget 소진 속도가 빠를 때 PagerDuty 알림이 발생하도록 설정했다. Runbook을 Notion에 작성하고 알림 메시지에 직접 링크해 온콜 엔지니어가 즉시 대응 절차를 확인할 수 있게 했다.

포스트모텀 문화 정착: 장애마다 5 Whys를 이용한 근본 원인 분석 문서를 작성하고, 재발 방지 액션 아이템에 담당자와 완료 기한을 지정했다. 6개월간 동일 원인 장애 재발 0건.

## 기술 심화

**Secret 관리**: HashiCorp Vault의 Dynamic Secrets로 DB 자격증명을 단기 TTL(1시간)로 발급. 정적 비밀번호 대비 유출 시 피해 범위를 최소화했다. K8s External Secrets Operator로 Vault 시크릿을 K8s Secret에 자동 동기화.

**eBPF 기반 네트워크 관찰**: Cilium 도입으로 기존 iptables 기반 NetworkPolicy 대비 네트워크 정책 처리 지연 60% 감소. Hubble UI로 서비스 간 트래픽 흐름을 실시간 가시화해 장애 원인 파악 시간을 단축했다.
