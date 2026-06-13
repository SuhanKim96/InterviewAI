import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings

EVAL_COLLECTION = "eval_documents"
SAMPLE_DIR = Path(__file__).parent.parent / "eval" / "sample_resumes"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


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

    existing = store.get()
    if existing["ids"]:
        print(f"기존 eval_documents 컬렉션 초기화 (청크 {len(existing['ids'])}개 삭제)...")
        store.reset_collection()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    resume_files = sorted(SAMPLE_DIR.glob("*.md")) + sorted(SAMPLE_DIR.glob("*.txt"))
    if not resume_files:
        print(f"샘플 이력서를 찾을 수 없습니다: {SAMPLE_DIR}")
        return

    total_chunks = 0
    for path in resume_files:
        text = path.read_text(encoding="utf-8")
        chunks = splitter.split_text(text)
        ids = [f"{path.stem}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": path.name, "chunk_index": i} for i in range(len(chunks))]
        store.add_texts(chunks, metadatas=metadatas, ids=ids)
        print(f"  {path.name}: {len(chunks)}개 청크 (ID: {ids[0]} ~ {ids[-1]})")
        total_chunks += len(chunks)

    print(f"\n완료: 총 {total_chunks}개 청크 → 컬렉션 '{EVAL_COLLECTION}'")


if __name__ == "__main__":
    main()
