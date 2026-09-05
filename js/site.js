/* SUR HALI - KATALOG, DETAY VE SEPET JS */

const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";

const supabase = window.supabase ? window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY) : null;

let currentSelectedProduct = null;

// PAGE LOAD
document.addEventListener("DOMContentLoaded", () => {
    initCart();
    loadSiteSettings();
    
    // URL'den kategori parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category') || "Tümü";

    loadCategoryBanner(categoryParam);
    loadProducts(categoryParam);
    setupFilterButtons(categoryParam);
    setupModals();
});

// 1. SITE SETTINGS & LOGO
async function loadSiteSettings() {
    if (!supabase) return;
    try {
        const { data, error } = await supabase.from("site_settings").select("*").limit(1);
        if (data && data[0] && data[0].logo_url) {
            const logoImg = document.getElementById("siteLogo");
            if (logoImg) logoImg.src = data[0].logo_url;
        }
    } catch (e) {
        console.error("Site ayarları yüklenemedi:", e);
    }
}

// 2. BANNER VE KAPAK RESMİ
async function loadCategoryBanner(category) {
    const bannerContainer = document.getElementById("bannerImageContainer");
    const bannerImg = document.getElementById("categoryBannerImg");
    
    if (!supabase || category === "Tümü") {
        if (bannerContainer) bannerContainer.style.display = "none";
        return;
    }

    try {
        const { data } = await supabase.from("categories").select("banner_url").eq("name", category).maybeSingle();
        if (data && data.banner_url) {
            bannerImg.src = data.banner_url;
            bannerContainer.style.display = "block";
        } else {
            bannerContainer.style.display = "none";
        }
    } catch (e) {
        bannerContainer.style.display = "none";
    }
}

// 3. ÜRÜNLERİ GETİR
async function loadProducts(category = "Tümü") {
    const container = document.getElementById("catalog-products-container");
    if (!container) return;

    container.innerHTML = '<div class="catalog-loading"><p>Ürünler yükleniyor...</p></div>';

    if (!supabase) {
        container.innerHTML = "<p>Veritabanı bağlantısı kurulamadı.</p>";
        return;
    }

    try {
        let query = supabase.from("products").select("*").eq("is_active", true);

        if (category !== "Tümü") {
            query = query.eq("category", category);
        }

        const { data: products, error } = await query;

        if (error) {
            console.error("Ürün yükleme hatası:", error);
            container.innerHTML = "<p>Ürünler yüklenirken bir hata oluştu.</p>";
            return;
        }

        if (!products || products.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">"${escapeHTML(category)}" kategorisinde ürün bulunamadı.</p>`;
            return;
        }

        renderProducts(products, container);

    } catch (err) {
        console.error("Beklenmeyen hata:", err);
        container.innerHTML = "<p>Sistem hatası oluştu.</p>";
    }
}

// 4. ÜRÜNLERİ EKRANA BAS
function renderProducts(products, container) {
    container.innerHTML = "";

    products.forEach(product => {
        const title = product.title || product.name || "Halı Modeli";
        const image = product.image_url || "assets/images/placeholder.jpg";
        const price = product.price ? `${product.price} TL` : "Fiyat Sorunuz";
        const category = product.category || "";

        const card = document.createElement("div");
        card.className = "product-card";
        card.style.cssText = "border: 1px solid #eee; border-radius: 8px; padding: 10px; cursor: pointer; transition: transform 0.2s;";
        
        card.innerHTML = `
            <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" style="width:100%; height:200px; object-fit:cover; border-radius:6px;" onerror="this.src='assets/images/placeholder.jpg'">
            <h3 style="font-size:1.1rem; margin:10px 0 5px 0;">${escapeHTML(title)}</h3>
            <p style="color:#777; font-size:0.85rem; margin-bottom:5px;">${escapeHTML(category)}</p>
            <p style="font-weight:bold; color:#e67e22;">${price}</p>
        `;

        // Resme/Karta basınca DETAY MODAL'ı aç
        card.addEventListener("click", () => openProductModal(product));

        container.appendChild(card);
    });
}

// 5. KATEGORİ FİLTRE BUTONLARI
function setupFilterButtons(activeCategory) {
    const buttons = document.querySelectorAll(".category-filter");
    buttons.forEach(btn => {
        const cat = btn.getAttribute("data-category");
        if (cat === activeCategory) btn.classList.add("active");
        else btn.classList.remove("active");

        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // URL parametresini güncelle (Sayfa yenilenmeden)
            const newUrl = window.location.pathname + (cat === "Tümü" ? "" : `?category=${encodeURIComponent(cat)}`);
            window.history.pushState({ path: newUrl }, '', newUrl);

            // Başlıkları ve Banner'ı güncelle
            document.getElementById("catalogTitle").innerText = cat === "Tümü" ? "Halılar" : cat;
            loadCategoryBanner(cat);
            loadProducts(cat);
        });
    });
}

// 6. ÜRÜN DETAY MODAL
function openProductModal(product) {
    currentSelectedProduct = product;
    
    document.getElementById("modalProductImg").src = product.image_url || 'assets/images/placeholder.jpg';
    document.getElementById("modalProductTitle").innerText = product.title || product.name || "Halı Modeli";
    document.getElementById("modalProductCategory").innerText = `Kategori: ${product.category || 'Genel'}`;
    document.getElementById("modalProductDescription").innerText = product.description || "Bu ürün için henüz açıklama girilmemiş.";
    document.getElementById("modalProductPrice").innerText = product.price ? `${product.price} TL` : "Fiyat Sorunuz";

    const modal = document.getElementById("productModal");
    if (modal) modal.style.display = "flex";
}

// 7. SEPET MEKANİZMASI (localStorage)
function getCart() {
    return JSON.parse(localStorage.getItem("sur_cart") || "[]");
}

function saveCart(cart) {
    localStorage.setItem("sur_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const cart = getCart();
    const countBadge = document.getElementById("cartCount");
    if (countBadge) countBadge.innerText = cart.length;
}

function initCart() {
    updateCartBadge();
}

function addToCart(product) {
    if (!product) return;
    const cart = getCart();
    cart.push({
        id: product.id,
        title: product.title || product.name,
        price: product.price || 0,
        image_url: product.image_url
    });
    saveCart(cart);
    alert("Ürün sepete eklendi!");
}

// 8. MODAL KONTROLLERİ
function setupModals() {
    const productModal = document.getElementById("productModal");
    const cartModal = document.getElementById("cartModal");

    // Detay Modal Kapat
    document.getElementById("closeModalBtn")?.addEventListener("click", () => {
        productModal.style.display = "none";
    });

    // Detay Modaldan Sepete Ekle
    document.getElementById("modalAddToCartBtn")?.addEventListener("click", () => {
        if (currentSelectedProduct) {
            addToCart(currentSelectedProduct);
            productModal.style.display = "none";
        }
    });

    // Sepet Modalı Aç
    document.getElementById("cartToggleBtn")?.addEventListener("click", () => {
        renderCartItems();
        cartModal.style.display = "flex";
    });

    // Sepet Modalı Kapat
    document.getElementById("closeCartModalBtn")?.addEventListener("click", () => {
        cartModal.style.display = "none";
    });

    // Sepeti Temizle
    document.getElementById("clearCartBtn")?.addEventListener("click", () => {
        saveCart([]);
        renderCartItems();
    });
}

function renderCartItems() {
    const cart = getCart();
    const container = document.getElementById("cartItemsContainer");
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p>Sepetiniz boş.</p>";
        return;
    }

    let html = "<ul style='list-style:none; padding:0;'>";
    cart.forEach((item, index) => {
        html += `
            <li style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <img src="${item.image_url || 'assets/images/placeholder.jpg'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                <span style="flex:1; margin-left:10px;">${escapeHTML(item.title)}</span>
                <span style="font-weight:bold; margin-right:10px;">${item.price} TL</span>
            </li>
        `;
    });
    html += "</ul>";
    container.innerHTML = html;
}

// YARDIMCI GÜVENLİK FONKSİYONU
function escapeHTML(str) {
    return String(str ?? '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
