import pytest

from app.database import Base, SessionLocal, engine
from app.seed import seed_database


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Create and seed the database selected by DATABASE_URL for isolated test runs."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield
