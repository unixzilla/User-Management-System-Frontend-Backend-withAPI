"""Seed initial data: admin user and core roles."""
import asyncio
import sys
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.config import settings
from app.db.postgres import init_engine, get_async_session, get_async_engine
from app.db.mongo import init_mongo
from app.models.user import User
from app.models.role import Role
from app.services.user_service import user_service
from app.services.role_service import role_service
from app.core.security import hash_password
from app.crud.user import user as user_crud
from app.crud.role import role as role_crud


async def seed_roles(db: AsyncSession) -> None:
    """Seed the core roles including guest."""
    # Seed initial roles (admin, editor, viewer)
    await role_service.seed_initial_roles(db)
    # Ensure guest role exists
    guest_role = await role_crud.get_by_name(db, "guest")
    if not guest_role:
        await role_crud.create(
            db,
            {"name": "guest", "description": "Default guest role with minimal access"},
        )
        print("  Seeded roles: admin, editor, viewer, guest")
    else:
        print("  Seeded roles: admin, editor, viewer, guest (already existed)")


async def seed_admin_user(db: AsyncSession) -> None:
    """Seed the default admin user from environment variables."""
    email = settings.first_superuser_email
    username = settings.first_superuser_username

    # Get admin role (must exist)
    admin_role = await role_crud.get_by_name(db, "admin")
    if not admin_role:
        print("  ERROR: Admin role not found. Run seed_roles first.")
        return

    # Check if admin user already exists
    existing = await user_crud.get_by_email(db, email)
    if existing:
        # Ensure admin user has admin role (idempotent)
        if admin_role not in existing.roles:
            await user_crud.assign_role(db, user_id=existing.id, role_id=admin_role.id)
            await db.commit()
            print(f"  Admin user exists: assigned missing admin role to {email}")
        else:
            print(f"  Admin user already has admin role: {email}")
        return

    # Create new admin user
    admin = await user_crud.create_with_password(
        db,
        email=email,
        username=username,
        password=settings.first_superuser_password,
    )
    admin.full_name = "System Administrator"
    admin.is_verified = True

    # Assign admin role
    await user_crud.assign_role(db, user_id=admin.id, role_id=admin_role.id)

    await db.commit()
    print(f"  Created admin user: {email} (ID: {admin.id})")


async def main() -> None:
    """Run seeding operations."""
    print("Initializing database connections...")
    init_engine()
    init_mongo()

    print("Seeding initial data...")

    async with get_async_session() as db:
        try:
            await seed_roles(db)
            await seed_admin_user(db)
            print("\nSeeding complete!")
        except Exception as e:
            print(f"ERROR during seeding: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
