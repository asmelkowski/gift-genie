import os
from unittest import mock
from gift_genie.infrastructure.config.settings import Settings


def test_database_url_construction_with_endpoint():
    """Test that DATABASE_URL is correctly constructed when DB_ENDPOINT is provided."""
    settings = Settings(
        DB_USER="user",
        DB_PASSWORD="password",
        DB_ENDPOINT="host:5432",
        DB_NAME="db",
        # Override defaults to avoid validation errors if any
        SECRET_KEY="test",
        REDIS_URL="localhost",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url
    assert settings.DB_HOST == "host"
    assert settings.DB_PORT == 5432


def test_database_url_construction_with_empty_port():
    """Test that DATABASE_URL defaults to port 5432 when DB_ENDPOINT has empty port (host:).

    This handles the Scaleway Serverless SQL Databases case where the endpoint is provided
    as "host:" with an empty port - we default to the standard PostgreSQL port 5432.
    """
    settings = Settings(
        DB_USER="user",
        DB_PASSWORD="password",
        DB_ENDPOINT="host:",
        DB_NAME="db",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url
    assert settings.DB_HOST == "host"
    assert settings.DB_PORT == 5432


def test_database_url_construction_with_no_port():
    """Test that DATABASE_URL defaults to port 5432 when DB_ENDPOINT has no colon (host).

    This handles the Scaleway Serverless SQL Databases case where the endpoint is provided
    as "host" without a colon or port - we default to the standard PostgreSQL port 5432.
    """
    settings = Settings(
        DB_USER="user",
        DB_PASSWORD="password",
        DB_ENDPOINT="host",
        DB_NAME="db",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url
    assert settings.DB_HOST == "host"
    assert settings.DB_PORT == 5432


def test_database_url_construction_with_special_chars_in_password():
    """Test that special characters in password are correctly encoded."""
    password = "p@ss:word"
    settings = Settings(
        DB_USER="user",
        DB_PASSWORD=password,
        DB_ENDPOINT="host:5432",
        DB_NAME="db",
        SECRET_KEY="test",
    )

    # The URL should be encoded.
    # p@ss:word -> p%40ss%3Aword
    expected_url = "postgresql+asyncpg://user:p%40ss%3Aword@host:5432/db?sslmode=require"
    assert settings.DATABASE_URL == expected_url


def test_database_url_default():
    """Test that default DATABASE_URL is used if components are missing."""
    # Ensure no environment variables interfere with the default
    with mock.patch.dict(os.environ, {}, clear=True):
        settings = Settings(SECRET_KEY="test")
        assert (
            settings.DATABASE_URL
            == "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"
        )
