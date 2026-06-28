from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "app" / "data"
CONTENT_FILE = DATA_DIR / "content.json"
REQUESTS_FILE = DATA_DIR / "requests.json"
AUDIT_FILE = DATA_DIR / "audit_log.json"

app = FastAPI(title="Veri Donusum Birimi Portal", version="1.0.0")
app.mount("/static", StaticFiles(directory=ROOT_DIR / "static"), name="static")


class PortalRequest(BaseModel):
    request_type: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    unit: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=10, max_length=1200)


class AnnouncementPayload(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    date: str = Field(min_length=2, max_length=40)
    badge: str = Field(default="Duyuru", max_length=40)
    type: str = Field(default="default", max_length=40)
    description: str = Field(min_length=5, max_length=1000)
    body: list[str] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)


class WorkPayload(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    date: str = Field(default="Güncel", max_length=40)
    badge: str = Field(default="Aktif", max_length=40)
    description: str = Field(min_length=5, max_length=1500)
    completed: list[str] = Field(default_factory=list)
    ongoing: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)


class LinkPayload(BaseModel):
    label: str = Field(min_length=2, max_length=120)
    url: str = Field(default="#", max_length=1200)
    kind: str = Field(default="link", max_length=80)
    icon_src: str = Field(default="", max_length=2000000)


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def audit(action: str, entity: str, item_id: str, title: str) -> None:
    rows = read_json(AUDIT_FILE, [])
    rows.insert(0, {
        "id": f"log-{str(uuid4())[:8]}",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "action": action,
        "entity": entity,
        "item_id": item_id,
        "title": title,
    })
    write_json(AUDIT_FILE, rows)


def validate_portal_date(value: str) -> str:
    try:
        parsed = datetime.strptime(value, "%d.%m.%Y").date()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Tarih gg.aa.yyyy formatında olmalı.") from exc
    if parsed > datetime.now().date():
        raise HTTPException(status_code=422, detail="Bugünden sonraki bir tarih girilemez.")
    return value


def content() -> dict:
    return read_json(CONTENT_FILE, {})


@app.get("/")
def index():
    return FileResponse(ROOT_DIR / "index.html")


@app.get("/works")
def works_page():
    return FileResponse(ROOT_DIR / "works.html")


@app.get("/announcements")
def announcements_page():
    return FileResponse(ROOT_DIR / "announcements.html")


@app.get("/admin")
def admin_page():
    return FileResponse(ROOT_DIR / "admin.html")


@app.get("/api/portal")
def portal_content():
    data = content()
    if not data:
        raise HTTPException(status_code=500, detail="Portal content is missing.")
    return data


@app.get("/api/works")
def works():
    return content().get("works", [])


@app.get("/api/announcements")
def announcements():
    return content().get("announcements", [])


@app.get("/api/links")
def links():
    return content().get("links", [])


@app.get("/api/admin/audit-log")
def audit_log():
    return read_json(AUDIT_FILE, [])


@app.post("/api/admin/announcements", status_code=201)
def add_announcement(payload: AnnouncementPayload):
    validate_portal_date(payload.date)
    data = content()
    item = {
        "id": f"ann-{str(uuid4())[:8]}",
        **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
    }
    data.setdefault("announcements", []).insert(0, item)
    data["meta"]["notification_count"] = len(data.get("announcements", []))
    write_json(CONTENT_FILE, data)
    audit("create", "announcement", item["id"], item["title"])
    return {"ok": True, "item": item}


@app.put("/api/admin/announcements/{item_id}")
def update_announcement(item_id: str, payload: AnnouncementPayload):
    validate_portal_date(payload.date)
    data = content()
    items = data.get("announcements", [])
    for index, item in enumerate(items):
        if item.get("id") == item_id:
            updated = {
                **item,
                **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
                "id": item_id,
            }
            items[index] = updated
            write_json(CONTENT_FILE, data)
            audit("update", "announcement", item_id, updated["title"])
            return {"ok": True, "item": updated}
    raise HTTPException(status_code=404, detail="Announcement not found.")


@app.delete("/api/admin/announcements/{item_id}")
def delete_announcement(item_id: str):
    data = content()
    before = len(data.get("announcements", []))
    deleted = next((item for item in data.get("announcements", []) if item.get("id") == item_id), None)
    data["announcements"] = [item for item in data.get("announcements", []) if item.get("id") != item_id]
    if len(data["announcements"]) == before:
        raise HTTPException(status_code=404, detail="Announcement not found.")
    data["meta"]["notification_count"] = len(data.get("announcements", []))
    write_json(CONTENT_FILE, data)
    audit("delete", "announcement", item_id, deleted.get("title", item_id) if deleted else item_id)
    return {"ok": True}


@app.post("/api/admin/works", status_code=201)
def add_work(payload: WorkPayload):
    validate_portal_date(payload.date)
    data = content()
    item = {
        "id": f"work-{str(uuid4())[:8]}",
        "status": "active",
        **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
    }
    data.setdefault("works", []).insert(0, item)
    write_json(CONTENT_FILE, data)
    audit("create", "work", item["id"], item["title"])
    return {"ok": True, "item": item}


@app.put("/api/admin/works/{item_id}")
def update_work(item_id: str, payload: WorkPayload):
    validate_portal_date(payload.date)
    data = content()
    items = data.get("works", [])
    for index, item in enumerate(items):
        if item.get("id") == item_id:
            updated = {
                **item,
                **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
                "id": item_id,
                "status": item.get("status", "active"),
            }
            items[index] = updated
            write_json(CONTENT_FILE, data)
            audit("update", "work", item_id, updated["title"])
            return {"ok": True, "item": updated}
    raise HTTPException(status_code=404, detail="Work not found.")


@app.delete("/api/admin/works/{item_id}")
def delete_work(item_id: str):
    data = content()
    before = len(data.get("works", []))
    deleted = next((item for item in data.get("works", []) if item.get("id") == item_id), None)
    data["works"] = [item for item in data.get("works", []) if item.get("id") != item_id]
    if len(data["works"]) == before:
        raise HTTPException(status_code=404, detail="Work not found.")
    write_json(CONTENT_FILE, data)
    audit("delete", "work", item_id, deleted.get("title", item_id) if deleted else item_id)
    return {"ok": True}


@app.post("/api/admin/links", status_code=201)
def add_link(payload: LinkPayload):
    data = content()
    item = {
        "id": f"link-{str(uuid4())[:8]}",
        **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
    }
    data.setdefault("links", []).append(item)
    write_json(CONTENT_FILE, data)
    audit("create", "link", item["id"], item["label"])
    return {"ok": True, "item": item}


@app.put("/api/admin/links/{item_id}")
def update_link(item_id: str, payload: LinkPayload):
    data = content()
    items = data.get("links", [])
    for index, item in enumerate(items):
        if item.get("id") == item_id:
            updated = {
                **item,
                **(payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()),
                "id": item_id,
            }
            items[index] = updated
            write_json(CONTENT_FILE, data)
            audit("update", "link", item_id, updated["label"])
            return {"ok": True, "item": updated}
    raise HTTPException(status_code=404, detail="Link not found.")


@app.delete("/api/admin/links/{item_id}")
def delete_link(item_id: str):
    data = content()
    before = len(data.get("links", []))
    deleted = next((item for item in data.get("links", []) if item.get("id") == item_id), None)
    data["links"] = [item for item in data.get("links", []) if item.get("id") != item_id]
    if len(data["links"]) == before:
        raise HTTPException(status_code=404, detail="Link not found.")
    write_json(CONTENT_FILE, data)
    audit("delete", "link", item_id, deleted.get("label", item_id) if deleted else item_id)
    return {"ok": True}


@app.post("/api/requests", status_code=201)
def create_request(payload: PortalRequest):
    existing = read_json(REQUESTS_FILE, [])
    payload_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    ticket = {
        "id": f"VD-{datetime.now().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}",
        "created_at": datetime.now().isoformat(timespec="seconds"),
        **payload_data,
        "status": "alındı",
    }
    existing.insert(0, ticket)
    write_json(REQUESTS_FILE, existing)
    return {"ok": True, "ticket": ticket}


@app.get("/api/requests")
def list_requests():
    return read_json(REQUESTS_FILE, [])
