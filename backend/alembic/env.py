import sys
from logging.config import fileConfig
from pathlib import Path

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
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
