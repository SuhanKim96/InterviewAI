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
