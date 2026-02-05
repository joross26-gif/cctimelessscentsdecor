const WHATSAPP_NUMBER = "2348108693787";
const PRODUCTS_URL = "/products.json";

function formatNaira(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

function whatsappOrderLink(product) {
  const msg =
    `Hello! I want to order:\n` +
    `${product.name}\n` +
    `Price: ${formatNaira(product.price)}\n` +
    `Product ID: ${product.id}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

async function loadProducts() {
  const res = await fetch(PRODUCTS_URL);
  return await res.json();
}

function renderShop(products) {
  const container = document.getElementById("shopGrid");
  if (!container) {
    console.error("❌ Missing <div id='shopGrid'></div>");
    return;
  }

  container.innerHTML = products
    .filter(p => Number(p.price) > 0)
    .map(p => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p class="price">${formatNaira(p.price)}</p>
        <p class="short">${p.short || ""}</p>
        <a class="btn-order" href="${whatsappOrderLink(p)}" target="_blank">
          Order on WhatsApp
        </a>
      </div>
    `)
    .join("");
}

loadProducts()
  .then(renderShop)
  .catch(err => console.error("❌ Shop error:", err));
