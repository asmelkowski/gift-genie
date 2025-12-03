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


def test_database_url_with_percent_encoded_special_chars():
    """Test that URL-encoded passwords with % don't break f-string parsing.

    This is a regression test for the bug where URL-encoded characters like
    %26 (&), %40 (@), %23 (#), %24 ($) were incorrectly interpreted as
    Python format specifiers when using f-strings.

    Example password: n&95dc2IbmzUv0GF@jSl2tHTW6$&&8#96h$Y
    URL-encoded: n%2695dc2IbmzUv0GF%40jSl2tHTW6%24%26%268%2396h%24Y
    """
    # Password contains: & @ # $ characters (all URL-encoded)
    encoded_password = "n%2695dc2IbmzUv0GF%40jSl2tHTW6%24%26%268%2396h%24Y"
    database_url = f"gift_genie:{encoded_password}@88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/gift-genie-db-prod?sslmode=require"

    settings = Settings(
        DATABASE_URL=database_url,
        SECRET_KEY="test",
    )

    # Should add scheme without breaking on % characters
    expected_url = f"postgresql+asyncpg://{database_url}"
    assert settings.DATABASE_URL == expected_url

    # Verify encoded characters are preserved
    assert "%26" in settings.DATABASE_URL  # &
    assert "%40" in settings.DATABASE_URL  # @
    assert "%23" in settings.DATABASE_URL  # #
    assert "%24" in settings.DATABASE_URL  # $


def test_database_url_with_all_url_encoded_chars():
    """Test handling of all commonly URL-encoded special characters.

    Tests: ! # $ & ' ( ) * + , / : ; = ? @ [ ]
    """
    # Password with all special chars: p@ss&word#123$test!
    # URL-encoded: p%40ss%26word%23123%24test%21
    encoded_url = "user:p%40ss%26word%23123%24test%21@localhost:5432/db"

    settings = Settings(
        DATABASE_URL=encoded_url,
        SECRET_KEY="test",
    )

    expected_url = f"postgresql+asyncpg://{encoded_url}"
    assert settings.DATABASE_URL == expected_url
    assert "%" in settings.DATABASE_URL  # Encoding preserved
