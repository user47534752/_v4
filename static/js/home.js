import { fetchPortal } from "./api.js";
import { escapeHtml, showToast } from "./utils.js";
import { bgLines, bindImageZoom, renderDetail } from "./ui.js?v=20260629-9";

const PARTICLE_SETTINGS = {
  gap: 28,
  linkGap: 22,
  waveSpeed: 0.00072,
  waveAmount: 10,
  mouseRadius: 96,
  mousePush: 0.12,
  returnSpeed: 0.0028,
  friction: 0.972,
  minSize: 0.45,
  randomSize: 1.35,
  glowSize: 1.2,
  glowRadius: 150,
  glowAlpha: 0.06,
};

const state = { portal: null, query: "", workOffset: 0, announcementOffset: 0 };

const els = {
  notificationCount: document.querySelector("#notificationCount"),
  profileInitials: document.querySelector("#profileInitials"),
  worksGrid: document.querySelector("#worksGrid"),
  announcementsGrid: document.querySelector("#announcementsGrid"),
  linksGrid: document.querySelector("#linksGrid"),
  footerInfo: document.querySelector("#footerInfo"),
  search: document.querySelector("#portalSearch"),
  searchClear: document.querySelector("#searchClear"),
  detailModal: document.querySelector("#detailModal"),
  modalContent: document.querySelector("#modalContent"),
  requestModal: document.querySelector("#requestModal"),
  requestForm: document.querySelector("#requestForm"),
  requestType: document.querySelector("#requestType"),
  workArrows: document.querySelectorAll("[data-action='slide-works']"),
  announcementArrows: document.querySelectorAll("[data-action='slide-announcements']"),
};

applyTheme(localStorage.getItem("portal-theme") || "light");

const linkIcons = {
  home: "⌂",
  database: "◎",
  calendar: "□",
  book: "▤",
  chat: "◌",
  user: "◇",
};

function matchesQuery(item) {
  const text = JSON.stringify(item).toLocaleLowerCase("tr-TR");
  return !state.query || text.includes(state.query);
}

function openDetail(item) {
  els.modalContent.innerHTML = renderDetail(item);
  els.detailModal.showModal();
}

function closeModal(dialog) {
  if (!dialog?.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  window.setTimeout(() => {
    dialog.classList.remove("is-closing");
    dialog.close();
  }, 180);
}

function renderWorks() {
  const pool = state.portal.works.filter(matchesQuery);
  state.workOffset = clampCarouselOffset(state.workOffset, pool.length);
  setCarouselPosition(els.worksGrid, state.workOffset);
  setArrowState(els.workArrows, state.workOffset, pool.length);
  const visibleCount = visibleCarouselCount();
  els.worksGrid.innerHTML = pool.map((work, index) => {
    const isVisible = index >= state.workOffset && index < state.workOffset + visibleCount;
    const hiddenAttrs = isVisible ? "" : ' style="visibility:hidden;opacity:0;pointer-events:none;" aria-hidden="true"';
    return `
    <article class="suite-section portal-summary-card ${isVisible ? "is-active-slide" : ""}" data-action="show-work" data-id="${work.id}"${hiddenAttrs}>
      <div class="suite-header active">
        <span class="suite-header-title">${escapeHtml(work.title)}</span>
        <span class="header-bg">${bgLines}</span>
      </div>
      <div class="suite-intro">
        <div class="suite-body">
          <div class="suite-body-text">${escapeHtml(work.description)}</div>
        </div>
      </div>
      <div class="suite-apps-section">
        <button class="document document-button" type="button" data-action="show-work" data-id="${work.id}">
          Detayı Gör
          <span class="card-footer-date">${escapeHtml(work.date || "Güncel")}</span>
        </button>
      </div>
    </article>`;
  }).join("");
  updateCarouselVisibility(els.worksGrid, state.workOffset, visibleCount);
}

function renderAnnouncements() {
  const pool = state.portal.announcements.filter(matchesQuery);
  state.announcementOffset = clampCarouselOffset(state.announcementOffset, pool.length);
  setCarouselPosition(els.announcementsGrid, state.announcementOffset);
  setArrowState(els.announcementArrows, state.announcementOffset, pool.length);
  const visibleCount = visibleCarouselCount();
  els.announcementsGrid.innerHTML = pool.map((item, index) => {
    const isVisible = index >= state.announcementOffset && index < state.announcementOffset + visibleCount;
    const hiddenAttrs = isVisible ? "" : ' style="visibility:hidden;opacity:0;pointer-events:none;" aria-hidden="true"';
    return `
    <article class="suite-section announcement-summary-card ${isVisible ? "is-active-slide" : ""}" data-action="show-announcement" data-id="${item.id}"${hiddenAttrs}>
      <div class="suite-header active">
        <span class="suite-header-title">${escapeHtml(item.title)}</span>
        <span class="header-bg">${bgLines}</span>
      </div>
      <div class="suite-intro">
        <div class="suite-body">
          <div class="suite-body-text">${escapeHtml(item.description)}</div>
        </div>
      </div>
      <div class="suite-apps-section">
        <button class="document document-button" type="button" data-action="show-announcement" data-id="${item.id}">
          Detayı Gör
          <span class="card-footer-date">${escapeHtml(item.date || "Güncel")}</span>
        </button>
      </div>
    </article>`;
  }).join("");
  updateCarouselVisibility(els.announcementsGrid, state.announcementOffset, visibleCount);
}

function maxCarouselOffset(itemCount) {
  return Math.max(0, itemCount - visibleCarouselCount());
}

function clampCarouselOffset(offset, itemCount) {
  return Math.min(Math.max(0, offset), maxCarouselOffset(itemCount));
}

function visibleCarouselCount() {
  return window.matchMedia("(max-width: 980px)").matches ? 1 : 3;
}

function setArrowState(arrows, offset, itemCount) {
  const maxOffset = maxCarouselOffset(itemCount);
  const visibleCount = visibleCarouselCount();
  arrows.forEach((arrow) => {
    const direction = Number(arrow.dataset.direction);
    const disabled = itemCount <= visibleCount || (direction < 0 ? offset <= 0 : offset >= maxOffset);
    arrow.disabled = disabled;
    arrow.classList.toggle("is-disabled", disabled);
    arrow.hidden = itemCount <= visibleCount;
  });
}

function setCarouselPosition(grid, offset) {
  grid.style.setProperty("--carousel-offset", String(offset));
}

function updateCarouselVisibility(grid, offset, visibleCount) {
  Array.from(grid.children).forEach((child, index) => {
    const isVisible = index >= offset && index < offset + visibleCount;
    child.classList.toggle("is-active-slide", isVisible);
    child.toggleAttribute("aria-hidden", !isVisible);
    child.style.setProperty("visibility", isVisible ? "visible" : "hidden", "important");
    child.style.setProperty("opacity", isVisible ? "1" : "0", "important");
    child.style.setProperty("pointer-events", isVisible ? "auto" : "none", "important");
  });
}

function slide(kind, direction) {
  const key = kind === "works" ? "workOffset" : "announcementOffset";
  const items = kind === "works" ? state.portal.works.filter(matchesQuery) : state.portal.announcements.filter(matchesQuery);
  if (items.length <= visibleCarouselCount()) return;
  const grid = kind === "works" ? els.worksGrid : els.announcementsGrid;
  const nextOffset = clampCarouselOffset(state[key] + direction, items.length);
  if (nextOffset === state[key]) return;

  state[key] = nextOffset;
  setCarouselPosition(grid, nextOffset);
  
  const visibleCount = visibleCarouselCount();
  updateCarouselVisibility(grid, nextOffset, visibleCount);
  
  setArrowState(kind === "works" ? els.workArrows : els.announcementArrows, nextOffset, items.length);
}

function renderLinks() {
  const links = state.portal.links.filter(matchesQuery);
  els.linksGrid.innerHTML = links.map((link) => `
    <button class="link-card" type="button" data-action="open-link" data-id="${link.id}">
      <div class="link-icon">${link.icon_src ? `<img src="${escapeHtml(link.icon_src)}" alt="">` : linkIcons[link.kind] || "↗"}</div>
      <span class="link-label">${escapeHtml(link.label)}</span>
    </button>`).join("");
}

function renderMeta() {
  const meta = state.portal.meta;
  if (els.notificationCount) els.notificationCount.textContent = state.portal.announcements.length;
  if (els.profileInitials) els.profileInitials.textContent = meta.profile;
  els.footerInfo.innerHTML = `Sorunlarınız ve geri bildirimleriniz için bize <a class="footer-link" href="mailto:${escapeHtml(meta.contact_email)}">${escapeHtml(meta.contact_email)}</a> adresinden ulaşabilirsiniz.`;
  els.requestType.innerHTML = state.portal.request_types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("");
}

function renderAll() {
  renderMeta();
  renderWorks();
  renderAnnouncements();
  renderLinks();
  bindCardHoverFields();
}

function runSearch() {
  state.query = els.search.value.toLocaleLowerCase("tr-TR").trim();
  state.workOffset = 0;
  state.announcementOffset = 0;
  renderWorks();
  renderAnnouncements();
  renderLinks();
  bindCardHoverFields();
  showToast(state.query ? "Arama tamamlandı." : "Arama temizlendi.");
}

function resetSearch() {
  els.search.value = "";
  state.query = "";
  state.workOffset = 0;
  state.announcementOffset = 0;
  els.searchClear.classList.remove("is-visible");
  renderWorks();
  renderAnnouncements();
  renderLinks();
  bindCardHoverFields();
}

function bindCardHoverFields() {
  document.querySelectorAll(".suite-section, .link-card").forEach((card) => {
    if (card.dataset.hoverBound) return;
    card.dataset.hoverBound = "true";
    attachParticleField(card);
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
    });
  });
}

function attachParticleField(card) {
  const canvas = document.createElement("canvas");
  canvas.className = "card-particles";
  canvas.setAttribute("aria-hidden", "true");
  card.prepend(canvas);

  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  const palette = [
    "rgba(0,48,135,.55)",
    "rgba(59,130,246,.46)",
    "rgba(147,197,253,.52)",
    "rgba(255,86,32,.38)",
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
  let running = false;

  function resize() {
    const rect = card.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  function buildParticles() {
    particles = [];
    const gap = card.classList.contains("link-card") ? PARTICLE_SETTINGS.linkGap : PARTICLE_SETTINGS.gap;
    const topInset = card.classList.contains("suite-section") ? 58 : 0;
    for (let y = topInset + 10; y < height - 10; y += gap) {
      for (let x = 12; x < width - 12; x += gap) {
        particles.push({
          ox: x + (Math.random() - .5) * 14,
          oy: y + (Math.random() - .5) * 14,
          x: x + (Math.random() - .5) * 14,
          y: y + (Math.random() - .5) * 14,
          vx: 0,
          vy: 0,
          size: Math.random() * PARTICLE_SETTINGS.randomSize + PARTICLE_SETTINGS.minSize,
          wave: Math.random() * 100,
          color: palette[Math.floor(Math.random() * palette.length)],
        });
      }
    }
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    const t = Date.now() * PARTICLE_SETTINGS.waveSpeed;
    particles.forEach((particle) => {
      const targetX = particle.ox + Math.sin(t + particle.oy * .016 + particle.wave) * PARTICLE_SETTINGS.waveAmount;
      const targetY = particle.oy + Math.cos(t + particle.ox * .016 + particle.wave) * PARTICLE_SETTINGS.waveAmount;
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.hypot(dx, dy);
      if (distance < PARTICLE_SETTINGS.mouseRadius) {
        const force = (PARTICLE_SETTINGS.mouseRadius - distance) / PARTICLE_SETTINGS.mouseRadius;
        const angle = Math.atan2(dy, dx);
        particle.vx -= Math.cos(angle) * force * PARTICLE_SETTINGS.mousePush;
        particle.vy -= Math.sin(angle) * force * PARTICLE_SETTINGS.mousePush;
      }
      particle.vx += (targetX - particle.x) * PARTICLE_SETTINGS.returnSpeed;
      particle.vy += (targetY - particle.y) * PARTICLE_SETTINGS.returnSpeed;
      particle.vx *= PARTICLE_SETTINGS.friction;
      particle.vy *= PARTICLE_SETTINGS.friction;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const glow = Math.max(0, 1 - distance / PARTICLE_SETTINGS.glowRadius);
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size + glow * PARTICLE_SETTINGS.glowSize, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
      if (glow > 0) {
        ctx.fillStyle = `rgba(255,255,255,${glow * PARTICLE_SETTINGS.glowAlpha})`;
        ctx.fill();
      }
    });
    frame = requestAnimationFrame(tick);
  }

  card.addEventListener("pointerenter", () => {
    resize();
    running = true;
    cancelAnimationFrame(frame);
    tick();
  });

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });

  card.addEventListener("pointerleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
    window.setTimeout(() => {
      running = false;
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    }, 220);
  });

  window.addEventListener("resize", resize);
}

function handleAction(target) {
  const action = target.dataset.action;
  if (action === "toggle-theme") toggleTheme();
  if (action === "scroll-announcements") document.querySelector("#duyurular").scrollIntoView({ behavior: "smooth" });
  if (action === "run-search") runSearch();
  if (action === "slide-works") slide("works", Number(target.dataset.direction));
  if (action === "slide-announcements") slide("announcements", Number(target.dataset.direction));
  if (action === "open-page") window.location.href = target.dataset.page;
  if (action === "open-request") els.requestModal.showModal();
  if (action === "close-request") els.requestModal.close();
  if (action === "show-work") openDetail(state.portal.works.find((item) => item.id === target.dataset.id));
  if (action === "show-announcement") openDetail(state.portal.announcements.find((item) => item.id === target.dataset.id));
  if (action === "show-api") openDetail({ title: "API Bilgisi", description: "Bu portal FastAPI servisleriyle çalışır. Yönetim paneli /admin adresindedir." });
  if (action === "open-bookmarks") showToast("Bağlantılar alanı güncel kısayolları içerir.");
  if (action === "open-link") {
    const link = state.portal.links.find((item) => item.id === target.dataset.id);
    if (link?.url && link.url !== "#") window.open(link.url, "_blank", "noopener,noreferrer");
    else showToast("Bağlantı için henüz URL tanımlanmamış.");
  }
}

function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
  document.querySelector("[data-action='toggle-theme']")?.setAttribute("aria-pressed", String(theme === "dark"));
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
  localStorage.setItem("portal-theme", nextTheme);
  applyTheme(nextTheme);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (target) handleAction(target);
});

document.querySelectorAll(".modal").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeModal(dialog);
  });

  dialog.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal(dialog);
    });
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModal(dialog);
  });
});

bindImageZoom(els.detailModal);

els.search.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});

els.search.addEventListener("input", () => {
  els.searchClear.classList.toggle("is-visible", Boolean(els.search.value));
  if (!els.search.value && state.query) resetSearch();
});

els.searchClear.addEventListener("click", () => {
  resetSearch();
});

window.addEventListener("resize", () => {
  if (!state.portal) return;
  renderWorks();
  renderAnnouncements();
  bindCardHoverFields();
});

els.requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(els.requestForm).entries());
  const response = await fetch("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    showToast("Talep gönderilemedi.");
    return;
  }
  const data = await response.json();
  els.requestForm.reset();
  els.requestModal.close();
  showToast(`Talebiniz alındı: ${data.ticket.id}`);
});

fetchPortal().then((portal) => {
  applyTheme(localStorage.getItem("portal-theme") || "light");
  state.portal = portal;
  renderAll();
}).catch(() => showToast("Portal verisi yüklenemedi."));
