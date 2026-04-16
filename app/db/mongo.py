"""Async MongoDB client using Motor."""
from typing import Optional

import motor.motor_asyncio
from pymongo.collection import Collection

from app.config import settings

_mongo_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
_mongo_db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None


def init_mongo() -> None:
    """Initialize the global MongoDB client."""
    global _mongo_client, _mongo_db
    _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_url)
    _mongo_db = _mongo_client[settings.mongodb_db]


def get_mongo_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    """Get the global MongoDB client (initializes if needed)."""
    global _mongo_client
    if _mongo_client is None:
        init_mongo()
    return _mongo_client


def get_mongo_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    """Get the global MongoDB database."""
    global _mongo_db
    if _mongo_db is None:
        init_mongo()
    return _mongo_db


def get_mongo_collection(collection_name: str) -> Collection:
    """Get a MongoDB collection by name."""
    db = get_mongo_database()
    return db[collection_name]
