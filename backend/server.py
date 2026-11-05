r"""
Backend sostitutivo per la sincronizzazione (facoltativo).

Implementa le stesse API che l'app chiamava su offline-app-26.emergent.host:
  POST /api/auth/register   {email, password}  -> {access_token, user: {email}}
  POST /api/auth/login      {email, password}  -> {access_token, user: {email}}
  POST /api/upload          multipart "file"   -> {path}
  GET  /api/files/{path}                       -> immagine
  POST /api/cards/sync      {cards: [...]}     -> {cards: [...]}

Avvio:
    cd backend
    python -m venv .venv && .venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn server:app --host 0.0.0.0 --port 8001

Poi nell'app imposta EXPO_PUBLIC_API_URL=http://<ip-del-pc>:8001/api
"""
import hashlib
import json
import os
import secrets
import sqlite3
import uuid
from contextlib import contextmanager

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
FILES = os.path.join(DATA, "files")
os.makedirs(FILES, exist_ok=True)
DB = os.path.join(DATA, "vault.db")

app = FastAPI(title="Le mie carte - backend")


@contextmanager
def db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


with db() as con:
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, salt TEXT, pw TEXT);
        CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id TEXT);
        CREATE TABLE IF NOT EXISTS cards (user_id TEXT, id TEXT, updated_at TEXT, data TEXT,
                                          PRIMARY KEY (user_id, id));
        """
    )


def hash_pw(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def issue_token(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    with db() as con:
        con.execute("INSERT INTO tokens VALUES (?, ?)", (token, user_id))
    return token


def current_user(authorization: str = Header(default="")) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    with db() as con:
        row = con.execute("SELECT user_id FROM tokens WHERE token = ?", (token,)).fetchone()
    if not row:
        raise HTTPException(401, "Sessione scaduta, accedi di nuovo")
    return row["user_id"]


class Credentials(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
def register(body: Credentials):
    email = body.email.strip().lower()
    if len(body.password) < 6:
        raise HTTPException(400, "La password deve avere almeno 6 caratteri")
    salt = secrets.token_hex(16)
    user_id = str(uuid.uuid4())
    try:
        with db() as con:
            con.execute("INSERT INTO users VALUES (?, ?, ?, ?)", (user_id, email, salt, hash_pw(body.password, salt)))
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Esiste già un account con questa email")
    return {"access_token": issue_token(user_id), "user": {"email": email}}


@app.post("/api/auth/login")
def login(body: Credentials):
    email = body.email.strip().lower()
    with db() as con:
        row = con.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row or hash_pw(body.password, row["salt"]) != row["pw"]:
        raise HTTPException(401, "Email o password non corretti")
    return {"access_token": issue_token(row["id"]), "user": {"email": email}}


@app.post("/api/upload")
async def upload(file: UploadFile = File(...), user_id: str = Depends(current_user)):
    folder = os.path.join(FILES, user_id)
    os.makedirs(folder, exist_ok=True)
    name = f"{uuid.uuid4().hex}.jpg"
    with open(os.path.join(folder, name), "wb") as f:
        f.write(await file.read())
    return {"path": f"{user_id}/{name}"}


@app.get("/api/files/{path:path}")
def get_file(path: str, user_id: str = Depends(current_user)):
    full = os.path.normpath(os.path.join(FILES, path))
    if not path.startswith(f"{user_id}/") or not full.startswith(FILES) or not os.path.isfile(full):
        raise HTTPException(404, "File non trovato")
    return FileResponse(full, media_type="image/jpeg")


class SyncBody(BaseModel):
    cards: list[dict]


@app.post("/api/cards/sync")
def sync(body: SyncBody, user_id: str = Depends(current_user)):
    with db() as con:
        for card in body.cards:
            card.pop("localImage", None)
            cid, updated = card.get("id"), card.get("updated_at") or ""
            if not cid:
                continue
            row = con.execute("SELECT updated_at FROM cards WHERE user_id = ? AND id = ?", (user_id, cid)).fetchone()
            if row is None or updated > row["updated_at"]:
                con.execute(
                    "INSERT OR REPLACE INTO cards VALUES (?, ?, ?, ?)", (user_id, cid, updated, json.dumps(card))
                )
        rows = con.execute("SELECT data FROM cards WHERE user_id = ?", (user_id,)).fetchall()
    return {"cards": [json.loads(r["data"]) for r in rows]}
