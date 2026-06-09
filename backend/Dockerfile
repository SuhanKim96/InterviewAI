FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 시작 시 루브릭 시드(최초 1회) 후 서버 실행
CMD ["sh", "-c", "python scripts/seed_rubrics.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
