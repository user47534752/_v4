import { fetchPortal } from "./api.js";
import { escapeHtml, showToast } from "./utils.js";
import { bindImageZoom, renderDetail } from "./ui.js?v=20260629-9";

const PARTICLE_SETTINGS = {
  gap: 28,
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

const script = document.querySelector("script[src*='listing.js']");
const pathKind = location.pathname.includes("announcements") ? "announcements" : "works";
const kind = script?.dataset.kind || pathKind;
const grid = document.querySelector("#listingGrid");
const modal = document.querySelector("#detailModal");
const modalContent = document.querySelector("#modalContent");

function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
}

applyTheme(localStorage.getItem("portal-theme") || "light");

function closeModal(dialog) {
  if (!dialog?.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  window.setTimeout(() => {
    dialog.classList.remove("is-closing");
    dialog.close();
  }, 180);
}

function card(item) {
  return `
    <button class="listing-card" type="button" data-id="${item.id}">
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description)}</p>
      <span class="listing-date">${escapeHtml(item.date || "Güncel")}</span>
    </button>`;
}

function bindCardHoverFields() {
  document.querySelectorAll(".listing-card").forEach((cardItem) => {
    if (cardItem.dataset.hoverBound) return;
    cardItem.dataset.hoverBound = "true";
    attachParticleField(cardItem);
    cardItem.addEventListener("pointermove", (event) => {
      const rect = cardItem.getBoundingClientRect();
      cardItem.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
      cardItem.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
    });
  });
}

function attachParticleField(cardItem) {
  const canvas = document.createElement("canvas");
  canvas.className = "card-particles";
  canvas.setAttribute("aria-hidden", "true");
  cardItem.prepend(canvas);

  const ctx = canvas.getContext("2d");
  const mouse = { x: -9999, y: -9999 };
  const palette = ["rgba(0,48,135,.55)", "rgba(59,130,246,.46)", "rgba(147,197,253,.52)", "rgba(255,86,32,.38)"];
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
  let running = false;

  function resize() {
    const rect = cardItem.getBoundingClientRect();
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
    for (let y = 12; y < height - 10; y += PARTICLE_SETTINGS.gap) {
      for (let x = 12; x < width - 12; x += PARTICLE_SETTINGS.gap) {
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

  cardItem.addEventListener("pointerenter", () => {
    resize();
    running = true;
    cancelAnimationFrame(frame);
    tick();
  });

  cardItem.addEventListener("pointermove", (event) => {
    const rect = cardItem.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });

  cardItem.addEventListener("pointerleave", () => {
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

fetchPortal().then((portal) => {
  const items = kind === "announcements" ? portal.announcements : portal.works;
  grid.innerHTML = items.map(card).join("");
  bindCardHoverFields();
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const item = items.find((entry) => entry.id === button.dataset.id);
    modalContent.innerHTML = renderDetail(item);
    modal.showModal();
  });
}).catch(() => showToast("Liste yüklenemedi."));

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal(modal);
});

modal.querySelectorAll(".modal-close").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeModal(modal);
  });
});

modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal(modal);
});

bindImageZoom(modal);
