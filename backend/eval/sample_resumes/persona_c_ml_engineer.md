# 박준호 — ML 엔지니어 (3년)

## 기술 스택
- **언어**: Python 3.11, SQL
- **ML 프레임워크**: PyTorch 2.1, Hugging Face Transformers, scikit-learn
- **MLOps**: MLflow, DVC, BentoML
- **데이터**: Pandas, Polars, NumPy
- **인프라**: AWS SageMaker, Docker, FastAPI (serving)
- **실험 관리**: Weights & Biases (W&B), MLflow Tracking

## 프로젝트 경험

### 1. 상품 추천 모델 고도화 (이커머스, 2023.04 ~ 2024.03)
협업 필터링 기반 추천을 딥러닝 두 탑(Two-Tower) 모델로 교체. A/B 테스트에서 CTR 15.3% 향상.

기존 MF(Matrix Factorization) 모델은 신규 사용자(cold-start)와 long-tail 상품에 취약했다. 사용자 행동 시퀀스(클릭, 구매, 체류시간)를 임베딩해 학습하는 Two-Tower 구조로 전환했다. User tower는 최근 30일 행동 시퀀스를 LSTM으로 인코딩하고, Item tower는 상품 속성(카테고리, 가격대, 텍스트 설명)을 멀티-핫 인코딩과 BERT 임베딩으로 처리했다.

학습 데이터 불균형이 주요 문제였다. 인기 상품에 편향된 양성 샘플을 in-batch negative sampling으로 보정했고, popularity-based downsampling으로 상위 1% 상품이 학습에 미치는 영향을 제한했다. 이 두 기법을 조합해 long-tail 상품 추천 비율이 23% 증가했다.

모델 서빙은 BentoML로 패키징해 SageMaker 엔드포인트에 배포. 응답 p99는 45ms.

### 2. 상품 리뷰 감성 분류기 (NLP, 2022.10 ~ 2023.03)
`klue/bert-base` fine-tuning으로 5분류 감성 분석(매우 부정~매우 긍정). F1-macro 0.89 달성.

레이블 불균형이 문제였다 — '보통(3점)' 리뷰가 전체의 42%를 차지. 클래스 가중치를 손실함수에 반영(`CrossEntropyLoss(weight=...)`)하고, focal loss를 비교 실험했다. focal loss가 소수 클래스에서 5% 더 높은 F1을 보였으나 학습 안정성이 낮아 클래스 가중치 방식을 채택했다.

학습률 스케줄러로 Linear Warmup + Cosine Decay를 적용하고, 배치 크기를 8→32로 늘리면서 그라디언트 누적(gradient accumulation, step=4)으로 메모리 제약을 해결했다.

DVC로 데이터셋 버전을 관리하고 W&B로 실험 결과를 추적해 재현 가능성을 확보했다.

### 3. MLOps 파이프라인 구축 (인하우스, 2022.03 ~ 2022.09)
모델 학습~배포 파이프라인 자동화. 수동 배포 4시간 → 자동화 30분.

MLflow Projects로 학습 코드를 패키징하고, GitHub Actions에서 데이터 변경 감지 시 자동 재학습 트리거. 모델 레지스트리에서 Staging 승인 후 Production 프로모션 워크플로우를 구현했다.

모델 드리프트 감지를 위해 프로덕션 예측 분포를 학습 데이터 분포와 PSI(Population Stability Index)로 비교하는 모니터링 대시보드를 구축했다. PSI > 0.2 시 슬랙 알림 발송.

### 4. 이미지 기반 상품 카테고리 분류
ResNet-50 fine-tuning으로 120개 카테고리 분류. Top-3 accuracy 97.2%.

Transfer learning 시 전체 레이어 고정 후 마지막 FC 레이어만 학습(feature extraction) → 상위 레이어를 점진적으로 unfreeze하는 방식(fine-tuning)으로 전환했다. 단계적 fine-tuning이 직접 전체 학습 대비 validation loss 기준 12% 더 낮았다.

데이터 증강: `torchvision.transforms`로 랜덤 크롭, 수평 뒤집기, 색상 지터를 적용했다. 증강 강도가 너무 강하면 오히려 성능이 하락해 ablation study로 최적 설정을 탐색했다.

## 기술 심화

**Feature Engineering**: 사용자 행동 데이터에서 세션 기반 피처(평균 체류시간, 클릭 엔트로피)와 상품 피처(30일 판매량 추이, 재고 변동률)를 조합해 추천 다양성을 높인 경험. 피처 중요도 분석(SHAP)으로 불필요한 피처 20개 제거 후 학습 속도 15% 개선.

**모델 경량화**: 프로덕션 배포 시 INT8 양자화(post-training quantization)로 모델 사이즈 75% 감소, 추론 지연 30% 단축. 정확도 손실은 F1 기준 0.3% 이내.
