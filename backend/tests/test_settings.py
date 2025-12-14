import os
from unittest import mock

from gift_genie.infrastructure.config.settings import Settings


class TestDatabaseURLSettings:
    """Tests for DATABASE_URL and DATABASE_URL_SYNC settings."""

    def test_database_url_default(self):
        """Test that default DATABASE_URL is used if not provided."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert (
                settings.DATABASE_URL
                == "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"
            )

    def test_database_url_sync_default(self):
        """Test that default DATABASE_URL_SYNC is used if not provided."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert (
                settings.DATABASE_URL_SYNC
                == "postgresql://postgres:postgres@localhost:5432/gift_genie"
            )

    def test_database_url_passthrough(self):
        """Test that DATABASE_URL is passed through unchanged."""
        url = "postgresql+asyncpg://user:pass@myhost:5432/mydb"
        settings = Settings(DATABASE_URL=url, SECRET_KEY="test")
        assert settings.DATABASE_URL == url

    def test_database_url_sync_passthrough(self):
        """Test that DATABASE_URL_SYNC is passed through unchanged."""
        url = "postgresql://user:pass@myhost:5432/mydb?sslmode=require"
        settings = Settings(DATABASE_URL_SYNC=url, SECRET_KEY="test")
        assert settings.DATABASE_URL_SYNC == url

    def test_database_url_with_special_chars_preserved(self):
        """Test that special characters in URL are preserved."""
        url = "postgresql+asyncpg://user:p%40ss%26word@host:5432/db"
        settings = Settings(DATABASE_URL=url, SECRET_KEY="test")
        assert settings.DATABASE_URL == url
        assert "%40" in settings.DATABASE_URL  # @
        assert "%26" in settings.DATABASE_URL  # &

    def test_database_url_with_encoded_password(self):
        """Test that URL-encoded passwords are preserved unchanged."""
        encoded_password = "n%2695dc2IbmzUv0GF%40jSl2tHTW6%24%26%268%2396h%24Y"
        database_url = f"postgresql+asyncpg://gift_genie:{encoded_password}@88b921e6-e7d4-4f50-93b9-a0ec7a91d66c.pg.sdb.fr-par.scw.cloud:5432/gift-genie-db-prod?sslmode=require"

        settings = Settings(
            DATABASE_URL=database_url,
            SECRET_KEY="test",
        )

        # URL should be passed through unchanged
        assert settings.DATABASE_URL == database_url

        # Verify encoded characters are preserved
        assert "%26" in settings.DATABASE_URL  # &
        assert "%40" in settings.DATABASE_URL  # @
        assert "%24" in settings.DATABASE_URL  # $


class TestDatabaseSSLSettings:
    """Tests for DATABASE_SSL_REQUIRED setting."""

    def test_database_ssl_required_default_false(self):
        """Test that DATABASE_SSL_REQUIRED defaults to False."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.DATABASE_SSL_REQUIRED is False

    def test_database_ssl_required_explicit_true(self):
        """Test that DATABASE_SSL_REQUIRED can be set to True."""
        settings = Settings(DATABASE_SSL_REQUIRED=True, SECRET_KEY="test")
        assert settings.DATABASE_SSL_REQUIRED is True

    def test_database_ssl_required_explicit_false(self):
        """Test that DATABASE_SSL_REQUIRED can be set to False explicitly."""
        settings = Settings(DATABASE_SSL_REQUIRED=False, SECRET_KEY="test")
        assert settings.DATABASE_SSL_REQUIRED is False


class TestCORSOriginsSettings:
    """Tests for CORS_ORIGINS parsing."""

    def test_cors_origins_comma_separated(self):
        """Test parsing comma-separated CORS origins."""
        settings = Settings(
            CORS_ORIGINS="http://localhost:3000,http://localhost:5173",
            SECRET_KEY="test",
        )
        assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]

    def test_cors_origins_json_array(self):
        """Test parsing JSON array CORS origins."""
        settings = Settings(
            CORS_ORIGINS='["http://localhost:3000", "http://localhost:5173"]',
            SECRET_KEY="test",
        )
        assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]

    def test_cors_origins_default(self):
        """Test default CORS origins when not specified."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            # Default is comma-separated string in settings, parsed to list
            assert isinstance(settings.CORS_ORIGINS, list)
            assert "http://localhost:5173" in settings.CORS_ORIGINS

    def test_cors_origins_empty_returns_default(self):
        """Test that empty CORS_ORIGINS returns default."""
        settings = Settings(CORS_ORIGINS="", SECRET_KEY="test")
        assert settings.CORS_ORIGINS == ["http://localhost:5173"]

    def test_cors_origins_whitespace_only_returns_default(self):
        """Test that whitespace-only CORS_ORIGINS returns default."""
        settings = Settings(CORS_ORIGINS="   ", SECRET_KEY="test")
        assert settings.CORS_ORIGINS == ["http://localhost:5173"]

    def test_cors_origins_whitespace_stripped(self):
        """Test that whitespace is stripped from origins."""
        settings = Settings(
            CORS_ORIGINS="  http://localhost:3000  ,  http://localhost:5173  ",
            SECRET_KEY="test",
        )
        assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]

    def test_cors_origins_json_with_whitespace(self):
        """Test that JSON array CORS origins have whitespace stripped."""
        settings = Settings(
            CORS_ORIGINS='["  http://localhost:3000  ", "  http://localhost:5173  "]',
            SECRET_KEY="test",
        )
        assert settings.CORS_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]

    def test_cors_origins_multiple_origins_in_default(self):
        """Test that default CORS_ORIGINS includes multiple origins."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            # Default includes localhost:5173, localhost:3000, and frontend:5173
            assert "http://localhost:5173" in settings.CORS_ORIGINS
            assert "http://localhost:3000" in settings.CORS_ORIGINS
            assert "http://frontend:5173" in settings.CORS_ORIGINS


class TestOtherSettings:
    """Tests for other settings fields."""

    def test_env_default(self):
        """Test that ENV defaults to 'dev'."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.ENV == "dev"

    def test_env_override(self):
        """Test that ENV can be overridden."""
        settings = Settings(ENV="production", SECRET_KEY="test")
        assert settings.ENV == "production"

    def test_debug_default(self):
        """Test that DEBUG defaults to True."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.DEBUG is True

    def test_debug_override(self):
        """Test that DEBUG can be overridden."""
        settings = Settings(DEBUG=False, SECRET_KEY="test")
        assert settings.DEBUG is False

    def test_secret_key_required(self):
        """Test that SECRET_KEY has a default (but should be overridden in prod)."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings()
            assert settings.SECRET_KEY == "your-secret-key-here-change-in-production"

    def test_secret_key_override(self):
        """Test that SECRET_KEY can be overridden."""
        settings = Settings(SECRET_KEY="my-custom-secret")
        assert settings.SECRET_KEY == "my-custom-secret"

    def test_algorithm_default(self):
        """Test that ALGORITHM defaults to HS256."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.ALGORITHM == "HS256"

    def test_access_token_expire_minutes_default(self):
        """Test that ACCESS_TOKEN_EXPIRE_MINUTES defaults to 30."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 30

    def test_cookie_samesite_default(self):
        """Test that COOKIE_SAMESITE defaults to 'lax'."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.COOKIE_SAMESITE == "lax"

    def test_cookie_secure_default(self):
        """Test that COOKIE_SECURE defaults to False."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.COOKIE_SECURE is False

    def test_email_enabled_default(self):
        """Test that EMAIL_ENABLED defaults to False."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.EMAIL_ENABLED is False

    def test_app_name_default(self):
        """Test that APP_NAME defaults to 'Gift Genie'."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.APP_NAME == "Gift Genie"

    def test_log_level_default(self):
        """Test that LOG_LEVEL defaults to 'INFO'."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.LOG_LEVEL == "INFO"

    def test_redis_url_default(self):
        """Test that REDIS_URL defaults to localhost:6379."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.REDIS_URL == "localhost:6379"

    def test_redis_username_default(self):
        """Test that REDIS_USERNAME defaults to empty string."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.REDIS_USERNAME == ""

    def test_redis_password_default(self):
        """Test that REDIS_PASSWORD defaults to empty string."""
        with mock.patch.dict(os.environ, {}, clear=True):
            settings = Settings(SECRET_KEY="test")
            assert settings.REDIS_PASSWORD == ""
