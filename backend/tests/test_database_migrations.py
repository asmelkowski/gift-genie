"""Tests for automatic database migrations."""

from unittest import mock

import pytest

from gift_genie.infrastructure.database.migrations import run_migrations


class TestRunMigrations:
    """Test suite for the run_migrations function."""

    def test_run_migrations_success(self) -> None:
        """Test successful migration run."""
        with mock.patch(
            "gift_genie.infrastructure.database.migrations.command.upgrade"
        ) as mock_upgrade:  # noqa: E501
            run_migrations()
            # Verify upgrade was called with "head" target
            mock_upgrade.assert_called_once()
            call_args = mock_upgrade.call_args
            assert call_args[0][1] == "head"  # Second argument should be "head"

    def test_run_migrations_with_retry_on_failure(self) -> None:
        """Test migration retry logic on database connection failure."""
        with (
            mock.patch(
                "gift_genie.infrastructure.database.migrations.command.upgrade"
            ) as mock_upgrade,
            mock.patch("gift_genie.infrastructure.database.migrations.time.sleep") as mock_sleep,
        ):
            # Fail twice, succeed on third attempt
            mock_upgrade.side_effect = [
                Exception("Connection refused"),
                Exception("Connection refused"),
                None,  # Success
            ]

            run_migrations()

            # Verify upgrade was called 3 times
            assert mock_upgrade.call_count == 3
            # Verify sleep was called 2 times (before 2nd and 3rd attempts)
            assert mock_sleep.call_count == 2
            # Verify exponential backoff (2s, then 4s)
            mock_sleep.assert_any_call(2)
            mock_sleep.assert_any_call(4)

    def test_run_migrations_failure_after_max_retries(self) -> None:
        """Test that RuntimeError is raised after max retries exhausted."""
        with (
            mock.patch(
                "gift_genie.infrastructure.database.migrations.command.upgrade"
            ) as mock_upgrade,
            mock.patch("gift_genie.infrastructure.database.migrations.time.sleep"),
        ):
            # Always fail
            mock_upgrade.side_effect = Exception("Database connection failed")

            with pytest.raises(RuntimeError, match="Failed to run database migrations"):
                run_migrations()

            # Verify upgrade was called 5 times (max retries)
            assert mock_upgrade.call_count == 5

    def test_database_url_async_driver_removed(self) -> None:
        """Test that +asyncpg driver is removed from database URL for migrations.

        Alembic requires synchronous SQLAlchemy, so we remove +asyncpg from the
        async driver URL before passing it to migrations.
        """
        with mock.patch(
            "gift_genie.infrastructure.database.migrations.Config"
        ) as mock_config_class:  # noqa: E501
            mock_config_instance = mock.MagicMock()
            mock_config_class.return_value = mock_config_instance

            with mock.patch("gift_genie.infrastructure.database.migrations.command.upgrade"):
                run_migrations()

                # Verify that set_main_option was called with sqlalchemy.url
                # (it's called twice: once for script_location, once for sqlalchemy.url)
                calls = mock_config_instance.set_main_option.call_args_list

                # Find the sqlalchemy.url call
                sqlalchemy_call = None
                for call in calls:
                    if call[0][0] == "sqlalchemy.url":
                        sqlalchemy_call = call
                        break

                assert sqlalchemy_call is not None, "sqlalchemy.url was not set"
                db_url = sqlalchemy_call[0][1]  # Second argument

                # Verify +asyncpg is not in the URL
                assert "+asyncpg" not in db_url, f"Expected +asyncpg to be removed, got: {db_url}"
                # Verify it's a postgres URL
                assert db_url.startswith(
                    "postgresql://"
                ), f"Expected postgresql:// scheme, got: {db_url}"


class TestLifecycleIntegration:
    """Test suite for lifespan integration."""

    @pytest.mark.asyncio
    async def test_lifespan_calls_migrations_before_fastapi_limiter(self) -> None:
        """Test that migrations are called before FastAPILimiter initialization."""
        from gift_genie.main import lifespan

        call_order = []

        with (
            mock.patch("gift_genie.main.run_migrations") as mock_migrations,
            mock.patch("gift_genie.main.FastAPILimiter.init") as mock_limiter_init,
        ):

            def track_migrations() -> None:
                call_order.append("migrations")

            async def track_limiter(redis: object) -> None:
                call_order.append("limiter")

            mock_migrations.side_effect = track_migrations
            mock_limiter_init.side_effect = track_limiter

            mock_app = mock.MagicMock()

            async with lifespan(mock_app):
                pass

            # Verify migrations were called first
            assert call_order == ["migrations", "limiter"]
            # Verify both were called
            mock_migrations.assert_called_once()
            mock_limiter_init.assert_called_once()
