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


def index_documents(text: str, source: str, name: str = "", client_id: str = "") -> int:
    if not text.strip():
        return 0
    chunks = _splitter.split_text(text)
    metadatas = [{"source": source, "name": name, "client_id": client_id}] * len(chunks)
    _vectorstore.add_texts(chunks, metadatas=metadatas)
    return len(chunks)


def search(query: str, k: int = 5, client_id: str | None = None) -> list[str]:
    kwargs: dict = {"filter": {"client_id": client_id}} if client_id else {}
    docs = _vectorstore.similarity_search(query, k=k, **kwargs)
    return [doc.page_content for doc in docs]


def list_sources(client_id: str | None = None) -> list[dict]:
    kwargs: dict = {"where": {"client_id": client_id}} if client_id else {}
    result = _vectorstore.get(include=["metadatas"], **kwargs)
    seen: set[tuple] = set()
    sources: list[dict] = []
    for meta in result["metadatas"]:
        key = (meta.get("source", ""), meta.get("name", ""))
        if key not in seen:
            seen.add(key)
            sources.append({"source": key[0], "name": key[1]})
    return sources


def total_chunks(client_id: str | None = None) -> int:
    kwargs: dict = {"where": {"client_id": client_id}} if client_id else {}
    return len(_vectorstore.get(**kwargs)["ids"])


def clear_documents(client_id: str | None = None) -> None:
    if client_id:
        _vectorstore.delete(where={"client_id": client_id})
    else:
        _vectorstore.reset_collection()


_eval_vectorstore: Chroma | None = None


def _get_eval_store() -> Chroma:
    global _eval_vectorstore
    if _eval_vectorstore is None:
        _eval_vectorstore = Chroma(
            collection_name="eval_documents",
            embedding_function=_embeddings,
            persist_directory="./chroma_db",
        )
    return _eval_vectorstore


def search_eval(query: str, k: int = 5) -> list[tuple[str, str]]:
    """eval_documents 컬렉션에서 검색. (chunk_id, text) 순위 순 반환."""
    docs = _get_eval_store().similarity_search(query, k=k)
    results = []
    for doc in docs:
        meta = doc.metadata
        stem = meta.get("source", "").rsplit(".", 1)[0]
        chunk_id = f"{stem}_chunk_{meta.get('chunk_index', 0)}"
        results.append((chunk_id, doc.page_content))
    return results


_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder  # lazy — 앱 기동 시 torch 로딩 방지
        _reranker = CrossEncoder("BAAI/bge-reranker-base")
    return _reranker


def search_eval_reranked(
    query: str, k: int = 5, k_initial: int = 20
) -> list[tuple[str, str]]:
    """vector search → cross-encoder reranking.
    기존 search_eval()은 건드리지 않음 (baseline 비교용으로 유지).
    """
    candidates = search_eval(query, k=k_initial)
    if not candidates:
        return []
    pairs = [(query, text) for _, text in candidates]
    scores = _get_reranker().predict(pairs, show_progress_bar=False)
    ranked = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
    return [cand for _, cand in ranked[:k]]
