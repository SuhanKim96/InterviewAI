from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from config import settings

CATEGORY_MAP: dict[str, list[str]] = {
    "technical":  ["technical", "example_technical"],
    "experience": ["experience", "example_experience"],
    "culture":    ["experience"],
}

_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=settings.openai_api_key,
)

_rubric_store = Chroma(
    collection_name="rubrics",
    embedding_function=_embeddings,
    persist_directory="./chroma_db",
)


def search_rubrics(query: str, category: str, k: int = 3, language: str = "ko") -> list[str]:
    cats = CATEGORY_MAP.get(category, ["experience"])
    per_cat = max(1, k // len(cats))
    seen: set[str] = set()
    results: list[str] = []
    for cat in cats:
        docs = _rubric_store.similarity_search(
            query, k=per_cat,
            filter={"$and": [{"category": {"$eq": cat}}, {"language": {"$eq": language}}]},
        )
        for doc in docs:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                results.append(doc.page_content)
    return results[:k]


def index_rubric(text: str, category: str, name: str, language: str = "ko") -> None:
    _rubric_store.add_texts([text], metadatas=[{"category": category, "name": name, "language": language}])
