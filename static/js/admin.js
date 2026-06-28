import {
  createAnnouncement,
  createLink,
  createWork,
  deleteAnnouncement,
  deleteLink,
  deleteWork,
  fetchAuditLog,
  fetchPortal,
  updateAnnouncement,
  updateLink,
  updateWork,
} from "./api.js";
import { escapeHtml, toLines } from "./utils.js";

const state = { portal: null, panel: "announcements" };
const list = document.querySelector("#adminList");
const title = document.querySelector("#adminTitle");
const announcementForm = document.querySelector("#announcementForm");
const workForm = document.querySelector("#workForm");
const linkForm = document.querySelector("#linkForm");
const auditList = document.querySelector("#auditList");
const forms = { announcements: announcementForm, works: workForm, links: linkForm };

function todayText() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}

function parseDateText(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || ""));
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function isFutureDate(value) {
  const date = parseDateText(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

function maskDateInput(input) {
  const digits = input.value.replace(/\D/g, "").slice(0, 8);
  const chunks = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  input.value = chunks.join(".");
}

function validateDateInput(input) {
  const date = parseDateText(input.value);
  if (!date) {
    input.setCustomValidity("Tarih gg.aa.yyyy formatında olmalı.");
    return false;
  }
  if (isFutureDate(input.value)) {
    input.setCustomValidity("Bugünden sonraki bir tarih girilemez.");
    return false;
  }
  input.setCustomValidity("");
  return true;
}

function itemsForPanel() {
  if (state.panel === "announcements") return state.portal.announcements;
  if (state.panel === "works") return state.portal.works;
  if (state.panel === "links") return state.portal.links;
  return [];
}

function labelForPanel() {
  return {
    announcements: "Duyurular",
    works: "Çalışmalar",
    links: "Bağlantılar",
    logs: "Değişiklik Logları",
  }[state.panel];
}

function renderList() {
  if (state.panel === "logs") return renderLogs();
  const items = itemsForPanel();
  list.innerHTML = items.map((item) => {
    const name = item.title || item.label;
    const meta = item.date || item.url || item.description?.slice(0, 90) || "";
    return `
      <div class="admin-list-row" data-edit-id="${escapeHtml(item.id)}">
        <div class="row-main">
          <div class="row-title">${escapeHtml(name)}</div>
          <div class="row-meta">${escapeHtml(meta)}</div>
        </div>
        <button class="row-delete" type="button" data-delete-id="${escapeHtml(item.id)}">Sil</button>
      </div>`;
  }).join("") || `<div class="admin-empty">Bu bölümde kayıt yok.</div>`;
}

async function renderLogs() {
  const rows = await fetchAuditLog();
  auditList.innerHTML = rows.map((row) => `
    <div class="admin-list-row log-row">
      <div class="row-main">
        <div class="log-head">
          <span class="row-badge">${escapeHtml(actionLabel(row.action))}</span>
          <span class="row-title">${escapeHtml(row.title)}</span>
        </div>
        <div class="log-description">${escapeHtml(logDescription(row))}</div>
        <div class="row-meta">${escapeHtml(entityLabel(row.entity))} kaydı · ${escapeHtml(formatDateTime(row.created_at))} · ID: ${escapeHtml(row.item_id)}</div>
      </div>
    </div>`).join("") || `<div class="admin-empty">Henüz değişiklik kaydı yok.</div>`;
}

function actionLabel(action) {
  return { create: "Eklendi", update: "Güncellendi", delete: "Silindi" }[action] || action;
}

function entityLabel(entity) {
  return { announcement: "Duyuru", work: "Çalışma", link: "Bağlantı" }[entity] || entity;
}

function logDescription(row) {
  if (row.details) return row.details;
  const entity = entityLabel(row.entity).toLocaleLowerCase("tr-TR");
  const titleText = `"${row.title}"`;
  const timeText = formatDateTime(row.created_at);
  const actionText = {
    create: `${titleText} başlıklı ${entity} kaydı ${timeText} tarihinde panele eklendi ve sitede görünür hale getirildi.`,
    update: `${titleText} başlıklı ${entity} kaydı ${timeText} tarihinde güncellendi; başlık, tarih, açıklama, detay veya görsel alanlarında yapılan son düzenleme kayda işlendi.`,
    delete: `${titleText} başlıklı ${entity} kaydı ${timeText} tarihinde silindi; kayıt artık ilgili liste ve ana sayfa kartlarında gösterilmiyor.`,
  }[row.action];
  return actionText || `${titleText} kaydı için ${row.action} işlemi ${timeText} tarihinde işlendi.`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function resetForms() {
  Object.values(forms).forEach((form) => {
    form.reset();
    form.elements.id.value = "";
    if (form.elements.date) form.elements.date.value = todayText();
    form.querySelector("h2").textContent = form.id === "announcementForm" ? "Duyuru Ekle" : form.id === "workForm" ? "Çalışma Ekle" : "Bağlantı Ekle";
    form.querySelector(".btn-primary").textContent = form.id === "announcementForm" ? "Duyuru Ekle" : form.id === "workForm" ? "Çalışma Ekle" : "Bağlantı Ekle";
    form.querySelector("[data-action='cancel-edit']").classList.add("is-hidden");
    renderImagePreview(form);
  });
}

function setPanel(panel) {
  state.panel = panel;
  resetForms();
  title.textContent = labelForPanel();
  announcementForm.classList.toggle("is-hidden", panel !== "announcements");
  workForm.classList.toggle("is-hidden", panel !== "works");
  linkForm.classList.toggle("is-hidden", panel !== "links");
  list.classList.toggle("is-hidden", panel === "logs");
  auditList.classList.toggle("is-hidden", panel !== "logs");
  document.querySelector(".admin-content").classList.toggle("logs-mode", panel === "logs");
  document.querySelectorAll("[data-panel]").forEach((button) => button.classList.toggle("active", button.dataset.panel === panel));
  renderList();
}

function fillEditForm(item) {
  const form = forms[state.panel];
  if (!form) return;
  form.elements.id.value = item.id;
  form.querySelector("h2").textContent = `${labelForPanel()} Düzenle`;
  form.querySelector(".btn-primary").textContent = "Güncelle";
  form.querySelector("[data-action='cancel-edit']").classList.remove("is-hidden");

  if (state.panel === "announcements") {
    form.elements.title.value = item.title || "";
    form.elements.date.value = item.date || "";
    form.elements.description.value = item.description || "";
    form.elements.body.value = (item.body || []).join("\n");
    form.elements.images.value = (item.images || []).join("\n");
    renderImagePreview(form);
  }

  if (state.panel === "works") {
    form.elements.title.value = item.title || "";
    form.elements.date.value = item.date || "Güncel";
    form.elements.description.value = item.description || "";
    form.elements.completed.value = (item.completed || []).join("\n");
    form.elements.ongoing.value = (item.ongoing || []).join("\n");
    form.elements.images.value = (item.images || []).join("\n");
    renderImagePreview(form);
  }

  if (state.panel === "links") {
    form.elements.label.value = item.label || "";
    form.elements.url.value = item.url || "#";
    form.elements.kind.value = item.kind || "link";
    form.elements.icon_src.value = item.icon_src || "";
  }
}

function renderImagePreview(form) {
  const preview = previewForForm(form);
  if (!preview) return;
  try {
    const images = toLines(form.elements.images?.value || "");
    if (!images.length) {
      preview.innerHTML = `<div class="preview-empty">Seçilen detay görselleri burada görünecek.</div>`;
      preview.classList.add("is-empty");
      return;
    }

    preview.innerHTML = images.map((src, index) => `
      <figure class="preview-item">
        <img src="${escapeHtml(src)}" alt="Görsel ${index + 1}">
        <button class="preview-remove" type="button" data-remove-image="${index}" data-form-id="${escapeHtml(form.id)}" aria-label="Görseli kaldır">×</button>
      </figure>`).join("");
    preview.classList.remove("is-empty");
  } catch (err) {
    preview.innerHTML = `<div class="preview-empty" style="color:red">Error in renderImagePreview: ${err.message}</div>`;
    preview.classList.add("is-empty");
  }
}

function renderPendingImagePreview(form, files) {
  const preview = previewForForm(form);
  if (!preview) return;
  const previews = Array.from(files || []).map((file, index) => {
    const url = URL.createObjectURL(file);
    return `
      <figure class="preview-item preview-item-pending">
        <img src="${escapeHtml(url)}" alt="Seçilen görsel ${index + 1}" data-object-url="${escapeHtml(url)}">
        <figcaption>Yükleniyor</figcaption>
      </figure>`;
  });
  if (!previews.length) return;
  preview.innerHTML = previews.join("");
  preview.classList.remove("is-empty");
}

function previewForForm(form) {
  let preview = document.querySelector(`[data-preview-for='${form.id}']`);
  if (preview) return preview;
  const fileInput = form.querySelector("input[name='image_files']");
  if (!fileInput) return null;
  preview = document.createElement("div");
  preview.className = "image-preview is-empty";
  preview.dataset.previewFor = form.id;
  fileInput.closest(".file-label")?.after(preview);
  return preview;
}

async function handleDetailImagesChange(input) {
  const form = input.closest("form");
  if (!form || !form.elements.images) return;
  const files = Array.from(input.files || []);
  if (!files.length) return;
  renderPendingImagePreview(form, files);
  try {
    appendLines(form.elements.images, await filesToDataUrls(files));
    renderImagePreview(form);
  } catch (err) {
    const preview = previewForForm(form);
    if (preview) {
      preview.innerHTML = `<div class="preview-empty" style="color:red">Error in append/render: ${err.message}</div>`;
      preview.classList.add("is-empty");
    }
  } finally {
    input.value = "";
  }
}

function removeImage(form, index) {
  const images = toLines(form.elements.images.value);
  images.splice(index, 1);
  form.elements.images.value = images.join("\n");
  renderImagePreview(form);
}

function appendLines(textarea, values) {
  const existing = toLines(textarea.value);
  textarea.value = [...existing, ...values].join("\n");
}

function filesToDataUrls(files) {
  return Promise.all(Array.from(files || []).map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

async function refresh() {
  state.portal = await fetchPortal();
  renderList();
}

document.addEventListener("click", async (event) => {
  const panelButton = event.target.closest("[data-panel]");
  if (panelButton) {
    setPanel(panelButton.dataset.panel);
    return;
  }

  const cancelButton = event.target.closest("[data-action='cancel-edit']");
  if (cancelButton) {
    resetForms();
    return;
  }

  const removeImageButton = event.target.closest("[data-remove-image]");
  if (removeImageButton) {
    const form = document.querySelector(`#${removeImageButton.dataset.formId}`);
    if (form) removeImage(form, Number(removeImageButton.dataset.removeImage));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    const itemId = deleteButton.dataset.deleteId;
    const rowTitle = deleteButton.closest(".admin-list-row")?.querySelector(".row-title")?.textContent || "bu kayıt";
    const ok = window.confirm(`"${rowTitle}" kaydını silmek istediğinizden emin misiniz? Bu işlem loglanacaktır.`);
    if (!ok) return;
    if (state.panel === "announcements") await deleteAnnouncement(itemId);
    if (state.panel === "works") await deleteWork(itemId);
    if (state.panel === "links") await deleteLink(itemId);
    await refresh();
    resetForms();
    return;
  }

  const editRow = event.target.closest("[data-edit-id]");
  if (editRow && !event.target.closest("button")) {
    const item = itemsForPanel().find((entry) => entry.id === editRow.dataset.editId);
    if (item) fillEditForm(item);
  }
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("input[type='file'][name='image_files']");
  if (input) handleDetailImagesChange(input);
});

announcementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateDateInput(announcementForm.elements.date)) {
    announcementForm.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(announcementForm).entries());
  const payload = {
    title: data.title,
    date: data.date,
    badge: "",
    type: "default",
    description: data.description,
    body: toLines(data.body),
    images: toLines(data.images),
  };
  if (data.id) await updateAnnouncement(data.id, payload);
  else await createAnnouncement(payload);
  await refresh();
  resetForms();
});

workForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateDateInput(workForm.elements.date)) {
    workForm.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(workForm).entries());
  const payload = {
    title: data.title,
    date: data.date,
    badge: "",
    description: data.description,
    completed: toLines(data.completed),
    ongoing: toLines(data.ongoing),
    tags: [],
    images: toLines(data.images),
  };
  if (data.id) await updateWork(data.id, payload);
  else await createWork(payload);
  await refresh();
  resetForms();
});

linkForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(linkForm).entries());
  const payload = {
    label: data.label,
    url: data.url || "#",
    kind: data.kind || "link",
    icon_src: data.icon_src || "",
  };
  if (data.id) await updateLink(data.id, payload);
  else await createLink(payload);
  await refresh();
  resetForms();
});

[announcementForm, workForm].forEach((form) => {
  form.elements.date.addEventListener("input", (event) => {
    maskDateInput(event.target);
    validateDateInput(event.target);
  });
  form.elements.date.addEventListener("blur", (event) => validateDateInput(event.target));
  form.elements.images.addEventListener("input", () => renderImagePreview(form));
});

linkForm.elements.icon_file.addEventListener("change", async (event) => {
  const [dataUrl] = await filesToDataUrls(event.target.files);
  if (dataUrl) linkForm.elements.icon_src.value = dataUrl;
  event.target.value = "";
});

fetchPortal().then((portal) => {
  state.portal = portal;
  setPanel("announcements");
  resetForms();
});
