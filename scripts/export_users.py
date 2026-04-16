"""Export users data to CSV with audit log enrichment."""
import asyncio
import csv
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.config import settings
from app.db.postgres import init_engine, get_async_session, get_async_engine
from app.db.mongo import init_mongo, get_mongo_collection


async def get_active_users_with_roles(db: AsyncSession) -> list[dict]:
    """
    Query all active users with their roles using a CTE.
    Returns list of dicts with user data and aggregated roles.
    """
    cte_query = text("""
        WITH active_users AS (
            SELECT
                u.id,
                u.email,
                u.username,
                u.full_name,
                u.created_at,
                u.is_verified,
                STRING_AGG(DISTINCT r.name, ', ' ORDER BY r.name) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.is_active = TRUE
              AND u.deleted_at IS NULL
            GROUP BY u.id, u.email, u.username, u.full_name, u.created_at, u.is_verified
            ORDER BY u.created_at DESC
        )
        SELECT * FROM active_users
    """)

    result = await db.execute(cte_query)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


async def get_last_audit_for_users(user_ids: list[str]) -> dict[str, Optional[dict]]:
    """
    Fetch the most recent audit event for each user ID from MongoDB.
    Returns a dict mapping user_id -> audit record or None.
    """
    if not user_ids:
        return {}

    collection = get_mongo_collection("audit_logs")
    audit_map = {}

    # For each user, find their last audit event
    for user_id_str in user_ids:
        try:
            from uuid import UUID
            user_uuid = UUID(user_id_str)
        except ValueError:
            continue

        last_audit = await collection.find_one(
            {"target_id": user_uuid},
            sort=[("timestamp", -1)]
        )
        if last_audit:
            audit_map[user_id_str] = {
                "event_type": last_audit.get("event_type"),
                "timestamp": last_audit.get("timestamp"),
                "actor_id": str(last_audit.get("actor_id")) if last_audit.get("actor_id") else None,
            }
        else:
            audit_map[user_id_str] = None

    return audit_map


async def export_to_csv(users: list[dict], audit_data: dict) -> None:
    """Write users + audit data to timestamped CSV file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_dir = Path("exports")
    export_dir.mkdir(exist_ok=True)
    filename = export_dir / f"users_{timestamp}.csv"

    fieldnames = [
        "id",
        "email",
        "username",
        "full_name",
        "created_at",
        "is_verified",
        "roles",
        "last_audit_event",
        "last_audit_timestamp",
        "last_audit_actor",
    ]

    written = 0
    with open(filename, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        for user in users:
            user_id = str(user["id"])
            audit = audit_data.get(user_id)

            row = {
                "id": user_id,
                "email": user["email"],
                "username": user["username"],
                "full_name": user.get("full_name") or "",
                "created_at": user["created_at"].isoformat() if user.get("created_at") else "",
                "is_verified": str(user.get("is_verified", "")).lower(),
                "roles": user.get("roles") or "",
                "last_audit_event": audit["event_type"] if audit else "",
                "last_audit_timestamp": audit["timestamp"].isoformat() if audit and audit.get("timestamp") else "",
                "last_audit_actor": audit["actor_id"] if audit else "",
            }
            writer.writerow(row)
            written += 1

    print(f"Exported {written} users to {filename}")


async def main() -> None:
    """Main export pipeline."""
    print("Initializing database connections...")
    init_engine()
    init_mongo()

    print("Fetching active users from PostgreSQL...")
    async with get_async_session() as db:
        users = await get_active_users_with_roles(db)
        user_ids = [str(u["id"]) for u in users]
        print(f"Found {len(users)} active users")

        print("Fetching last audit events from MongoDB...")
        audit_data = await get_last_audit_for_users(user_ids)
        print(f"Retrieved audit data for {sum(1 for v in audit_data.values() if v)} users")

        print("Writing CSV export...")
        await export_to_csv(users, audit_data)

        print(f"\nStats:")
        print(f"  Total users: {len(users)}")
        print(f"  With audit history: {sum(1 for v in audit_data.values() if v)}")
        print(f"  Without audit history: {sum(1 for v in audit_data.values() if not v)}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExport interrupted")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
