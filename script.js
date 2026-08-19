/* ============================================================
   PRINTMOTIVE — script.js  (Updated: Dynamic Products + API)
   ============================================================ */

/* ── CONFIG ── */
const WA_NUMBER  = "916267159304";
const EMAIL      = "printmotive.in@gmail.com";
const BRAND_NAME = "PrintMotive.in";
const WEBSITE    = "printmotive.in";

/* ── API URL — Replace with your Cloudflare Worker URL ── */
const PM_API = "https://printmotive-worker.devpandey618.workers.dev";

/* ══════════════════════════════════════
   PRODUCTS — Dynamic load from API
   ══════════════════════════════════════ */
let allProducts     = [];
let allCategories    = [];
let currentCategory = "all";
let searchQuery      = "";
let priceFilter       = null; // { min, max } or null for no filter

async function loadProducts() {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch(`${PM_API}/api/products`),
      fetch(`${PM_API}/api/categories`),
    ]);
    const products   = await prodRes.json();
    const categories = await catRes.json();
    allProducts    = Array.isArray(products) ? products : [];
    allCategories  = Array.isArray(categories) ? categories : [];
    renderCategoryTabs();
    renderProducts(allProducts);
    updateCategoryBadges(allProducts);
  } catch (err) {
    console.error("Failed to load products:", err);
    document.getElementById("productsGrid").innerHTML = "";
    document.getElementById("noProducts").style.display = "block";
    document.getElementById("noProducts").innerHTML =
      `<p style="font-size:1.1rem;">Could not load products. Please refresh.</p>`;
  }
}

/* Renders category filter tabs dynamically from the categories API,
   so adding/renaming/deleting a category in the admin panel is
   reflected here automatically — no HTML edits needed. */
function renderCategoryTabs() {
  const wrap = document.getElementById("catGrid");
  if (!wrap) return;

  const allImg = "https://assets.psychodead.qzz.io/products/file_00000000b1bc81fab2b710fe275cabf7.png";
  const placeholderImg = "https://via.placeholder.com/60?text=%20";

  const tabsHtml = [`
    <button class="cat-card ${currentCategory === 'all' ? 'active' : ''}" data-cat="all" onclick="filterCategory('all')">
      <div class="cat-img-wrap"><img src="${allImg}" alt="All"/></div>
      <div class="cat-name">All</div>
      <span class="cat-badge" id="badge-all">0</span>
    </button>
  `].concat(allCategories.map(c => `
    <button class="cat-card ${currentCategory === c.id ? 'active' : ''}" data-cat="${escapeHtml(c.id)}" onclick="filterCategory('${escapeHtml(c.id)}')">
      <div class="cat-img-wrap"><img src="${escapeHtml(c.image || placeholderImg)}" alt="${escapeHtml(c.label)}" onerror="this.src='${placeholderImg}'"/></div>
      <div class="cat-name">${escapeHtml(c.label)}</div>
      <span class="cat-badge" id="badge-${escapeHtml(c.id)}">0</span>
    </button>
  `));

  wrap.innerHTML = tabsHtml.join("");
}

function renderProducts(products) {
  const grid      = document.getElementById("productsGrid");
  const noProds   = document.getElementById("noProducts");
  if (!grid) return;

  let filtered = currentCategory === "all"
    ? products
    : products.filter(p => p.category === currentCategory);

  // Search: matches product name or description (case-insensitive)
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }

  // Price filter: uses priceNum (numeric price stored by the backend)
  if (priceFilter) {
    filtered = filtered.filter(p => {
      const price = p.priceNum ?? (parseInt(String(p.price || "0").replace(/[^0-9]/g, "")) || 0);
      const aboveMin = priceFilter.min == null || price >= priceFilter.min;
      const belowMax = priceFilter.max == null || price <= priceFilter.max;
      return aboveMin && belowMax;
    });
  }

  if (!filtered.length) {
    grid.innerHTML   = "";
    noProds.style.display = "block";
    return;
  }
  noProds.style.display = "none";

  grid.innerHTML = filtered.map(p => `
    <div class="product-card fade-up ${p.inStock === false ? "pc-oos" : ""}" data-cat="${p.category}" data-id="${p.id}" onclick="openProductDetail('${escapeHtml(p.id)}', event)">
      ${p.badge ? `<div class="pc-badge">${p.badge}</div>` : ""}
      ${p.inStock === false ? `<div class="pc-badge-oos">Out of Stock</div>` : ""}
      <div class="pc-img-wrap">
       <div class="pc-media-carousel" data-product-id="${escapeHtml(p.id)}" data-media='${escapeHtml(JSON.stringify(
         Array.isArray(p.media) && p.media.length
           ? p.media
           : (p.imageUrl ? [{ url: p.imageUrl, type: 'image' }] : [])
       ))}'>
  <div class="pc-media-track">
    ${(
      Array.isArray(p.media) && p.media.length
        ? p.media
        : (p.imageUrl ? [{ url: p.imageUrl, type: 'image' }] : [])
    ).map((m, index) => {
      if (m.type === 'video') {
        return `
          <div class="pc-media-item ${index === 0 ? 'active' : ''}" style="position:relative; width:100%; height:100%;">
            <video
              class="pc-media-video"
              src="${escapeHtml(m.url)}"
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
              onclick="event.stopPropagation(); openMediaLightbox('${escapeHtml(p.id)}', ${index})">
            </video>
            <button class="pc-mute-btn" type="button" onclick="event.stopPropagation(); toggleMediaMute(this)">${muteIconSvg(true)}</button>
          </div>
        `;
      }

      return `
        <img
          class="pc-media-item ${index === 0 ? 'active' : ''}"
          src="${escapeHtml(m.url)}"
          alt="${escapeHtml(p.name)}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
          onclick="event.stopPropagation(); openMediaLightbox('${escapeHtml(p.id)}', ${index})"
        />
      `;
    }).join("")}
  </div>

  ${
    Array.isArray(p.media) && p.media.length > 1
      ? `
        <button class="pc-media-prev" type="button" onclick="event.stopPropagation(); changeProductMedia('${escapeHtml(p.id)}', -1)">${chevronSvg('left')}</button>
        <button class="pc-media-next" type="button" onclick="event.stopPropagation(); changeProductMedia('${escapeHtml(p.id)}', 1)">${chevronSvg('right')}</button>
      `
      : ''
  }
</div> 
      </div>
      <div class="pc-body">
        <div class="pc-cat">${categoryLabel(p.category)}</div>
        <div class="pc-name">${escapeHtml(p.name)}</div>
        ${p.description ? `<div class="pc-desc">${escapeHtml(p.description)}</div>` : ""}
        <div class="pc-price-row">
          <span class="pc-price">${escapeHtml(p.price)}</span>
          <span class="pc-price-tag">Starting price</span>
        </div>
        <div class="pc-btns">
          <button class="pc-btn-cart"
            data-product="${escapeHtml(p.name)}"
            data-price="${escapeHtml(p.price)}"
            data-desc="${escapeHtml(p.description || p.name)}"
            data-id="${escapeHtml(p.id)}"
            ${p.inStock === false ? "disabled" : ""}
            onclick="event.stopPropagation(); handleCardAddToCart(this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ${p.inStock === false ? "Out of Stock" : "Add to Cart"}
          </button>
          <button class="pc-btn-order"
            data-product="${escapeHtml(p.name)}"
            data-price="${escapeHtml(p.price)}"
            data-desc="${escapeHtml(p.description || p.name)}"
            data-id="${escapeHtml(p.id)}"
            ${p.inStock === false ? "disabled" : ""}
            onclick="event.stopPropagation(); handleCardOrderNow(this)">
            Order Now
          </button>
        </div>
      </div>
    </div>
  `).join("");

  // Re-init tilt and scroll reveal on new cards
  initCardTilt();
  initScrollReveal();
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".cat-card").forEach(c => {
    c.classList.toggle("active", c.dataset.cat === cat);
  });
  renderProducts(allProducts);
}

function updateCategoryBadges(products) {
  const counts = { all: products.length };
  products.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });
  Object.entries(counts).forEach(([cat, count]) => {
    const badge = document.getElementById(`badge-${cat}`);
    if (badge) badge.textContent = count;
  });
}

/* Looks up a category's display label from the dynamic categories list
   (loaded from the API). Falls back to the raw id if not found — e.g.
   for a category that was later deleted but still on an old product. */
function categoryLabel(cat) {
  const found = allCategories.find(c => c.id === cat);
  return found ? found.label : cat;
}

/* ══════════════════════════════════════
   SEARCH — matches product name or description
   ══════════════════════════════════════ */
function handleProductSearch(value) {
  searchQuery = value || "";
  renderProducts(allProducts);
}

/* ══════════════════════════════════════
   PRICE FILTER — presets + custom range
   ══════════════════════════════════════ */
function applyPricePreset(min, max, btnEl) {
  priceFilter = { min, max };
  document.querySelectorAll(".price-preset-btn").forEach(b => b.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");

  // Sync the slider to reflect the preset's upper bound (min is always 0 for the slider)
  const slider = document.getElementById("priceMaxSlider");
  if (slider) slider.value = max ?? slider.max;
  updatePriceSliderLabel(max ?? (slider ? slider.max : 2000));

  renderProducts(allProducts);
}

// Live label update while dragging — does not apply the filter yet
function handlePriceSliderInput(value) {
  updatePriceSliderLabel(value);
}

function updatePriceSliderLabel(value) {
  const label = document.getElementById("priceSliderValue");
  if (label) label.textContent = `Up to ₹${Number(value)}`;
}

// Applies the filter once the user releases the slider (or on change)
function applyPriceSliderRange(value) {
  const max = Number(value);
  priceFilter = { min: 0, max };
  document.querySelectorAll(".price-preset-btn").forEach(b => b.classList.remove("active"));
  updatePriceSliderLabel(max);
  renderProducts(allProducts);
}

function clearPriceFilter() {
  priceFilter = null;
  const slider = document.getElementById("priceMaxSlider");
  if (slider) slider.value = slider.max;
  updatePriceSliderLabel(slider ? slider.max : 2000);
  document.querySelectorAll(".price-preset-btn").forEach(b => b.classList.remove("active"));
  renderProducts(allProducts);
}

function toggleFilterPanel() {
  const panel = document.getElementById("filterPanel");
  if (!panel) return;
  panel.classList.toggle("open");
}

/* ══════════════════════════════════════
   FEATURED REVIEWS — Latest 3 on homepage
   ══════════════════════════════════════ */
async function loadFeaturedReviews() {
  const container = document.getElementById("featuredReviews");
  if (!container) return;

  try {
    const res     = await fetch(`${PM_API}/api/reviews`);
    const reviews = await res.json();
    const latest  = (Array.isArray(reviews) ? reviews : []).slice(0, 3);

    if (!latest.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">
          <p>No reviews yet. <a href="reviews.html?focus=add" style="color:var(--accent);">Be the first to review!</a></p>
        </div>`;
      return;
    }

    container.innerHTML = latest.map(r => {
      const stars    = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      const initials = r.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const date     = new Date(r.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });

      // Normalize media: new `media` array, or fall back to legacy single mediaUrl fields
      const mediaList = Array.isArray(r.media) && r.media.length
        ? r.media
        : (r.mediaUrl ? [{ url: r.mediaUrl, type: r.mediaType || "image" }] : []);

      // Media preview button if review has attachment(s)
      let mediaBtn = "";
      if (mediaList.length) {
        const hasVideo = mediaList.some(m => m.type === "video");
        const label = mediaList.length > 1
          ? `View ${hasVideo ? "Media" : "Photos"} (${mediaList.length})`
          : (mediaList[0].type === "video" ? "View Video" : "View Photo");
        const icon = hasVideo
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        mediaBtn = `<button class="tc-media-btn" data-media='${escapeHtml(JSON.stringify(mediaList))}' onclick="openFeaturedMedia(JSON.parse(this.dataset.media))">
          ${icon}
          ${label}
        </button>`;
      }

      return `
        <div class="testi-card fade-up">
          <div class="tc-stars">${stars}</div>
          <p class="tc-text">"${escapeHtml(r.text)}"</p>
          ${mediaBtn}
          <div class="tc-author">
            <div class="tc-avatar">${initials}</div>
            <div>
              <div class="tc-name">${escapeHtml(r.name)}</div>
              <div class="tc-date">${date}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    initScrollReveal();
  } catch {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted);">
        <p>Could not load reviews.</p>
      </div>`;
  }
}

/* ══════════════════════════════════════
   FEATURED REVIEW MEDIA LIGHTBOX
   ══════════════════════════════════════ */
let fmMediaList  = [];
let fmMediaIndex = 0;

function openFeaturedMedia(media) {
  // Accept either a full media array, or (for any old inline callers) a single {url,type}
  fmMediaList  = Array.isArray(media) ? media : [media];
  fmMediaIndex = 0;
  if (!fmMediaList.length) return;

  const old = document.getElementById("pm-media-lb");
  if (old) old.remove();

  const lb = document.createElement("div");
  lb.id = "pm-media-lb";
  lb.className = "pm-media-lb";

  lb.innerHTML = `
    <button class="pm-lb-close" type="button" aria-label="Close">&times;</button>
    <button class="pm-lb-nav pm-lb-prev" type="button" aria-label="Previous">${chevronSvg('left')}</button>
    <div class="pm-lb-content"></div>
    <button class="pm-lb-nav pm-lb-next" type="button" aria-label="Next">${chevronSvg('right')}</button>
  `;

  document.body.appendChild(lb);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => lb.classList.add("open"));

  renderFeaturedMedia();

  const closeBtn = lb.querySelector(".pm-lb-close");
  const prevBtn  = lb.querySelector(".pm-lb-prev");
  const nextBtn  = lb.querySelector(".pm-lb-next");

  function close() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => lb.remove(), 250);
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") changeFeaturedMedia(1);
    if (e.key === "ArrowLeft") changeFeaturedMedia(-1);
  }

  closeBtn.addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  prevBtn.addEventListener("click", () => changeFeaturedMedia(-1));
  nextBtn.addEventListener("click", () => changeFeaturedMedia(1));
  document.addEventListener("keydown", onKey);
}

function renderFeaturedMedia() {
  const lb = document.getElementById("pm-media-lb");
  if (!lb) return;
  const content = lb.querySelector(".pm-lb-content");
  const m = fmMediaList[fmMediaIndex];
  if (!m) return;

  // No native `controls` on the video — a custom mute button is used
  // instead, so the browser's own play/seek/fullscreen UI never shows.
  content.innerHTML = m.type === "video"
    ? `<video id="fmVideo" src="${escapeHtml(m.url)}" autoplay muted loop playsinline></video>
       <button id="fmMuteBtn" class="pm-lb-mute-btn" type="button">${muteIconSvg(true)}</button>`
    : `<img src="${escapeHtml(m.url)}" alt="">`;

  if (m.type === "video") {
    const muteBtn = content.querySelector("#fmMuteBtn");
    const video   = content.querySelector("#fmVideo");
    muteBtn.addEventListener("click", e => {
      e.stopPropagation();
      video.muted = !video.muted;
      muteBtn.innerHTML = muteIconSvg(video.muted);
    });
  }

  const showNav = fmMediaList.length > 1;
  lb.querySelector(".pm-lb-prev").style.display = showNav ? "flex" : "none";
  lb.querySelector(".pm-lb-next").style.display = showNav ? "flex" : "none";
}

function changeFeaturedMedia(direction) {
  fmMediaIndex += direction;
  if (fmMediaIndex >= fmMediaList.length) fmMediaIndex = 0;
  if (fmMediaIndex < 0) fmMediaIndex = fmMediaList.length - 1;
  renderFeaturedMedia();
}

// Inject tc-media-btn + featured lightbox CSS once
(function() {
  const s = document.createElement("style");
  s.textContent = `
    .tc-media-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: 1.5px solid var(--border);
      border-radius: 20px; padding: 5px 12px;
      font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
      font-weight: 600; color: var(--ink2); cursor: pointer;
      margin-bottom: 12px; transition: all .2s;
    }
    .tc-media-btn:hover { border-color: var(--accent); color: var(--accent); }

    .pm-media-lb {
      position: fixed; inset: 0; background: rgba(0,0,0,.92);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; opacity: 0; pointer-events: none; transition: opacity .25s;
    }
    .pm-media-lb.open { opacity: 1; pointer-events: all; }
    .pm-lb-content {
      position: relative; max-width: 92vw; max-height: 92vh;
      display: flex; align-items: center; justify-content: center;
    }
    .pm-lb-content img, .pm-lb-content video {
      max-width: 92vw; max-height: 92vh; border-radius: 12px; display: block;
      object-fit: contain;
    }
    /* Close button — solid black so it stays visible over any image */
    .pm-lb-close {
      position: absolute; top: 20px; right: 24px;
      width: 40px; height: 40px; border-radius: 50%;
      background: #000; border: none; color: #fff;
      font-size: 1.8rem; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 3;
    }
    /* Prev/Next — solid dark circle with a subtle border so they never
       blend into light/white images */
    .pm-lb-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 46px; height: 46px; padding: 0; border-radius: 50%;
      background: #000; border: 2px solid rgba(255,255,255,.35);
      color: #fff; font-size: 2rem; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      z-index: 3; transition: background .2s, border-color .2s;
    }
    @media (hover: hover) and (pointer: fine) {
      .pm-lb-nav:hover { background: var(--accent); border-color: var(--accent); }
    }
    .pm-lb-nav:active { background: var(--accent); border-color: var(--accent); }
    .pm-lb-prev { left: 16px; }
    .pm-lb-next { right: 16px; }
    .pm-lb-mute-btn {
      position: absolute; bottom: 16px; right: 16px;
      width: 38px; height: 38px; border: none; border-radius: 50%;
      background: rgba(0,0,0,.7); color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 0;
    }
    .pm-lb-mute-btn:hover { background: #000; }
    .pm-lb-mute-btn svg { width: 18px; height: 18px; }
    @media (max-width: 600px) {
      .pm-lb-nav { width: 40px; height: 40px; font-size: 1.7rem; }
      .pm-lb-prev { left: 8px; }
      .pm-lb-next { right: 8px; }
    }
  `;
  document.head.appendChild(s);
})();
function buildWALink(product, price, desc, size) {
  const msg = [
    `Hello ${BRAND_NAME}!`,
    ``,
    `I want to place an order for:`,
    `Product: ${product}`,
    ...(size ? [`Size: ${size}`] : []),
    `Starting Price: ${price}`,
    `Details: ${desc}`,
    ``,
    `Please help me with customisation and order details.`,
    ``,
    `(Sent from ${WEBSITE})`
  ].join("\n");
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function buildEmailLink(product, price, desc, size) {
  const subject = `Order Enquiry: ${product} — ${BRAND_NAME}`;
  const body = [
    `Hello ${BRAND_NAME},`,
    ``,
    `I would like to place an order for the following:`,
    ``,
    `Product     : ${product}`,
    ...(size ? [`Size        : ${size}`] : []),
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
function orderProduct(el, size) {
  const product = el.dataset.product || "Custom Product";
  const price   = el.dataset.price   || "Contact for pricing";
  const desc    = el.dataset.desc    || "Custom print order";
  addRipple(el);
  showOrderModal(product, price, desc, size || null);
}

function showOrderModal(product, price, desc, size) {
  const old = document.getElementById("pm-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "pm-modal";
  modal.innerHTML = `
    <div class="pm-modal-backdrop"></div>
    <div class="pm-modal-box">
      <button class="pm-modal-close" aria-label="Close">&times;</button>
      <div class="pm-modal-tag">Place Your Order</div>
      <div class="pm-modal-product">${escapeHtml(product)}</div>
      <div class="pm-modal-price">${escapeHtml(price)}</div>
      <p class="pm-modal-desc">Choose how you'd like to connect with us:</p>
      <div class="pm-modal-btns">
        <a href="#" target="_blank" class="pm-btn-wa" id="pmBtnWA">
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Order via WhatsApp
        </a>
        <a href="${buildEmailLink(product, price, desc, size)}" class="pm-btn-email">
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
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("pm-modal-open")));

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

  modal.querySelector("#pmBtnWA").addEventListener("click", function(e) {
    e.preventDefault();
    showDeliveryPopup("wa", buildWALink(product, price, desc, size), null, product, price, false, size);
    closeModal();
  });

  modal.querySelector(".pm-btn-email").addEventListener("click", function(e) {
    e.preventDefault();
    showDeliveryPopup("email", null, buildEmailLink(product, price, desc, size), product, price, false, size);
    closeModal();
  });

  modal.querySelectorAll("a:not(#pmBtnWA):not(.pm-btn-email)").forEach(a => {
    a.addEventListener("click", () => setTimeout(closeModal, 400));
  });
}

/* ══════════════════════════════════════
   PRODUCT DETAIL MODAL (Amazon-style click-through)
   Opens when a product card is clicked anywhere EXCEPT its media
   (images/videos), which still open the media lightbox as before.
   Shows full description + size selection (if the product has sizes)
   before letting the user Add to Cart / Order.
   ══════════════════════════════════════ */
let detailModalSelectedSize = null;
let detailModalMedia = [];
let detailModalIndex = 0;
let detailModalOutOfStock = false;

function openProductDetail(productId, evt) {
  // Guard: if the click originated from the media carousel or its buttons,
  // do nothing here — those already stopPropagation() on their own onclick,
  // but this is a belt-and-braces check in case markup changes later.
  if (evt && evt.target.closest(".pc-media-carousel")) return;

  const p = allProducts.find(x => x.id === productId);
  if (!p) return;

  detailModalSelectedSize = null;
  detailModalIndex = 0;
  detailModalOutOfStock = p.inStock === false;

  const media = Array.isArray(p.media) && p.media.length
    ? p.media
    : (p.imageUrl ? [{ url: p.imageUrl, type: "image" }] : []);
  detailModalMedia = media;
  const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;

  const old = document.getElementById("pm-detail-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.id = "pm-detail-modal";
  modal.innerHTML = `
    <div class="pm-dtl-backdrop"></div>
    <div class="pm-dtl-box">
      <button class="pm-dtl-close" aria-label="Close">&times;</button>

      <div class="pm-dtl-media">
        <div class="pm-dtl-media-content" id="pmDtlMediaContent"></div>
        ${media.length > 1 ? `
          <button class="pm-dtl-nav pm-dtl-prev" onclick="changeDetailMedia(-1)">${chevronSvg("left")}</button>
          <button class="pm-dtl-nav pm-dtl-next" onclick="changeDetailMedia(1)">${chevronSvg("right")}</button>
          <div class="pm-dtl-dots">${media.map((_, i) => `<span class="pm-dtl-dot ${i === 0 ? "active" : ""}"></span>`).join("")}</div>
        ` : ""}
      </div>

      <div class="pm-dtl-info">
        <div class="pm-dtl-cat">${escapeHtml(categoryLabel(p.category))}</div>
        <div class="pm-dtl-name">${escapeHtml(p.name)}</div>
        <div class="pm-dtl-price">${escapeHtml(p.price)} <span class="pm-dtl-price-tag">Starting price</span></div>
        ${p.inStock === false ? `<div class="pm-dtl-oos-badge">Out of Stock</div>` : ""}
        ${p.description ? `<p class="pm-dtl-desc">${escapeHtml(p.description)}</p>` : ""}

        ${hasSizes ? `
          <div class="pm-dtl-sizes">
            <div class="pm-dtl-sizes-label">Select Size <span class="pm-dtl-required">*</span></div>
            <div class="pm-dtl-size-row" id="pmDtlSizeRow">
              ${p.sizes.map(sz => `<button type="button" class="pm-dtl-size-chip" data-size="${escapeHtml(sz)}" onclick="selectDetailSize(this)">${escapeHtml(sz)}</button>`).join("")}
            </div>
            <div class="pm-dtl-size-hint" id="pmDtlSizeHint">Please select a size to continue</div>
          </div>
        ` : ""}

        <div class="pm-dtl-btns">
          <button class="pc-btn-cart pm-dtl-btn-cart" id="pmDtlAddCart" ${(hasSizes || p.inStock === false) ? "disabled" : ""}
            data-product="${escapeHtml(p.name)}" data-price="${escapeHtml(p.price)}" data-desc="${escapeHtml(p.description || p.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ${p.inStock === false ? "Out of Stock" : "Add to Cart"}
          </button>
          <button class="pc-btn-order pm-dtl-btn-order" id="pmDtlOrderNow" ${(hasSizes || p.inStock === false) ? "disabled" : ""}
            data-product="${escapeHtml(p.name)}" data-price="${escapeHtml(p.price)}" data-desc="${escapeHtml(p.description || p.name)}">
            Order Now
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";
  renderDetailMedia();
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("pm-dtl-open")));

  function closeModal() {
    modal.classList.remove("pm-dtl-open");
    document.body.style.overflow = "";
    setTimeout(() => modal.remove(), 300);
  }

  modal.querySelector(".pm-dtl-backdrop").addEventListener("click", closeModal);
  modal.querySelector(".pm-dtl-close").addEventListener("click", closeModal);
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { closeModal(); document.removeEventListener("keydown", esc); }
  });

  modal.querySelector("#pmDtlAddCart").addEventListener("click", function() {
    if (detailModalOutOfStock) return;
    if (hasSizes && !detailModalSelectedSize) { flashSizeHint(); return; }
    addToCart(this, detailModalSelectedSize);
    closeModal();
  });

  modal.querySelector("#pmDtlOrderNow").addEventListener("click", function() {
    if (detailModalOutOfStock) return;
    if (hasSizes && !detailModalSelectedSize) { flashSizeHint(); return; }
    orderProduct(this, detailModalSelectedSize);
    closeModal();
  });
}

function selectDetailSize(btn) {
  document.querySelectorAll("#pmDtlSizeRow .pm-dtl-size-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  detailModalSelectedSize = btn.dataset.size;

  const cartBtn  = document.getElementById("pmDtlAddCart");
  const orderBtn = document.getElementById("pmDtlOrderNow");
  if (!detailModalOutOfStock) {
    if (cartBtn)  cartBtn.disabled  = false;
    if (orderBtn) orderBtn.disabled = false;
  }

  const hint = document.getElementById("pmDtlSizeHint");
  if (hint) { hint.textContent = `Size: ${detailModalSelectedSize} selected`; hint.classList.add("ok"); }
}

function flashSizeHint() {
  const hint = document.getElementById("pmDtlSizeHint");
  if (!hint) return;
  hint.classList.add("shake");
  setTimeout(() => hint.classList.remove("shake"), 400);
}

/* Renders the current media item using the exact same markup/classes as the
   full media lightbox (dark contain-fit box, custom mute button, no native
   video controls) so the product detail modal matches it exactly. */
function renderDetailMedia() {
  const content = document.getElementById("pmDtlMediaContent");
  if (!content) return;
  const m = detailModalMedia[detailModalIndex];
  if (!m) return;

  content.innerHTML = m.type === "video"
    ? `<div class="ml-video-wrap">
         <video id="pmDtlVideo" src="${escapeHtml(m.url)}" autoplay muted loop playsinline></video>
         <button class="ml-mute-btn" type="button" onclick="toggleDetailMediaMute(this)">${muteIconSvg(true)}</button>
       </div>`
    : `<img src="${escapeHtml(m.url)}" alt=""/>`;

  document.querySelectorAll(".pm-dtl-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === detailModalIndex);
  });
}

function toggleDetailMediaMute(btn) {
  const video = document.getElementById("pmDtlVideo");
  if (!video) return;
  video.muted = !video.muted;
  btn.innerHTML = muteIconSvg(video.muted);
}

function changeDetailMedia(direction) {
  if (detailModalMedia.length <= 1) return;
  detailModalIndex += direction;
  if (detailModalIndex >= detailModalMedia.length) detailModalIndex = 0;
  if (detailModalIndex < 0) detailModalIndex = detailModalMedia.length - 1;
  renderDetailMedia();
}

/* ── Card-level Add to Cart / Order buttons: route through the size flow ── */
function handleCardAddToCart(el) {
  const id = el.dataset.id;
  const p  = allProducts.find(x => x.id === id);
  if (p && p.inStock === false) {
    showToast("This product is currently out of stock");
    return;
  }
  if (p && Array.isArray(p.sizes) && p.sizes.length) {
    // Sizes required — open the detail modal so the user must pick one
    openProductDetail(id);
    showToast("Please select a size first");
    return;
  }
  addToCart(el, null);
}

function handleCardOrderNow(el) {
  const id = el.dataset.id;
  const p  = allProducts.find(x => x.id === id);
  if (p && p.inStock === false) {
    showToast("This product is currently out of stock");
    return;
  }
  if (p && Array.isArray(p.sizes) && p.sizes.length) {
    openProductDetail(id);
    showToast("Please select a size first");
    return;
  }
  orderProduct(el, null);
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
   HAMBURGER DRAWER
   ══════════════════════════════════════ */
function initHamburger() {
  const btn      = document.getElementById("hamburger");
  const drawer   = document.getElementById("drawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const closeBtn = document.getElementById("drawerClose");
  if (!btn || !drawer || !backdrop) return;

  function open() {
    drawer.classList.add("open"); backdrop.classList.add("open");
    btn.classList.add("open"); document.body.style.overflow = "hidden";
  }
  function close() {
    drawer.classList.remove("open"); backdrop.classList.remove("open");
    btn.classList.remove("open"); document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => drawer.classList.contains("open") ? close() : open());
  backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.querySelectorAll(".dl").forEach(a => a.addEventListener("click", close));
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

/* ══════════════════════════════════════
   SCROLL REVEAL
   ══════════════════════════════════════ */
function initScrollReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll(".fade-up:not(.visible)").forEach(el => io.observe(el));

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
   MARQUEE
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
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
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
    const p    = Math.min((ts - start) / dur, 1);
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
      card.style.transform = `translateY(-8px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ══════════════════════════════════════
   CART SYSTEM
   ══════════════════════════════════════ */
let cart = [];

function saveCart() {
  localStorage.setItem("pm_cart", JSON.stringify(cart));
}

function loadCart() {
  try {
    const saved = localStorage.getItem("pm_cart");
    if (saved) cart = JSON.parse(saved);
  } catch { cart = []; }
}

function addToCart(el, size) {
  const product  = el.dataset.product;
  const price    = el.dataset.price;
  const desc     = el.dataset.desc;
  const priceNum = parseInt(price.replace(/[^0-9]/g, "")) || 0;
  size = size || null;

  // Same product but a different size is a distinct cart line (e.g. one
  // Medium and one Large of the same tee should show separately).
  const existing = cart.find(i => i.product === product && i.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ product, price, priceNum, desc, size, qty: 1 });
  }
  saveCart();
  updateCartBadge();
  addRipple(el);
  showToast(size ? `✓ ${product} (Size: ${size}) added to cart!` : `✓ ${product} added to cart!`);
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById("cartCount");
  if (!badge) return;
  badge.textContent = total;
  badge.classList.toggle("has-items", total > 0);
}

function renderCartItems() {
  const itemsEl  = document.getElementById("cartItems");
  const footerEl = document.getElementById("cartFooter");
  const totalEl  = document.getElementById("cartTotal");
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="52" height="52">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Your cart is empty!</p>
        <small>Add products to get started</small>
      </div>`;
    if (footerEl) footerEl.style.display = "none";
    return;
  }

  const grandTotal = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
  if (footerEl) footerEl.style.display = "block";
  if (totalEl)  totalEl.textContent = `Rs.${grandTotal}`;

  itemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="ci-info">
        <div class="ci-name">${escapeHtml(item.product)}${item.size ? ` <span class="ci-size">— Size: ${escapeHtml(item.size)}</span>` : ""}</div>
        <div class="ci-price">${escapeHtml(item.price)} each &nbsp;·&nbsp;
          <span class="ci-subtotal">Rs.${item.priceNum * item.qty}</span>
        </div>
      </div>
      <div class="ci-qty">
        <button onclick="cartChangeQty(${idx}, -1)">&#8722;</button>
        <span>${item.qty}</span>
        <button onclick="cartChangeQty(${idx}, 1)">&#43;</button>
      </div>
      <button class="ci-remove" onclick="cartRemove(${idx})" title="Remove">&times;</button>
    </div>
  `).join("");
}

function cartChangeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); updateCartBadge(); renderCartItems();
}

function cartRemove(idx) {
  cart.splice(idx, 1);
  saveCart(); updateCartBadge(); renderCartItems();
}

function openCart() {
  renderCartItems();
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("cart-backdrop").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cart-drawer").classList.remove("open");
  document.getElementById("cart-backdrop").classList.remove("open");
  document.body.style.overflow = "";
}

function buildCartMsg() {
  const total = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
  return [
    `Hello ${BRAND_NAME}!`,
    ``,
    `I want to place an order for the following items:`,
    ``,
    ...cart.map(i => `• ${i.product}${i.size ? ` (Size: ${i.size})` : ""} x${i.qty}  —  ${i.price} each  =  Rs.${i.priceNum * i.qty}`),
    ``,
    `Grand Total: Rs.${total}`,
    ``,
    `Please help me with customisation and order details.`,
    ``,
    `(Sent from ${WEBSITE})`
  ].join("\n");
}

function cartOrderWA() {
  if (cart.length === 0) { showToast("Cart is empty!"); return; }
  const total = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
  const cartMsg = buildCartMsg();
  closeCart();
  showDeliveryPopup("wa", `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(cartMsg)}`, null, null, null, true);
}

function cartOrderEmail() {
  if (cart.length === 0) { showToast("Cart is empty!"); return; }
  const total      = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
  const subject    = `Cart Order — ${BRAND_NAME} (Rs.${total})`;
  const emailLink  = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildCartMsg())}`;
  closeCart();
  showDeliveryPopup("email", null, emailLink, null, null, true);
}

/* ══════════════════════════════════════
   DELIVERY POPUP — naam/phone/address
   Saves to KV via API before redirecting
   ══════════════════════════════════════ */
function showDeliveryPopup(type, waLink, emailLink, product, price, isCart, size) {
  const old = document.getElementById("pm-delivery-popup");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "pm-delivery-popup";
  popup.innerHTML = `
    <div class="pm-dp-backdrop"></div>
    <div class="pm-dp-box">
      <div class="pm-dp-title">📦 Delivery Details</div>
      <p class="pm-dp-sub">Fill in your details so we know where to deliver</p>
      <input type="text"  id="dpName"    class="pm-dp-input" placeholder="Your Name *"         maxlength="60"/>
      <input type="tel"   id="dpPhone"   class="pm-dp-input" placeholder="Phone Number *"      maxlength="15"/>
      <textarea           id="dpAddress" class="pm-dp-input pm-dp-textarea" rows="2"
        placeholder="Delivery Address *" maxlength="200"></textarea>
      <div class="pm-dp-btns">
        <button class="pm-dp-cancel"  id="dpCancel">Cancel</button>
        <button class="pm-dp-confirm" id="dpConfirm">Confirm &amp; Order</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add("pm-dp-open")));

  setTimeout(() => document.getElementById("dpName")?.focus(), 350);

  function closePopup() {
    popup.classList.remove("pm-dp-open");
    document.body.style.overflow = "";
    setTimeout(() => popup.remove(), 300);
  }

  popup.querySelector("#dpCancel").addEventListener("click", closePopup);
  popup.querySelector(".pm-dp-backdrop").addEventListener("click", closePopup);
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { closePopup(); document.removeEventListener("keydown", esc); }
  });

  popup.querySelector("#dpConfirm").addEventListener("click", async function() {
    const name    = (document.getElementById("dpName")?.value    || "").trim();
    const phone   = (document.getElementById("dpPhone")?.value   || "").trim();
    const address = (document.getElementById("dpAddress")?.value || "").trim();

    if (!name)    { showToast("Please enter your name!");             document.getElementById("dpName")?.focus();    return; }
    if (!phone)   { showToast("Please enter your phone number!");     document.getElementById("dpPhone")?.focus();   return; }
    if (!address) { showToast("Please enter your delivery address!"); document.getElementById("dpAddress")?.focus(); return; }

    // Build items array
    let items = [];
    let total = 0;
    if (isCart) {
      items = cart.map(i => ({ product: i.product, price: i.price, qty: i.qty, size: i.size || null }));
      total = cart.reduce((s, i) => s + i.priceNum * i.qty, 0);
    } else if (product) {
      items = [{ product, price, qty: 1, size: size || null }];
      total = parseInt((price || "0").replace(/[^0-9]/g, "")) || 0;
    }

    // Save order to KV (non-blocking — don't wait for it to open WA/email)
    saveOrderToAPI({ name, phone, address, items, total, type }).catch(() => {});

    // Append delivery details to message
    function appendDetails(link) {
      const details = `\n---\nOrder by: ${name}\nPhone: ${phone}\nDelivery Address: ${address}`;
      if (link.startsWith("https://wa.me/")) {
        const u = new URL(link);
        u.searchParams.set("text", decodeURIComponent(u.searchParams.get("text") || "") + details);
        return u.toString();
      } else if (link.startsWith("mailto:")) {
        const u = new URL(link);
        u.searchParams.set("body", decodeURIComponent(u.searchParams.get("body") || "") + details);
        return u.toString();
      }
      return link;
    }

    if (type === "wa"    && waLink)    window.open(appendDetails(waLink), "_blank");
    if (type === "email" && emailLink) window.open(appendDetails(emailLink));

    if (isCart) { cart = []; saveCart(); updateCartBadge(); }
    closePopup();
  });
}

/* ══════════════════════════════════════
   SAVE ORDER TO API
   ══════════════════════════════════════ */
async function saveOrderToAPI(orderData) {
  try {
    await fetch(`${PM_API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData)
    });
  } catch { /* silently fail — WhatsApp/email still opened */ }
}

/* ══════════════════════════════════════
   HELPER — HTML escape
   ══════════════════════════════════════ */
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ══════════════════════════════════════
   BOOT
   ══════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  updateCartBadge();
  initWALinks();
  initNavbar();
  initHamburger();
  initScrollReveal();
  initMarquee();
  initSmoothScroll();
  initCounters();

  // Dynamic data from API
  loadProducts();
  loadFeaturedReviews();

  console.log("%cPrintMotive loaded!", "color:#ff4d2e;font-weight:bold;font-size:14px");
});
function changeProductMedia(productId, direction) {
  const carousel = document.querySelector(
    `.pc-media-carousel[data-product-id="${productId}"]`
  );

  if (!carousel) return;

  const items = carousel.querySelectorAll('.pc-media-item');
  if (items.length <= 1) return;

  let current = Array.from(items).findIndex(item =>
    item.classList.contains('active')
  );

  if (current === -1) current = 0;

  items[current].classList.remove('active');

  let next = current + direction;

  if (next >= items.length) next = 0;
  if (next < 0) next = items.length - 1;

  items[next].classList.add('active');

  items.forEach((item, index) => {
    const video = item.tagName === 'VIDEO' ? item : item.querySelector('video');
    if (video && index !== next) video.pause();
    if (video && index === next) video.play().catch(() => {});
  });
}

/* Pixel-perfect chevron icon (SVG centers reliably, unlike the ‹ › glyphs
   which can look off-center depending on the font). */
function chevronSvg(direction) {
  const points = direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="${points}"></polyline></svg>`;
}

/* Professional speaker (mute/unmute) SVG icons — replaces the old emoji buttons */
function muteIconSvg(isMuted) {
  return isMuted
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
}

function toggleMediaMute(btn) {
  const video = btn.previousElementSibling;
  if (!video || video.tagName !== 'VIDEO') return;
  video.muted = !video.muted;
  btn.innerHTML = muteIconSvg(video.muted);
}

/* ── MEDIA LIGHTBOX (full-size view on click) ── */
let lightboxMedia = [];
let lightboxIndex = 0;

function openMediaLightbox(productId, startIndex) {
  const carousel = document.querySelector(
    `.pc-media-carousel[data-product-id="${productId}"]`
  );
  if (!carousel) return;

  try {
    lightboxMedia = JSON.parse(carousel.dataset.media);
  } catch {
    lightboxMedia = [];
  }
  if (!lightboxMedia.length) return;

  lightboxIndex = startIndex || 0;
  renderLightbox();

  const overlay = document.getElementById('mediaLightboxOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderLightbox() {
  const content = document.getElementById('mediaLightboxContent');
  const m = lightboxMedia[lightboxIndex];
  if (!m) return;

  // No native `controls` — a custom mute button is used instead, so the
  // browser's own play/seek/fullscreen UI never appears over the video.
  content.innerHTML = m.type === 'video'
    ? `<div class="ml-video-wrap">
         <video id="mlVideo" src="${escapeHtml(m.url)}" autoplay muted loop playsinline></video>
         <button class="ml-mute-btn" type="button" onclick="toggleLightboxMute(this)">${muteIconSvg(true)}</button>
       </div>`
    : `<img src="${escapeHtml(m.url)}" alt=""/>`;

  const nav = document.getElementById('mediaLightboxNav');
  nav.style.display = lightboxMedia.length > 1 ? 'flex' : 'none';
}

function toggleLightboxMute(btn) {
  const video = document.getElementById('mlVideo');
  if (!video) return;
  video.muted = !video.muted;
  btn.innerHTML = muteIconSvg(video.muted);
}

function changeLightboxMedia(direction) {
  lightboxIndex += direction;
  if (lightboxIndex >= lightboxMedia.length) lightboxIndex = 0;
  if (lightboxIndex < 0) lightboxIndex = lightboxMedia.length - 1;
  renderLightbox();
}

function closeMediaLightbox() {
  const overlay = document.getElementById('mediaLightboxOverlay');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('mediaLightboxContent').innerHTML = '';
  lightboxMedia = [];
}
