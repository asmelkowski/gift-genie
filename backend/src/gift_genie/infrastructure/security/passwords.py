from __future__ import annotations

import anyio
import bcrypt


class BcryptPasswordHasher:
    """Password hasher using bcrypt with sane defaults.

    CPU-bound hashing runs in a worker thread to avoid blocking the event loop.
    """

    def __init__(self, rounds: int = 12):
        self._rounds = rounds

    async def hash(self, password: str) -> str:
        if not isinstance(password, str) or password == "":
            raise ValueError("Password must be a non-empty string")
        pw_bytes = password.encode("utf-8")
        salt = await anyio.to_thread.run_sync(bcrypt.gensalt, self._rounds)
        hashed = await anyio.to_thread.run_sync(bcrypt.hashpw, pw_bytes, salt)
        return hashed.decode("utf-8")

    async def verify(self, password: str, password_hash: str) -> bool:
        if not password_hash:
            return False
        try:
            return await anyio.to_thread.run_sync(
                bcrypt.checkpw, password.encode("utf-8"), password_hash.encode("utf-8")
            )
        except Exception:
            return False
