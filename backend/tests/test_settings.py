import os
from unittest import mock
from gift_genie.infrastructure.config.settings import Settings


def test_database_url_adds_scheme_when_missing():
    """Test that postgresql+asyncpg:// scheme is added when DATABASE_URL has no scheme.

    Terraform provides credentials in format: user:password@host:port/db?params
    The validator should add the postgresql+asyncpg:// scheme.
    """
    settings = Settings(
        DATABASE_URL="user:password@host:5432/db",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db"
    assert settings.DATABASE_URL == expected_url


def test_database_url_extracts_and_removes_sslmode():
    """Test that sslmode parameter is removed from DATABASE_URL.

    asyncpg doesn't accept sslmode as a connection parameter, so we remove it
    from the URL.
    """
    settings = Settings(
        DATABASE_URL="user:password@host:5432/db?sslmode=require",
        SECRET_KEY="test",
    )

    # Scheme should be added and sslmode should be removed
    expected_url = "postgresql+asyncpg://user:password@host:5432/db"
    assert settings.DATABASE_URL == expected_url


def test_database_url_extracts_sslmode_with_other_params():
    """Test that sslmode is removed while preserving other query parameters."""
    settings = Settings(
        DATABASE_URL="user:password@host:5432/db?sslmode=require&application_name=gift_genie",
        SECRET_KEY="test",
    )

    # sslmode should be removed but application_name preserved
    expected_url = "postgresql+asyncpg://user:password@host:5432/db?application_name=gift_genie"
    assert settings.DATABASE_URL == expected_url


def test_database_url_handles_different_sslmode_values():
    """Test that different sslmode values are removed correctly."""
    test_cases = [
        "disable",
        "allow",
        "prefer",
        "require",
        "verify-ca",
        "verify-full",
    ]

    for sslmode_value in test_cases:
        settings = Settings(
            DATABASE_URL=f"user:password@host:5432/db?sslmode={sslmode_value}",
            SECRET_KEY="test",
        )

        assert "sslmode" not in settings.DATABASE_URL


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


def test_database_url_extracts_sslmode_from_full_url():
    """Test that sslmode is removed even when URL already has a scheme."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:password@host:5432/db?sslmode=require",
        SECRET_KEY="test",
    )

    expected_url = "postgresql+asyncpg://user:password@host:5432/db"
    assert settings.DATABASE_URL == expected_url


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

    # Already encoded in input, scheme should be added, sslmode removed
    expected_url = "postgresql+asyncpg://user:p%40ss%3Aword@host:5432/db"
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


def test_database_url_with_percent_encoded_special_chars():
    """Test that URL-encoded passwords with % don't break URL parsing.

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

    # Should add scheme and remove sslmode
    expected_url = f"postgresql+asyncpg://gift_genie:{encoded_password}@88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/gift-genie-db-prod"
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


def test_database_ssl_required_auto_detect_scaleway():
    """Test that SSL is auto-detected as required for Scaleway databases."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@scaleway.com:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is True


def test_database_ssl_required_auto_detect_aws_rds():
    """Test that SSL is auto-detected as required for AWS RDS databases."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@mydb.rds.amazonaws.com:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is True


def test_database_ssl_required_auto_detect_azure():
    """Test that SSL is auto-detected as required for Azure databases."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@mydb.database.azure.com:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is True


def test_database_ssl_required_auto_detect_google_cloud_sql():
    """Test that SSL is auto-detected as required for Google Cloud SQL."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@cloudsql.com:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is True


def test_database_ssl_required_no_ssl_for_localhost():
    """Test that SSL is not required for localhost."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is False


def test_database_ssl_required_no_ssl_for_docker_hostname():
    """Test that SSL is not required for Docker container hostnames."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@postgres:5432/db",
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is False


def test_database_ssl_required_explicit_true_overrides_localhost():
    """Test that explicit DATABASE_SSL_REQUIRED=true overrides auto-detection."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://localhost:5432/db",
        DATABASE_SSL_REQUIRED=True,
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is True


def test_database_ssl_required_explicit_false_overrides_scaleway():
    """Test that explicit DATABASE_SSL_REQUIRED=false overrides auto-detection."""
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@scaleway.com:5432/db",
        DATABASE_SSL_REQUIRED=False,
        SECRET_KEY="test",
    )
    assert settings.DATABASE_SSL_REQUIRED is False


def test_database_ssl_required_case_insensitive_detection():
    """Test that SSL detection is case-insensitive for cloud provider patterns."""
    # Test uppercase
    settings_upper = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@SCALEWAY.COM:5432/db",
        SECRET_KEY="test",
    )
    assert settings_upper.DATABASE_SSL_REQUIRED is True

    # Test mixed case
    settings_mixed = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@ScaleWay.com:5432/db",
        SECRET_KEY="test",
    )
    assert settings_mixed.DATABASE_SSL_REQUIRED is True
