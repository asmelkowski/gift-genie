import pytest
from gift_genie.infrastructure.security.passwords import BcryptPasswordHasher


@pytest.mark.anyio
async def test_bcrypt_password_hasher_hash_and_verify():
    hasher = BcryptPasswordHasher(rounds=12)

    password = "S3cure!Pass"
    hash1 = await hasher.hash(password)
    assert isinstance(hash1, str)
    assert hash1 != password

    ok = await hasher.verify(password, hash1)
    assert ok is True

    bad = await hasher.verify("wrong", hash1)
    assert bad is False


@pytest.mark.anyio
async def test_bcrypt_password_hasher_unique_salts():
    hasher = BcryptPasswordHasher(rounds=12)
    password = "S3cure!Pass"
    hash1 = await hasher.hash(password)
    hash2 = await hasher.hash(password)
    assert hash1 != hash2  # different salts
