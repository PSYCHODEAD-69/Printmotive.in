/* ============================================================
   PRINTMOTIVE — script.js
   ============================================================ */

/* ── APNA WHATSAPP NUMBER YAHAN DAALO ── */
const WA_NUMBER  = "916267159304"; // e.g. "919876543210"
const BRAND_NAME = "PrintMotive";
const WEBSITE    = "printmotive.in";

/* ══════════════════════════════════════
   WHATSAPP
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

function orderProduct(el) {
  const product = el.dataset.product || "Custom Product";
  const price   = el.dataset.price   || "Contact for pricing";
  const desc    = el.dataset.desc    || "Custom print order";
  addRipple(el);
  showToast("Opening WhatsApp...");
  setTimeout(() => window.open(buildWALink(product, price, desc), "_blank"), 360);
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
