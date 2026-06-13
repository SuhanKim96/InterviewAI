import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from config import settings

EVAL_COLLECTION = "eval_documents"
OUTPUT_PATH = Path(__file__).parent.parent / "eval" / "retrieval_eval.json"

_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 기술 면접관입니다. 아래 이력서 청크를 읽고, "
     "이 청크가 검색되어야 정확히 답할 수 있는 면접 질문 1개를 생성하세요.\n\n"
     "규칙:\n"
     "- 청크에 나온 단어나 문장을 그대로 쓰지 마세요. 개념과 능력을 묻는 방식으로 질문하세요.\n"
     "- 지원자에게 직접 묻는 형태로 작성하세요 (예: '~에 대해 설명해주세요', '~한 경험을 말씀해주세요').\n"
     "- 질문 1개만 반환하세요. 다른 설명이나 텍스트 없이."),
    ("user", "이력서 청크:\n{chunk}"),
])


def main() -> None:
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=settings.openai_api_key,
    )
    store = Chroma(
        collection_name=EVAL_COLLECTION,
        embedding_function=embeddings,
        persist_directory="./chroma_db",
    )

    data = store.get(include=["documents", "metadatas"])
    ids: list[str] = data["ids"]
    documents: list[str] = data["documents"]
    metadatas: list[dict] = data["metadatas"]

    if not ids:
        print("eval_documents 컬렉션이 비어 있습니다. build_eval_index.py를 먼저 실행하세요.")
        return

    print(f"총 {len(ids)}개 청크 발견. 질문 생성 시작...\n")

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        temperature=0.3,
    )
    chain = _PROMPT | llm

    eval_set: list[dict] = []
    for chunk_id, text, meta in zip(ids, documents, metadatas):
        response = chain.invoke({"chunk": text})
        question = response.content.strip()
        record = {
            "question": question,
            "ground_truth_chunk_id": chunk_id,
            "ground_truth_text": text,
            "source": meta.get("source", ""),
        }
        eval_set.append(record)
        print(f"  [{meta.get('source', '?')}] {question[:70]}...")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(eval_set, f, ensure_ascii=False, indent=2)

    print(f"\n완료: {len(eval_set)}개 질문 → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
