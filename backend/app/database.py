import os
from typing import Optional

from pymongo import MongoClient


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "talentlens_ai")


def get_database() -> Optional[object]:
  try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
    client.admin.command("ping")
    return client[MONGO_DB_NAME]
  except Exception:
    return None
