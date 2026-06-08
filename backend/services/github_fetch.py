import base64
import re

import requests

_GITHUB_URL_RE = re.compile(r"github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)")
_API_BASE = "https://api.github.com"


def extract_github_urls(text: str) -> list[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()
    results: list[tuple[str, str]] = []
    for owner, repo in _GITHUB_URL_RE.findall(text):
        repo = repo.rstrip("/")
        key = (owner, repo)
        if key not in seen:
            seen.add(key)
            results.append(key)
    return results


def fetch_repo_chunk(owner: str, repo: str, token: str = "") -> str | None:
    headers = {"Authorization": f"token {token}"} if token else {}
    try:
        info_resp = requests.get(f"{_API_BASE}/repos/{owner}/{repo}", headers=headers, timeout=10)
        if info_resp.status_code != 200:
            return None
        info = info_resp.json()
        description = info.get("description") or ""
        language = info.get("language") or ""

        readme_text = ""
        readme_resp = requests.get(f"{_API_BASE}/repos/{owner}/{repo}/readme", headers=headers, timeout=10)
        if readme_resp.status_code == 200:
            encoded = readme_resp.json().get("content", "")
            readme_text = base64.b64decode(encoded).decode("utf-8", errors="ignore")

        return f"{repo}\n{description}\n언어: {language}\n{readme_text}".strip()
    except Exception as e:
        raise RuntimeError(f"GitHub API 호출 실패 ({owner}/{repo}): {e}")
