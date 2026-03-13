/* ============================================================
   PRINTMOTIVE — script.js
   ============================================================ */

/* ── CONFIG ── */
const WA_NUMBER  = "916267159304";
const EMAIL      = "printmotive.in@gmail.com";
const BRAND_NAME = "PrintMotive";
const WEBSITE    = "printmotive.in";

/* ══════════════════════════════════════
   LINK BUILDERS
   ══════════════════════════════════════ */
function buildWALink(product, price, desc) {
  const msg = [
    `Hello ${BRAND_NAME}!`,
    ``,
    `I want to place an order for:`,
    `Product: ${product}`,
    `Starting Price: ${price}`,
    `Details: ${desc}`,
    ``,
    `Please help me with customisation and order details.`,
    ``,
    `(Sent from ${WEBSITE})`
  ].join("\n");
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function buildEmailLink(product, price, desc) {
  const subject = `Order Enquiry: ${product} — ${BRAND_NAME}`;
  const body = [
    `Hello ${BRAND_NAME},`,
    ``,
    `I would like to place an order for the following:`,
    ``,
    `Product     : ${product}`,
    `Starting Price : ${price}`,
    `Details     : ${desc}`,
    ``,
    `Please share customisation options and confirm the order.`,
    ``,
    `Thank you!`,
    ``,
    `(Sent from ${WEBSITE})`
  ].join("\n");
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildGeneralWALink() {
  const msg = [
    `Hello ${BRAND_NAME}!`,
    ``,
    `I'd like to enquire about your custom printing services.`,
    `Please help me get started!`,
    ``,
    `(Sent from ${WEBSITE})`
  ].join("\n");
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/* ══════════════════════════════════════
   ORDER POPUP MODAL
   ══════════════════════════════════════ */
function orderProduct(el) {
  const product = el.dataset.product || "Custom Product";
  const price   = el.dataset.price   || "Contact for pricing";
  const desc    = el.dataset.desc    || "Custom print order";
  addRipple(el);
  showOrderModal(product, price, desc);
}

function showOrderModal(product, price, desc) {
  // Remove existing modal
  const old = document.getElementById("pm-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "pm-modal";
  modal.innerHTML = `
    <div class="pm-modal-backdrop"></div>
    <div class="pm-modal-box">
      <button class="pm-modal-close" aria-label="Close">&times;</button>
      <div class="pm-modal-tag">Place Your Order</div>
      <div class="pm-modal-product">${product}</div>
      <div class="pm-modal-price">${price}</div>
      <p class="pm-modal-desc">Choose how you'd like to connect with us:</p>
      <div class="pm-modal-btns">
        <a href="${buildWALink(product, price, desc)}" target="_blank" class="pm-btn-wa" id="pmBtnWA">
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Order via WhatsApp
        </a>
        <a href="${buildEmailLink(product, price, desc)}" class="pm-btn-email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Order via Email
        </a>
      </div>
      <div class="pm-modal-or"><span>or</span></div>
      <a href="https://instagram.com/printmotive.in" target="_blank" class="pm-btn-ig">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        DM on Instagram
      </a>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => modal.classList.add("pm-modal-open"));
  });

  // Close handlers
  function closeModal() {
    modal.classList.remove("pm-modal-open");
    document.body.style.overflow = "";
    setTimeout(() => modal.remove(), 300);
  }

  modal.querySelector(".pm-modal-backdrop").addEventListener("click", closeModal);
  modal.querySelector(".pm-modal-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", esc); }
  });

  // Close modal after redirect
  modal.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => setTimeout(closeModal, 400));
  });
}

/* ══════════════════════════════════════
   WA LINK INIT
   ══════════════════════════════════════ */
function initWALinks() {
  const general = buildGeneralWALink();
  ["floatWA", "waGeneralBtn", "footerWA", "footerWA2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = general;
  });
}

/* ══════════════════════════════════════
   TOAST
   ══════════════════════════════════════ */
let _toastTimer;
function showToast(msg) {
  let t = document.getElementById("pm-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "pm-toast"; t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ══════════════════════════════════════
   RIPPLE
   ══════════════════════════════════════ */
function addRipple(el) {
  const old = el.querySelector(".pm-ripple");
  if (old) old.remove();
  const r = document.createElement("span");
  r.className = "pm-ripple";
  Object.assign(r.style, {
    position:"absolute", borderRadius:"50%",
    background:"rgba(255,255,255,0.3)",
    width:"160px", height:"160px",
    top:"50%", left:"50%",
    transform:"translate(-50%,-50%) scale(0)",
    animation:"pmRipple 0.5s ease-out forwards",
    pointerEvents:"none", zIndex:"10"
  });
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.style.overflow = "hidden";
  el.appendChild(r);
  setTimeout(() => r.remove(), 520);
}

/* ══════════════════════════════════════
   NAVBAR SCROLL
   ══════════════════════════════════════ */
function initNavbar() {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  const update = () => nav.classList.toggle("scrolled", window.scrollY > 50);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ══════════════════════════════════════
   HAMBURGER DRAWER  ← fully rebuilt
   ══════════════════════════════════════ */
function initHamburger() {
  const btn      = document.getElementById("hamburger");
  const drawer   = document.getElementById("drawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const closeBtn = document.getElementById("drawerClose");

  if (!btn || !drawer || !backdrop) return;

  function open() {
    drawer.classList.add("open");
    backdrop.classList.add("open");
    btn.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    btn.classList.remove("open");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => {
    drawer.classList.contains("open") ? close() : open();
  });

  backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);

  // Close on any drawer link click
  document.querySelectorAll(".dl").forEach(a => a.addEventListener("click", close));

  // ESC key
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") close();
  });
}

/* ══════════════════════════════════════
   SCROLL REVEAL
   ══════════════════════════════════════ */
function initScrollReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".fade-up").forEach(el => io.observe(el));

  // Steps
  const stepsIO = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      document.querySelectorAll(".step-card").forEach(c => c.classList.add("visible"));
      stepsIO.disconnect();
    }
  }, { threshold: 0.15 });
  const sg = document.querySelector(".steps-grid");
  if (sg) stepsIO.observe(sg);
}

/* ══════════════════════════════════════
   MARQUEE DUPLICATE
   ══════════════════════════════════════ */
function initMarquee() {
  const m = document.getElementById("marquee");
  if (m) m.innerHTML += m.innerHTML;
}

/* ══════════════════════════════════════
   SMOOTH SCROLL
   ══════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - 72,
        behavior: "smooth"
      });
    });
  });
}

/* ══════════════════════════════════════
   COUNTER ANIMATION
   ══════════════════════════════════════ */
function animateCount(el, target, suffix) {
  let start;
  const dur = 1500;
  const step = ts => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initCounters() {
  let done = false;
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !done) {
      done = true;
      document.querySelectorAll(".stat-num[data-target]").forEach(el => {
        animateCount(el, parseInt(el.dataset.target), el.dataset.suffix || "");
      });
      io.disconnect();
    }
  }, { threshold: 0.5 });
  const hero = document.getElementById("hero");
  if (hero) io.observe(hero);
}

/* ══════════════════════════════════════
   PRODUCT CARD TILT
   ══════════════════════════════════════ */
function initCardTilt() {
  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `translateY(-8px) rotateY(${x*6}deg) rotateX(${-y*6}deg)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ══════════════════════════════════════
   BOOT
   ══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initWALinks();
  initNavbar();
  initHamburger();
  initScrollReveal();
  initMarquee();
  initSmoothScroll();
  initCounters();
  initCardTilt();
  console.log("%cPrintMotive loaded!", "color:#ff4d2e;font-weight:bold;font-size:14px");
  console.log("%cSet WA_NUMBER in script.js line 8", "color:#ffb300");
});
