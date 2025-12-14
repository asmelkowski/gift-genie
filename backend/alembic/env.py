import sys
from logging.config import fileConfig
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from alembic import context
from sqlalchemy import create_engine, pool

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from gift_genie.infrastructure.database.models import Base
from gift_genie.infrastructure.config.settings import get_settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("+asyncpg", ""))


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Create engine directly with URL to avoid ConfigParser interpolation issues
    # with URL-encoded passwords (e.g., %26, %40, %24).
    # ConfigParser treats % as interpolation syntax, causing errors like:
    # "invalid interpolation syntax in 'postgresql://...' at position 25"
    url = config.get_main_option("sqlalchemy.url")
    assert url is not None, "sqlalchemy.url not configured in alembic config"

    # Build connect_args for database-specific requirements
    connect_args: dict[str, object] = {}

    # Extract and format options parameter for Scaleway Serverless SQL Database
    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query)

    if "options" in query_params:
        # parse_qs automatically URL-decodes values, so query_params["options"][0] is already decoded
        # Scaleway SDB requires: options=databaseid={uuid}
        options_value = query_params["options"][0]
        connect_args["options"] = options_value

    # Add SSL configuration if required
    if settings.DATABASE_SSL_REQUIRED:
        # Use sslmode=require to enable SSL/TLS connections.
        # This lets libpq handle SSL configuration automatically, including:
        # - Server Name Indication (SNI) during TLS handshake (required for Scaleway SDB)
        # - Certificate validation
        # For Scaleway Serverless SQL Database, 'require' mode is sufficient as they
        # manage certificates internally. This fixes the issue where psycopg2 was
        # not sending the hostname via SNI, causing "Database hostname wasn't sent to server" error.
        connect_args["sslmode"] = "require"

    connectable = create_engine(url, poolclass=pool.NullPool, connect_args=connect_args)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
