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


def upload_model(data: bytes, filename: str = "champion_model.joblib"):
    """Upload a serialized model to Supabase Storage."""
    client = get_client()
    client.storage.from_("models").upload(
        filename, data,
        file_options={"content-type": "application/octet-stream", "upsert": "true"}
    )
    print(f"  Model uploaded to storage: {filename} ({len(data)} bytes)")


def download_model(filename: str = "champion_model.joblib") -> bytes | None:
    """Download a serialized model from Supabase Storage. Returns None if not found."""
    client = get_client()
    try:
        data = client.storage.from_("models").download(filename)
        print(f"  Model downloaded from storage: {filename} ({len(data)} bytes)")
        return data
    except Exception as e:
        print(f"  Model not found in storage: {e}")
        return None
