"""Supabase database helpers using the REST API via supabase-py."""
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_KEY

_client = None

def get_client():
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


def upsert_rows(table: str, rows: list[dict]):
    """Upsert rows into a Supabase table."""
    client = get_client()
    # Batch in groups of 500
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        client.table(table).upsert(batch).execute()


def insert_rows(table: str, rows: list[dict]):
    """Insert rows into a Supabase table."""
    client = get_client()
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        client.table(table).insert(batch).execute()
