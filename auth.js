/* ============================================================
   PRINTMOTIVE — auth.js
   Google Sign-In based customer accounts + server-side cart.
   Kept as a separate file from script.js so this whole feature
   can be reviewed/rolled back independently.
   ============================================================ */

/* ── CONFIG — fill these in ── */
const GOOGLE_CLIENT_ID = "441215419334-p3hgrb6sms0om767hmijpdbin017t7jf.apps.googleusercontent.com";
// PM_API is already defined in script.js (loaded before this file), reused here.

/* Fixed list of Indian states + union territories — doesn't change, so it's
   hardcoded rather than fetched. Used to populate the State dropdown in
   the account details form. */
const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

/* ── SESSION STATE ── */
let pmUser = null; // { id, name, email, pfpUrl, phone, state, city, pincode, address, profileComplete }

function getUserToken() {
  return localStorage.getItem("pm_user_token") || null;
}
function setUserToken(token) {
  localStorage.setItem("pm_user_token", token);
}
function clearUserToken() {
  localStorage.removeItem("pm_user_token");
}
function isLoggedIn() {
  return !!getUserToken() && !!pmUser;
}

/* Wrapper around fetch that attaches the user's session token.
   Used for every /api/user/* and /api/cart request. */
async function userFetch(path, options = {}) {
  const token = getUserToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  return fetch(`${PM_API}${path}`, { ...options, headers });
}

/* ══════════════════════════════════════
   INIT — runs on every page load
   ══════════════════════════════════════ */
async function initAuth() {
  renderGoogleButton(); // always render (hidden until needed) so it's ready when the popup opens

  const token = getUserToken();
  if (!token) { renderNavAuthUI(); return; }

  try {
    const res = await userFetch("/api/user/me");
    if (!res.ok) throw new Error("session invalid");
    pmUser = await res.json();
    if (pmUser.error) throw new Error(pmUser.error);
    renderNavAuthUI();
    await syncCartFromServer();
  } catch {
    // Token expired/invalid — clear it silently, treat as logged out.
    clearUserToken();
    pmUser = null;
    renderNavAuthUI();
  }
}

/* ══════════════════════════════════════
   GOOGLE SIGN-IN
   ══════════════════════════════════════ */
function renderGoogleButton() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    // Google's script may not have loaded yet — retry shortly.
    setTimeout(renderGoogleButton, 300);
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse,
    auto_select: false,
  });
}

function promptGoogleLogin() {
  if (!window.google || !google.accounts || !google.accounts.id) {
    showToast("Google Sign-In is still loading, please try again in a moment.");
    return;
  }
  // Render the official Google button inside our popup each time it opens,
  // since Google's button must be rendered into a real DOM node.
  const target = document.getElementById("googleBtnContainer");
  if (target) {
    target.innerHTML = "";
    google.accounts.id.renderButton(target, { theme: "outline", size: "large", width: 280 });
  }
}

async function handleGoogleCredentialResponse(response) {
  try {
    const res  = await fetch(`${PM_API}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential }),
    });
    const data = await res.json();
    if (!data.success) { showToast(data.error || "Login failed. Please try again."); return; }

    setUserToken(data.token);
    pmUser = data.user;
    closeLoginPopup();
    renderNavAuthUI();
    await syncCartFromServer();
    if (typeof updateRevNameDisplay === "function") updateRevNameDisplay(); // reviews.html only

    if (!pmUser.profileComplete) {
      openAccountDetailsForm(true /* isFirstTime */);
    } else if (window.__pmPostLoginAction) {
      // Resume whatever the user was trying to do before the login gate.
      const action = window.__pmPostLoginAction;
      window.__pmPostLoginAction = null;
      action();
    }
  } catch (err) {
    console.error(err);
    showToast("Login failed. Please check your connection.");
  }
}

function logoutUser() {
  clearUserToken();
  pmUser = null;
  // Guarded: `cart` / updateCartBadge() only exist on pages that load
  // script.js (index.html). reviews.html is standalone and has no cart.
  if (typeof cart !== "undefined") { cart = []; }
  if (typeof updateCartBadge === "function") { updateCartBadge(); }
  renderNavAuthUI();
  if (typeof updateRevNameDisplay === "function") updateRevNameDisplay(); // reviews.html only
  showToast("Logged out.");
}

/* ══════════════════════════════════════
   LOGIN POPUP (shown when Add to Cart / Review is attempted while logged out)
   ══════════════════════════════════════ */
function requireLogin(onSuccessAction) {
  if (isLoggedIn()) {
    if (pmUser.profileComplete) { onSuccessAction(); }
    else { window.__pmPostLoginAction = onSuccessAction; openAccountDetailsForm(true); }
    return;
  }
  window.__pmPostLoginAction = onSuccessAction;
  openLoginPopup();
}

function openLoginPopup() {
  const old = document.getElementById("pm-login-popup");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "pm-login-popup";
  popup.innerHTML = `
    <div class="pm-dp-backdrop"></div>
    <div class="pm-dp-box" style="text-align:center;">
      <div class="pm-dp-title">Sign in to continue</div>
      <p class="pm-dp-sub">Please log in with Google to add items to your cart and place orders.</p>
      <div id="googleBtnContainer" style="display:flex;justify-content:center;margin:18px 0;"></div>
      <button class="pm-dp-cancel" id="loginPopupCancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(popup);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add("pm-dp-open")));

  popup.querySelector("#loginPopupCancel").addEventListener("click", closeLoginPopup);
  popup.querySelector(".pm-dp-backdrop").addEventListener("click", closeLoginPopup);

  promptGoogleLogin();
}

function closeLoginPopup() {
  const popup = document.getElementById("pm-login-popup");
  if (!popup) return;
  popup.classList.remove("pm-dp-open");
  document.body.style.overflow = "";
  setTimeout(() => popup.remove(), 300);
}

/* ══════════════════════════════════════
   NAV BAR — login button / pfp dropdown
   Expects a container <div id="navAuthSlot"></div> in index.html's navbar.
   ══════════════════════════════════════ */
function renderNavAuthUI() {
  const slot = document.getElementById("navAuthSlot");
  const drawerAccount = document.getElementById("drawerAccountLinks");
  const drawerOrders  = document.getElementById("drawerOrdersLink");
  const drawerLogout  = document.getElementById("drawerLogoutLink");
  const drawerLogin   = document.getElementById("drawerLoginLink");

  const loggedIn = isLoggedIn();
  if (drawerAccount) drawerAccount.style.display = loggedIn ? "" : "none";
  if (drawerOrders)  drawerOrders.style.display  = loggedIn ? "" : "none";
  if (drawerLogout)  drawerLogout.style.display  = loggedIn ? "" : "none";
  if (drawerLogin)   drawerLogin.style.display   = loggedIn ? "none" : "";

  if (!slot) return;

  if (!loggedIn) {
    slot.innerHTML = `<button class="nav-login-btn" onclick="openLoginPopup()">Login</button>`;
    return;
  }

  slot.innerHTML = `
    <div class="nav-user-menu">
      <img src="${escapeHtml(pmUser.pfpUrl || '')}" alt="${escapeHtml(pmUser.name || 'Account')}" class="nav-user-pfp" onclick="toggleNavUserDropdown()"/>
      <div class="nav-user-dropdown" id="navUserDropdown">
        <div class="nud-name">${escapeHtml(pmUser.name || '')}</div>
        <a href="#" onclick="openAccountDetailsForm(false); closeNavUserDropdown(); return false;">My Account</a>
        <a href="#" onclick="openMyOrders(); closeNavUserDropdown(); return false;">My Orders</a>
        <a href="#" onclick="logoutUser(); closeNavUserDropdown(); return false;">Logout</a>
      </div>
    </div>`;
}

function toggleNavUserDropdown() {
  document.getElementById("navUserDropdown")?.classList.toggle("open");
}
function closeNavUserDropdown() {
  document.getElementById("navUserDropdown")?.classList.remove("open");
}
document.addEventListener("click", (e) => {
  const menu = document.querySelector(".nav-user-menu");
  if (menu && !menu.contains(e.target)) closeNavUserDropdown();
});

/* ══════════════════════════════════════
   MY ACCOUNT — complete/edit details
   ══════════════════════════════════════ */
function openAccountDetailsForm(isFirstTime) {
  const old = document.getElementById("pm-account-popup");
  if (old) old.remove();

  const u = pmUser || {};
  const stateOptionsHtml = `<option value="">Select State *</option>` +
    INDIA_STATES.map(s => `<option value="${escapeHtml(s)}" ${u.state === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("");

  const popup = document.createElement("div");
  popup.id = "pm-account-popup";
  popup.innerHTML = `
    <div class="pm-dp-backdrop"></div>
    <div class="pm-dp-box">
      <div class="pm-dp-title">${isFirstTime ? "Complete your details" : "My Account"}</div>
      <p class="pm-dp-sub">${isFirstTime ? "We need this to deliver your orders." : "Update your saved delivery details."}</p>
      <input type="text" id="accName"    class="pm-dp-input" placeholder="Full Name *"   maxlength="60"  value="${escapeHtml(u.name || '')}"/>
      <input type="tel"  id="accPhone"   class="pm-dp-input" placeholder="Phone Number *" maxlength="15"  value="${escapeHtml(u.phone || '')}"/>
      <input type="tel"  id="accPincode" class="pm-dp-input" placeholder="Pincode *"      maxlength="6"   value="${escapeHtml(u.pincode || '')}"/>
      <div id="accPincodeStatus" class="pm-dp-pincode-status"></div>
      <select id="accState" class="pm-dp-input pm-dp-select">${stateOptionsHtml}</select>
      <input type="text" id="accCity"    class="pm-dp-input" placeholder="City *"         maxlength="60"  value="${escapeHtml(u.city || '')}"/>
      <div id="accPincodeSuggest" class="pm-dp-pincode-suggest"></div>
      <textarea id="accAddress" class="pm-dp-input pm-dp-textarea" rows="2" placeholder="Full Address *" maxlength="200">${escapeHtml(u.address || '')}</textarea>
      <div class="pm-dp-btns">
        ${isFirstTime ? "" : `<button class="pm-dp-cancel" id="accCancel">Cancel</button>`}
        <button class="pm-dp-confirm" id="accSave">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add("pm-dp-open")));

  function closeAcc() {
    popup.classList.remove("pm-dp-open");
    document.body.style.overflow = "";
    setTimeout(() => popup.remove(), 300);
  }
  popup.querySelector("#accCancel")?.addEventListener("click", closeAcc);

  /* ── Pincode → State + City auto-fill ──
     Fires once the pincode field has exactly 6 digits. Uses India Post's
     free public API. On a valid pincode, State and City are filled in
     (overwriting whatever was there) since the pincode is the most
     precise signal of the three. */
  const pincodeInput  = popup.querySelector("#accPincode");
  const pincodeStatus = popup.querySelector("#accPincodeStatus");
  const stateSelect   = popup.querySelector("#accState");
  const cityInput     = popup.querySelector("#accCity");
  const suggestBox    = popup.querySelector("#accPincodeSuggest");

  pincodeInput.addEventListener("input", () => {
    pincodeInput.value = pincodeInput.value.replace(/[^0-9]/g, "").slice(0, 6);
    suggestBox.innerHTML = ""; // typing a pincode directly overrides any earlier suggestion list
    if (pincodeInput.value.length === 6) lookupPincode(pincodeInput.value);
    else pincodeStatus.textContent = "";
  });

  async function lookupPincode(pincode) {
    pincodeStatus.textContent = "Looking up...";
    pincodeStatus.className = "pm-dp-pincode-status";
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : null;
      if (!result || result.Status !== "Success" || !Array.isArray(result.PostOffice) || !result.PostOffice.length) {
        pincodeStatus.textContent = "Pincode not found — please enter State/City manually.";
        pincodeStatus.className = "pm-dp-pincode-status err";
        return;
      }
      const po = result.PostOffice[0];
      if (po.State && INDIA_STATES.includes(po.State)) {
        stateSelect.value = po.State;
      }
      cityInput.value = po.District || po.Block || po.Name || cityInput.value;
      pincodeStatus.textContent = `✓ ${po.District || ''}${po.State ? ', ' + po.State : ''}`;
      pincodeStatus.className = "pm-dp-pincode-status ok";
    } catch {
      pincodeStatus.textContent = "Could not verify pincode (network error) — you can still enter details manually.";
      pincodeStatus.className = "pm-dp-pincode-status err";
    }
  }

  /* ── State/City → Pincode suggestions ──
     Not a full auto-fill (a city can span many pincodes), so this offers
     a tappable list of matching pincodes instead of guessing one. Fires
     when the user picks a State and has typed a City. */
  async function suggestPincodes() {
    const state = stateSelect.value;
    const city  = cityInput.value.trim();
    if (!state || city.length < 3) { suggestBox.innerHTML = ""; return; }
    // Don't overwrite a pincode the user already filled in directly.
    if (pincodeInput.value.length === 6) return;

    suggestBox.innerHTML = `<span class="pm-dp-suggest-label">Looking up pincodes for ${escapeHtml(city)}...</span>`;
    try {
      const res  = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(city)}`);
      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : null;
      if (!result || result.Status !== "Success" || !Array.isArray(result.PostOffice) || !result.PostOffice.length) {
        suggestBox.innerHTML = "";
        return;
      }
      // Only offer post offices in the matching state, dedupe by pincode.
      const seen = new Set();
      const matches = result.PostOffice.filter(po => po.State === state && po.Pincode && !seen.has(po.Pincode) && seen.add(po.Pincode)).slice(0, 8);
      if (!matches.length) { suggestBox.innerHTML = ""; return; }

      suggestBox.innerHTML = `<span class="pm-dp-suggest-label">Select your pincode:</span>` +
        `<div class="pm-dp-suggest-chips">${matches.map(po =>
          `<button type="button" class="pm-dp-suggest-chip" data-pin="${escapeHtml(po.Pincode)}">${escapeHtml(po.Pincode)} — ${escapeHtml(po.Name)}</button>`
        ).join("")}</div>`;

      suggestBox.querySelectorAll(".pm-dp-suggest-chip").forEach(btn => {
        btn.addEventListener("click", () => {
          pincodeInput.value = btn.dataset.pin;
          pincodeStatus.textContent = `✓ Pincode set to ${btn.dataset.pin}`;
          pincodeStatus.className = "pm-dp-pincode-status ok";
          suggestBox.innerHTML = "";
        });
      });
    } catch {
      suggestBox.innerHTML = "";
    }
  }

  stateSelect.addEventListener("change", suggestPincodes);
  cityInput.addEventListener("blur", suggestPincodes);

  popup.querySelector("#accSave").addEventListener("click", async () => {
    const name    = document.getElementById("accName").value.trim();
    const phone   = document.getElementById("accPhone").value.trim();
    const state   = document.getElementById("accState").value.trim();
    const city    = document.getElementById("accCity").value.trim();
    const pincode = document.getElementById("accPincode").value.trim();
    const address = document.getElementById("accAddress").value.trim();

    if (!name || !phone || !state || !city || !pincode || !address) {
      showToast("Please fill in all fields.");
      return;
    }
    if (pincode.length !== 6) {
      showToast("Please enter a valid 6-digit pincode.");
      return;
    }

    try {
      const res  = await userFetch("/api/user/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, state, city, pincode, address }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || "Could not save details."); return; }

      pmUser = data.user;
      renderNavAuthUI();
      closeAcc();
      showToast("Details saved!");

      if (isFirstTime && window.__pmPostLoginAction) {
        const action = window.__pmPostLoginAction;
        window.__pmPostLoginAction = null;
        action();
      }
    } catch {
      showToast("Network error — please try again.");
    }
  });
}

/* ══════════════════════════════════════
   MY ORDERS
   ══════════════════════════════════════ */
async function openMyOrders() {
  const old = document.getElementById("pm-orders-popup");
  if (old) old.remove();

  const popup = document.createElement("div");
  popup.id = "pm-orders-popup";
  popup.innerHTML = `
    <div class="pm-dp-backdrop"></div>
    <div class="pm-dp-box" style="max-height:80vh;overflow-y:auto;">
      <div class="pm-dp-title">My Orders</div>
      <div id="myOrdersList" class="pm-dp-sub">Loading...</div>
      <div class="pm-dp-btns"><button class="pm-dp-cancel" id="ordersClose">Close</button></div>
    </div>
  `;
  document.body.appendChild(popup);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add("pm-dp-open")));

  function closeOrders() {
    popup.classList.remove("pm-dp-open");
    document.body.style.overflow = "";
    setTimeout(() => popup.remove(), 300);
  }
  popup.querySelector("#ordersClose").addEventListener("click", closeOrders);
  popup.querySelector(".pm-dp-backdrop").addEventListener("click", closeOrders);

  try {
    const res    = await userFetch("/api/user/orders");
    const orders = await res.json();
    const list   = document.getElementById("myOrdersList");
    if (!Array.isArray(orders) || orders.length === 0) {
      list.innerHTML = `<p>No orders yet.</p>`;
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="my-order-card">
        <div class="mo-date">${new Date(o.createdAt).toLocaleDateString()}</div>
        <div class="mo-items">
          ${(o.items || []).map(i => `<div class="mo-item-line">${escapeHtml(i.product)}${orderItemOptionsHtml(i)} x${i.qty}</div>`).join("")}
        </div>
        <div class="mo-total">Total: Rs.${o.total}</div>
      </div>
    `).join("");
  } catch {
    document.getElementById("myOrdersList").innerHTML = `<p>Could not load orders.</p>`;
  }
}

/* ══════════════════════════════════════
   SERVER-SIDE CART SYNC
   `cart` array itself is declared in script.js and used by all existing
   cart rendering/order code as-is — we only change WHERE it's persisted.
   ══════════════════════════════════════ */
async function syncCartFromServer() {
  if (!isLoggedIn()) return;
  if (typeof cart === "undefined" || typeof updateCartBadge !== "function") return; // not a cart-bearing page
  try {
    const res  = await userFetch("/api/cart");
    const data = await res.json();
    cart = Array.isArray(data.items) ? data.items : [];
    updateCartBadge();
  } catch { /* keep whatever local cart state exists */ }
}

async function persistCartToServer() {
  if (!isLoggedIn()) return;
  if (typeof cart === "undefined") return; // not a cart-bearing page
  try {
    await userFetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    });
  } catch { /* non-blocking */ }
}
