// Cctimeless scents&decor — App logic (no backend)
// Features: product grid, product modal, cart, localStorage persistence, WhatsApp checkout, contact form -> WhatsApp.

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const state = { settings: null, products: [], filter: "All", cart: [] };

const money = (amount, symbol="₦") => {
  const n = Number(amount || 0);
  return symbol + (isFinite(n) ? n.toLocaleString("en-NG") : amount);
};

function loadCart(){
  const raw = localStorage.getItem("cc_cart_v1");
  if(!raw) return [];
  try { return JSON.parse(raw) || []; } catch { return []; }
}
function saveCart(){
  localStorage.setItem("cc_cart_v1", JSON.stringify(state.cart));
  updateCartUI();
}
function cartCount(){ return state.cart.reduce((s,it)=>s+Number(it.qty||0),0); }
function cartTotal(){
  const sym = state.settings?.currency?.symbol || "₦";
  const total = state.cart.reduce((sum, ci)=>{
    const p = state.products.find(x=>x.id===ci.id);
    return sum + (p ? Number(p.price||0)*Number(ci.qty||0) : 0);
  },0);
  return { total, sym };
}
function whatsappLink(prefillText){
  const num = (state.settings?.contact?.whatsAppNumberInternational || "").replace(/[^\d+]/g,"");
  const base = "https://wa.me/" + num.replace("+","");
  return base + "?text=" + encodeURIComponent(prefillText);
}
function buildOrderText(){
  const sym = state.settings?.currency?.symbol || "₦";
  const lines = [];
  state.cart.forEach(ci=>{
    const p = state.products.find(x=>x.id===ci.id);
    if(!p) return;
    lines.push(`• ${p.name} x${ci.qty} — ${money((p.price||0)*(ci.qty||0), sym)}`);
  });
  const { total } = cartTotal();
  lines.push("", `Total: ${money(total, sym)}`);
  return lines.join("\n");
}

function openCart(){
  const d = $("#cart-drawer");
  d.classList.add("is-open");
  d.setAttribute("aria-hidden","false");
}
function closeCart(){
  const d = $("#cart-drawer");
  d.classList.remove("is-open");
  d.setAttribute("aria-hidden","true");
}
function setActiveFilter(name){
  state.filter = name;
  $$(".chip").forEach(btn=> btn.classList.toggle("is-active", btn.dataset.filter===name));
  renderProducts();
}

function productCard(p){
  const sym = state.settings?.currency?.symbol || "₦";
  const badges = (p.badges||[]).slice(0,3).map(b=>{
    const cls = b.toLowerCase().includes("gold") ? "tag gold" :
                b.toLowerCase().includes("new") ? "tag cobalt" : "tag";
    return `<span class="${cls}">${b}</span>`;
  }).join("");
  const price = p.price ? money(p.price, sym) : "DM for price";
  return `
    <article class="card product" data-id="${p.id}">
      <div class="product-media">${p.image ? `<img loading="lazy" src="${p.image}" alt="${p.name}">` : ""}</div>
      <div class="product-body">
        <div class="product-top">
          <div>
            <h3>${p.name}</h3>
            <div class="muted small">${p.category}</div>
          </div>
          <div class="price">${price}</div>
        </div>
        <div class="tags">${badges}</div>
        <p class="muted small" style="margin:10px 0 0">${p.short||""}</p>
        <div class="product-actions">
          <button class="btn ghost" data-view="${p.id}">View</button>
          <button class="btn" data-add="${p.id}">Add</button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts(){
  const grid = $("#product-grid");
  const list = state.products.filter(p=> state.filter==="All" ? true : (p.category||"").toLowerCase()===state.filter.toLowerCase());
  grid.innerHTML = list.map(productCard).join("");
  $$("[data-view]").forEach(btn=> btn.addEventListener("click", ()=>openProduct(btn.dataset.view)));
  $$("[data-add]").forEach(btn=> btn.addEventListener("click", ()=>addToCart(btn.dataset.add,1)));
  $$("article.product").forEach(card=>{
    card.addEventListener("click",(e)=>{
      if(e.target.closest("button")) return;
      openProduct(card.dataset.id);
    });
  });
}

function renderFeaturedTiles(){
  const tiles = $("#featured-tiles");
  const sym = state.settings?.currency?.symbol || "₦";
  const featured = state.products.filter(p=> (p.badges||[]).some(b=>/best seller|new|statement/i.test(b))).slice(0,3);
  tiles.innerHTML = featured.map(p=>{
    const price = p.price ? money(p.price, sym) : "DM for price";
    return `
      <div class="tile">
        <div class="tile-media">${p.image ? `<img src="${p.image}" alt="${p.name}">` : ""}</div>
        <div class="tile-body">
          <strong>${p.name}</strong>
          <div class="muted small">${p.short||""}</div>
          <div class="row">
            <div class="price">${price}</div>
            <button class="btn ghost" data-view="${p.id}">View</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
  $$("[data-view]", tiles).forEach(btn=> btn.addEventListener("click", ()=>openProduct(btn.dataset.view)));
}

function renderCollectionsPhoto(){
  const el = $("#collection-photo");
  const preferred = state.products.find(p=>p.id==="classic-bust-candle") || state.products[0];
  if(preferred?.image) el.style.backgroundImage = `url('${preferred.image}')`;
}
function renderAboutGallery(){
  const g = $("#about-gallery");
  g.innerHTML = state.products.filter(p=>p.image).slice(0,4).map(p=>`<div class="g"><img src="${p.image}" alt="${p.name}"/></div>`).join("");
}
function renderVideoGallery(){
  const grid = $("#video-grid");
  const vids = state.settings?.media?.showcaseVideos || [];
  grid.innerHTML = vids.length ? vids.map((src,i)=>`
    <div class="video-card">
      <video src="${src}" controls playsinline preload="metadata"></video>
      <div class="video-meta"><strong>Showcase ${i+1}</strong><div class="small">Tap play to view.</div></div>
    </div>
  `).join("") : `<div class="muted">No videos added yet.</div>`;
}

function openProduct(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const modal = $("#product-modal");
  const sym = state.settings?.currency?.symbol || "₦";
  $("#modal-media").innerHTML = p.image ? `<img src="${p.image}" alt="${p.name}"/>` : `<div class="muted" style="padding:18px">Image coming soon</div>`;
  $("#modal-badges").innerHTML = (p.badges||[]).map(b=>{
    const cls = b.toLowerCase().includes("gold") ? "tag gold" :
                b.toLowerCase().includes("new") ? "tag cobalt" : "tag";
    return `<span class="${cls}">${b}</span>`;
  }).join("");
  $("#modal-title").textContent = p.name;
  $("#modal-price").textContent = p.price ? money(p.price, sym) : "DM for price";
  $("#modal-desc").textContent = p.short || "";
  $("#modal-qty").value = 1;
  $("#modal-add").onclick = ()=>{
    const qty = Math.max(1, Number($("#modal-qty").value || 1));
    addToCart(id, qty);
    modal.close();
    openCart();
  };
  modal.showModal();
}

function addToCart(id, qty){
  const it = state.cart.find(x=>x.id===id);
  if(it) it.qty = Number(it.qty)+Number(qty||1);
  else state.cart.push({id, qty:Number(qty||1)});
  saveCart();
}
function removeFromCart(id){
  state.cart = state.cart.filter(x=>x.id!==id);
  saveCart();
}
function updateQty(id, qty){
  qty = Number(qty||1);
  if(qty<=0) return removeFromCart(id);
  const it = state.cart.find(x=>x.id===id);
  if(it) it.qty = qty;
  saveCart();
}

function updateCartUI(){
  $("#cart-count").textContent = String(cartCount());
  const wrap = $("#cart-items");
  const sym = state.settings?.currency?.symbol || "₦";
  if(!state.cart.length){
    wrap.innerHTML = `<div class="muted">Your cart is empty.</div>`;
  } else {
    wrap.innerHTML = state.cart.map(ci=>{
      const p = state.products.find(x=>x.id===ci.id);
      if(!p) return "";
      return `
        <div class="cart-item">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ""}
          <div class="ci">
            <strong>${p.name}</strong>
            <div class="muted small">${p.category}</div>
            <div class="ci-row">
              <div class="muted small">${money(p.price||0, sym)} each</div>
              <button data-remove="${p.id}">Remove</button>
            </div>
            <div class="ci-row">
              <div class="muted small">Qty</div>
              <div>
                <button data-dec="${p.id}">−</button>
                <span style="display:inline-block;min-width:28px;text-align:center">${ci.qty}</span>
                <button data-inc="${p.id}">+</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
    $$("[data-remove]").forEach(b=>b.addEventListener("click", ()=>removeFromCart(b.dataset.remove)));
    $$("[data-inc]").forEach(b=>b.addEventListener("click", ()=>{
      const it = state.cart.find(x=>x.id===b.dataset.inc);
      updateQty(b.dataset.inc, (it?.qty||0)+1);
    }));
    $$("[data-dec]").forEach(b=>b.addEventListener("click", ()=>{
      const it = state.cart.find(x=>x.id===b.dataset.dec);
      updateQty(b.dataset.dec, (it?.qty||0)-1);
    }));
  }
  const { total, sym:s } = cartTotal();
  $("#cart-total").textContent = money(total, s);
}

function doCheckout(){
  if(!state.cart.length) return alert("Your cart is empty.");
  const name = ($("#checkout-name").value||"").trim();
  const address = ($("#checkout-address").value||"").trim();
  const phone = ($("#checkout-phone").value||"").trim();
  const notes = ($("#checkout-notes").value||"").trim();

  const order = buildOrderText();
  const template = state.settings?.automation?.whatsAppPrefillTemplate || "{ORDER}";
  const text = template
    .replace("{ORDER}", order)
    .replace("{NAME}", name || "-")
    .replace("{ADDRESS}", address || "-")
    .replace("{PHONE}", phone || "-")
    .replace("{NOTES}", notes || "-");

  window.open(whatsappLink(text), "_blank");
}

function bindUI(){
  $("#btn-menu").addEventListener("click", ()=>{ $("#mobile-nav").hidden = !$("#mobile-nav").hidden; });
  $$("[data-scroll]").forEach(btn=> btn.addEventListener("click", ()=>{
    const el = document.querySelector(btn.dataset.scroll);
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
  }));

  $("#btn-open-cart").addEventListener("click", openCart);
  $("#btn-open-cart-m").addEventListener("click", ()=>{ $("#mobile-nav").hidden=true; openCart(); });
  $("#cart-close").addEventListener("click", closeCart);
  $("#cart-overlay").addEventListener("click", closeCart);
  $("#btn-clear-cart").addEventListener("click", ()=>{ state.cart=[]; saveCart(); });
  $("#btn-checkout").addEventListener("click", doCheckout);

  $("#btn-shop-now").addEventListener("click", ()=>document.querySelector("#shop").scrollIntoView({behavior:"smooth"}));
  $("#btn-shop-now-m").addEventListener("click", ()=>{ $("#mobile-nav").hidden=true; document.querySelector("#shop").scrollIntoView({behavior:"smooth"}); });
  $("#btn-hero-shop").addEventListener("click", ()=>document.querySelector("#shop").scrollIntoView({behavior:"smooth"}));

  $("#modal-close").addEventListener("click", ()=>$("#product-modal").close());
  $("#product-modal").addEventListener("click",(e)=>{ if(e.target===$("#product-modal")) $("#product-modal").close(); });

  $$(".chip").forEach(btn=> btn.addEventListener("click", ()=>setActiveFilter(btn.dataset.filter)));

  $("#contact-form").addEventListener("submit",(e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = (fd.get("name")||"").toString().trim();
    const phone = (fd.get("phone")||"").toString().trim();
    const msg = (fd.get("message")||"").toString().trim();
    const text = `Hi CCtimeless scents&decor!\n\nName: ${name}\nPhone: ${phone||"-"}\nMessage: ${msg}`;
    window.open(whatsappLink(text), "_blank");
  });

  $("#btn-custom-wa").addEventListener("click", ()=>{
    const text = "Hi CCtimeless scents&decor! I want a custom order. Here is my idea:\n\n- Item(s):\n- Quantity:\n- Colors/Theme:\n- Delivery date:";
    window.open(whatsappLink(text), "_blank");
  });
}

async function init(){
  const [settings, products] = await Promise.all([
    fetch("settings.json").then(r=>r.json()),
    fetch("products.json").then(r=>r.json()),
  ]);
  state.settings = settings;
  state.products = products;
  state.cart = loadCart();

  $("#topbar-ig").href = settings.social.instagramUrl;
  $("#topbar-tt").href = settings.social.tiktokUrl;
  $("#btn-ig").href = settings.social.instagramUrl;
  $("#btn-tt").href = settings.social.tiktokUrl;
  function setLink(id, url) {
  const el = $(id);
  if (!el) return;
  if (!url || url === "#") return; // garde le lien existant si vide
  el.href = url;
  el.target = "_blank";
  el.rel = "noopener noreferrer";
}

setLink("#topbar-ig", settings.social.instagramUrl);
setLink("#btn-ig", settings.social.instagramUrl);
setLink("#topbar-tt", settings.social.tiktokUrl);
setLink("#btn-tt", settings.social.tiktokUrl);


  const waText = "Hi Cctimeless scents&decor! I'd like to order.";
  $("#topbar-wa").href = whatsappLink(waText);
  $("#btn-about-wa").href = whatsappLink(waText);
  $("#btn-wa-contact").href = whatsappLink(waText);

  const hv = $("#hero-video");
  if(settings.media.heroVideo) hv.src = settings.media.heroVideo;
  hv.play().catch(()=>{});

  $$(".collection-video").forEach(v=> v.play().catch(()=>{}));

  renderFeaturedTiles();
  renderProducts();
  renderCollectionsPhoto();
  renderAboutGallery();
  renderVideoGallery();
  updateCartUI();
  bindUI();
}

init();
