import os
from unittest import mock
from gift_genie.infrastructure.config.settings import Settings


def test_database_url_adds_scheme_when_missing():
    """Test that postgresql+asyncpg:// scheme is added when DATABASE_URL has no scheme.

    Terraform provides credentials in format: user:password@host:port/db?params
    The validator should add the postgresql+asyncpg:// scheme.
    """
    settings = Settings(
        DATABASE_URL="user:password@host:5432/db?sslmode=require",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url


def test_database_url_preserves_scheme_when_present():
    """Test that DATABASE_URL is unchanged when it already has a scheme.

    If DATABASE_URL is already a full URL with postgresql+asyncpg://, leave it unchanged.
    """
    url = "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"
    settings = Settings(
        DATABASE_URL=url,
        SECRET_KEY="test",
    )

    assert settings.DATABASE_URL == url


def test_database_url_preserves_postgres_scheme():
    """Test that postgres:// scheme is left unchanged (no replacement needed).

    The validator only adds the scheme if missing - it doesn't replace postgres://
    """
    url = "postgres://user:pass@host:5432/db"
    settings = Settings(
        DATABASE_URL=url,
        SECRET_KEY="test",
    )

    # The validator leaves postgres:// URLs unchanged
    assert settings.DATABASE_URL == url


def test_database_url_preserves_postgresql_scheme():
    """Test that postgresql:// scheme is left unchanged.

    The validator leaves postgresql:// URLs unchanged.
    """
    url = "postgresql://user:pass@host:5432/db"
    settings = Settings(
        DATABASE_URL=url,
        SECRET_KEY="test",
    )

    assert settings.DATABASE_URL == url


def test_database_url_with_special_chars_in_password():
    """Test that special characters in password are handled correctly.

    When PASSWORD contains special chars like @, they need to be URL encoded
    in the final URL.
    """
    settings = Settings(
        DATABASE_URL="user:p%40ss%3Aword@host:5432/db?sslmode=require",
        SECRET_KEY="test",
    )

    # Already encoded in input, scheme should be added
    expected_url = "postgresql+asyncpg://user:p%40ss%3Aword@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url


def test_database_url_default():
    """Test that default DATABASE_URL is used if not provided."""
    # Ensure no DATABASE_URL environment variable interferes
    with mock.patch.dict(os.environ, {}, clear=True):
        settings = Settings(SECRET_KEY="test")
        assert (
            settings.DATABASE_URL
            == "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"
        )


def test_database_url_with_query_params():
    """Test that query parameters are preserved when adding scheme."""
    settings = Settings(
        DATABASE_URL="user:password@host:5432/db?sslmode=require&application_name=gift_genie",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db?sslmode=require&application_name=gift_genie"
    assert settings.DATABASE_URL == expected_url
