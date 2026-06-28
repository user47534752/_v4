export async function fetchPortal() {
  const response = await fetch(`/api/portal?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Portal verisi alınamadı.");
  return response.json();
}

export async function fetchAuditLog() {
  const response = await fetch("/api/admin/audit-log");
  if (!response.ok) throw new Error("Log alınamadı.");
  return response.json();
}

export async function createAnnouncement(payload) {
  const response = await fetch("/api/admin/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Duyuru eklenemedi.");
  return response.json();
}

export async function updateAnnouncement(id, payload) {
  const response = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Duyuru güncellenemedi.");
  return response.json();
}

export async function createWork(payload) {
  const response = await fetch("/api/admin/works", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Çalışma eklenemedi.");
  return response.json();
}

export async function updateWork(id, payload) {
  const response = await fetch(`/api/admin/works/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Çalışma güncellenemedi.");
  return response.json();
}

export async function deleteAnnouncement(id) {
  const response = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Duyuru silinemedi.");
  return response.json();
}

export async function deleteWork(id) {
  const response = await fetch(`/api/admin/works/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Çalışma silinemedi.");
  return response.json();
}

export async function createLink(payload) {
  const response = await fetch("/api/admin/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Bağlantı eklenemedi.");
  return response.json();
}

export async function updateLink(id, payload) {
  const response = await fetch(`/api/admin/links/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Bağlantı güncellenemedi.");
  return response.json();
}

export async function deleteLink(id) {
  const response = await fetch(`/api/admin/links/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Bağlantı silinemedi.");
  return response.json();
}
