"""Development-only database reset command.

Usage: python -m app.reset_db --yes
"""

import argparse
from pathlib import Path
import subprocess
import sys

from .database import DATABASE_PATH


def main() -> None:
    parser = argparse.ArgumentParser(description="Reset the local development SQLite database.")
    parser.add_argument("--yes", action="store_true", help="Confirm permanent deletion of local development data.")
    args = parser.parse_args()
    if not args.yes:
        parser.error("This command deletes local development data. Re-run with --yes to confirm.")

    backend_root = Path(__file__).resolve().parents[1]
    database_path = DATABASE_PATH.resolve()
    if backend_root not in database_path.parents:
        raise RuntimeError("Refusing to delete a database outside the backend workspace.")

    for path in (database_path, Path(f"{database_path}-wal"), Path(f"{database_path}-shm")):
        if path.exists():
            path.unlink()

    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_root, check=True)
    subprocess.run([sys.executable, "-m", "app.seed"], cwd=backend_root, check=True)
    print("Development database reset completed.")


if __name__ == "__main__":
    main()
