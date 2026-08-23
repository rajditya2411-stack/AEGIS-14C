from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

DATABASE_URL = "sqlite+aiosqlite:///./tracex.db"

engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Automatic schema migration for existing SQLite tables
        try:
            result = await conn.execute(text("PRAGMA table_info(investigations)"))
            columns = [row[1] for row in result.fetchall()]
            if "user_id" not in columns:
                await conn.execute(text("ALTER TABLE investigations ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)"))
        except Exception as e:
            print("Database migration check:", e)
