from fastapi import Header


async def get_client_id(x_client_id: str = Header(..., alias="X-Client-Id")) -> str:
    return x_client_id
