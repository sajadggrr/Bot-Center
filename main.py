import os, json, hmac, hashlib, time, sqlite3, urllib.parse, secrets
from pathlib import Path
from typing import Optional
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')
DB_PATH = os.getenv("BOT_CENTER_DB", str(ROOT / "bot_center.db"))
OWNER_ID = int(os.getenv("OWNER_ID", "0"))
ADMIN_KEY = os.getenv("ADMIN_KEY", "")
BOTS_JSON = os.getenv("BOTS_JSON", "{}")
BOTS = json.loads(BOTS_JSON)
# Example BOTS_JSON:
# {"contact":{"name":"Contact Bot","token":"123:ABC","owner_id":123456789,"username":"YourContactBot"}}

app = FastAPI(title="Bot Center", version="1.0.0")
app.mount("/static", StaticFiles(directory=str(ROOT / "static")), name="static")

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bot_slug TEXT NOT NULL,
            tg_user_id INTEGER NOT NULL,
            username TEXT,
            full_name TEXT,
            message TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'new'
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS app_users (
            tg_user_id INTEGER PRIMARY KEY,
            username TEXT,
            full_name TEXT,
            first_seen INTEGER NOT NULL,
            last_seen INTEGER NOT NULL
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS bot_registry (
            slug TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            bot_username TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL
        )""")
        for slug, cfg in BOTS.items():
            c.execute("""INSERT INTO bot_registry(slug,display_name,bot_username,created_at)
                         VALUES(?,?,?,?) ON CONFLICT(slug) DO UPDATE SET
                         display_name=excluded.display_name,
                         bot_username=excluded.bot_username""",
                      (slug, cfg.get("name", slug), cfg.get("username"), int(time.time())))
init_db()

def verify_init_data(init_data: str, token: str, max_age=86400):
    """Validate Telegram Mini App initData using the bot token. Never trust client user JSON alone."""
    if not init_data or not token:
        return None
    try:
        parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None
        pairs = [f"{k}={v}" for k, v in sorted(parsed.items())]
        data_check_string = "\n".join(pairs)
        secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
        calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated, received_hash):
            return None
        auth_date = int(parsed.get("auth_date", "0"))
        if auth_date <= 0 or time.time() - auth_date > max_age:
            return None
        user = json.loads(parsed.get("user", "{}"))
        if not user.get("id"):
            return None
        return user
    except Exception:
        return None

def get_bot(slug):
    cfg = BOTS.get(slug)
    if not cfg or not cfg.get("token"):
        raise HTTPException(404, "Bot is not configured")
    return cfg

async def telegram_call(token: str, method: str, payload: dict):
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"https://api.telegram.org/bot{token}/{method}", json=payload)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", "Telegram API error"))
        return data.get("result")

class MessageIn(BaseModel):
    bot: str = "contact"
    message: str

@app.get("/", response_class=HTMLResponse)
async def home():
    return (ROOT / "static" / "index.html").read_text(encoding="utf-8")

@app.get("/health")
async def health():
    return {"ok": True, "app": "Bot Center"}

@app.get("/api/config")
async def config(bot: str = "contact"):
    cfg = BOTS.get(bot)
    if not cfg:
        raise HTTPException(404, "Unknown bot")
    return {
        "bot": bot,
        "name": cfg.get("name", bot),
        "username": cfg.get("username", ""),
        "contact_enabled": bool(cfg.get("contact_enabled", True))
    }

@app.post("/api/message")
async def send_message(data: MessageIn, request: Request,
                       x_telegram_init_data: Optional[str] = Header(default=None)):
    cfg = get_bot(data.bot)
    if not cfg.get("contact_enabled", True):
        raise HTTPException(403, "Contact form disabled")
    if not x_telegram_init_data:
        raise HTTPException(401, "Open this app from its Telegram bot")
    user = verify_init_data(x_telegram_init_data, cfg["token"])
    if not user:
        raise HTTPException(401, "Telegram authentication failed. Reopen the Mini App.")
    message = data.message.strip()
    if not message or len(message) > 3000:
        raise HTTPException(400, "Message must be between 1 and 3000 characters")
    uid = int(user["id"])
    username = user.get("username", "")
    full_name = " ".join(x for x in [user.get("first_name"), user.get("last_name")] if x)
    now = int(time.time())
    owner_id = int(cfg.get("owner_id") or OWNER_ID)
    if not owner_id:
        raise HTTPException(500, "Set owner_id in BOTS_JSON or OWNER_ID")
    with db() as c:
        c.execute("""INSERT INTO app_users(tg_user_id,username,full_name,first_seen,last_seen)
                     VALUES(?,?,?,?,?) ON CONFLICT(tg_user_id) DO UPDATE SET
                     username=excluded.username, full_name=excluded.full_name,last_seen=excluded.last_seen""",
                  (uid, username, full_name, now, now))
        cur = c.execute("""INSERT INTO messages(bot_slug,tg_user_id,username,full_name,message,created_at)
                           VALUES(?,?,?,?,?,?)""",
                        (data.bot, uid, username, full_name, message, now))
        msg_id = cur.lastrowid
    safe_name = full_name or "Telegram user"
    user_ref = f"@{username}" if username else "بدون يوزر"
    notice = (f"📩 رسالة جديدة من Bot Center\\n"
              f"🤖 البوت: {cfg.get('name', data.bot)}\\n"
              f"👤 الاسم: {safe_name}\\n"
              f"🆔 ID: {uid}\\n"
              f"🔗 الحساب: {user_ref}\\n"
              f"📝 الرسالة:\\n{message}\\n\\n"
              f"رقم الرسالة: #{msg_id}")
    try:
        await telegram_call(cfg["token"], "sendMessage", {"chat_id": owner_id, "text": notice})
    except Exception as e:
        with db() as c:
            c.execute("UPDATE messages SET status='delivery_error' WHERE id=?", (msg_id,))
        raise HTTPException(502, f"Saved, but Telegram delivery failed: {str(e)[:180]}")
    return {"ok": True, "message": "تم إرسال رسالتك بنجاح", "id": msg_id}

@app.get("/api/admin/stats")
async def admin_stats(x_admin_key: Optional[str] = Header(default=None)):
    if not ADMIN_KEY or not x_admin_key or not hmac.compare_digest(ADMIN_KEY, x_admin_key):
        raise HTTPException(403, "Forbidden")
    with db() as c:
        users = c.execute("SELECT COUNT(*) n FROM app_users").fetchone()["n"]
        messages = c.execute("SELECT COUNT(*) n FROM messages").fetchone()["n"]
        today = c.execute("SELECT COUNT(*) n FROM messages WHERE created_at >= ?", (int(time.time())-86400,)).fetchone()["n"]
        bots = c.execute("SELECT COUNT(*) n FROM bot_registry WHERE enabled=1").fetchone()["n"]
    return {"users": users, "messages": messages, "last_24h": today, "bots": bots}

@app.post("/api/admin/bots")
async def add_bot(request: Request, x_admin_key: Optional[str] = Header(default=None)):
    if not ADMIN_KEY or not x_admin_key or not hmac.compare_digest(ADMIN_KEY, x_admin_key):
        raise HTTPException(403, "Forbidden")
    body = await request.json()
    slug = str(body.get("slug", "")).strip().lower()
    token = str(body.get("token", "")).strip()
    name = str(body.get("name", "")).strip()
    username = str(body.get("username", "")).strip().lstrip("@")
    owner_id = int(body.get("owner_id", 0))
    if not slug or not slug.replace("_", "").isalnum() or not token or not name or not owner_id:
        raise HTTPException(400, "slug, token, name and owner_id are required")
    # Validate token before adding it.
    me = await telegram_call(token, "getMe", {})
    BOTS[slug] = {"token": token, "name": name, "username": username or me.get("username", ""),
                  "owner_id": owner_id, "contact_enabled": True}
    with db() as c:
        c.execute("""INSERT INTO bot_registry(slug,display_name,bot_username,created_at)
                     VALUES(?,?,?,?) ON CONFLICT(slug) DO UPDATE SET
                     display_name=excluded.display_name,bot_username=excluded.bot_username,enabled=1""",
                  (slug, name, BOTS[slug]["username"], int(time.time())))
    return {"ok": True, "slug": slug, "bot_username": BOTS[slug]["username"],
            "note": "For permanent multi-bot configuration, also add this bot to BOTS_JSON in .env and restart."}

@app.get("/api/admin/messages")
async def admin_messages(limit: int = 50, x_admin_key: Optional[str] = Header(default=None)):
    if not ADMIN_KEY or not x_admin_key or not hmac.compare_digest(ADMIN_KEY, x_admin_key):
        raise HTTPException(403, "Forbidden")
    limit = max(1, min(limit, 200))
    with db() as c:
        rows = c.execute("SELECT * FROM messages ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]

@app.get("/{path:path}", response_class=HTMLResponse)
async def fallback(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, "Not found")
    return (ROOT / "static" / "index.html").read_text(encoding="utf-8")
