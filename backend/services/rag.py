from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings

_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=settings.openai_api_key,
)

_vectorstore = Chroma(
    collection_name="documents",
    embedding_function=_embeddings,
    persist_directory="./chroma_db",
)

_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)


def index_documents(text: str, source: str, name: str = "") -> int:
    if not text.strip():
        return 0
    chunks = _splitter.split_text(text)
    metadatas = [{"source": source, "name": name}] * len(chunks)
    _vectorstore.add_texts(chunks, metadatas=metadatas)
    return len(chunks)


def search(query: str, k: int = 5) -> list[str]:
    docs = _vectorstore.similarity_search(query, k=k)
    return [doc.page_content for doc in docs]


def list_sources() -> list[dict]:
    result = _vectorstore.get(include=["metadatas"])
    seen: set[tuple] = set()
    sources: list[dict] = []
    for meta in result["metadatas"]:
        key = (meta.get("source", ""), meta.get("name", ""))
        if key not in seen:
            seen.add(key)
            sources.append({"source": key[0], "name": key[1]})
    return sources


def total_chunks() -> int:
    return len(_vectorstore.get()["ids"])


def clear_documents() -> None:
    _vectorstore.reset_collection()
