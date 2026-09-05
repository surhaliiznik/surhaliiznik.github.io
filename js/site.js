/* SUR HALI - KATALOG, DETAY VE SEPET JS (v2002 FIX) */

const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";

// SyntaxError engellemek için global window nesnesine atıyoruz
if (!window.surSupabase && window.supabase) {
    window.surSupabase = window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY);
}

let currentSelectedProduct = null;

document.addEventListener("DOMContentLoaded", () => {
    initCart();
    loadSiteSettings();
    
    // URL'den kategori parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category') || "Tümü";

    // Sayfa Başlığını Güncelle
    updatePageTitle(categoryParam);

    loadCategoryBanner(categoryParam);
    loadProducts(categoryParam);
    setupFilterButtons(categoryParam);
    setupModals();
});

// Sayfa Başlığını Kategoriye Göre Güncelleme
function updatePageTitle(category) {
    const titleEl = document.getElementById("catalogTitle");
    if (titleEl) {
        titleEl.innerText = category === "Tümü" ? "Tüm Halılar" : category;
    }
}

// 1. SITE SETTINGS & LOGO
async function loadSiteSettings() {
    if (!window.surSupabase) return;
    try {
        const { data } = await window.surSupabase.from("site_settings").select("*").limit(1);
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
    
    if (!window.surSupabase || category === "Tümü" || !bannerContainer || !bannerImg) {
        if (bannerContainer) bannerContainer.style.display = "none";
        return;
    }

    try {
        // Tablodaki olası banner sütun isimlerini kontrol eder
        const { data } = await window.surSupabase
            .from("categories")
            .select("*")
            .ilike("name", category)
            .maybeSingle();

        const bannerUrl = data?.banner_url || data?.image_url || data?.cover_image;

        if (bannerUrl) {
            bannerImg.src = bannerUrl;
            bannerContainer.style.display = "block";
        } else {
            bannerContainer.style.display = "none";
        }
    } catch (e) {
        if (bannerContainer) bannerContainer.style.display = "none";
    }
}

// 3. ÜRÜNLERİ GETİR
async function loadProducts(category = "Tümü") {
    const container = document.getElementById("catalog-products-container");
    if (!container) return;

    container.innerHTML = '<div class="catalog-loading"><p>Ürünler yükleniyor...</p></div>';

    if (!window.surSupabase) {
        container.innerHTML = "<p>Veritabanı bağlantısı kurulamadı.</p>";
        return;
    }

    try {
        let query = window.surSupabase.from("products").select("*");

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
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px 0;">"${escapeHTML(category)}" kategorisinde henüz ürün bulunmuyor.</p>`;
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
        const title = product.title || product.name || product.product_name || "Halı Modeli";
        const image = product.image_url || product.image || product.photo || "assets/images/logo.jpeg";
        const price = product.price ? `${product.price} TL` : "Fiyat Sorunuz";
        const category = product.category || "";

        const card = document.createElement("div");
        card.className = "product-card";
        card.style.cssText = "border: 1px solid #eee; border-radius: 8px; padding: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
        
        card.innerHTML = `
            <div style="overflow:hidden; border-radius:6px; height:220px; background:#f9f9f9;">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='assets/images/logo.jpeg'">
            </div>
            <h3 style="font-size:1.05rem; margin:12px 0 4px 0; color:#333;">${escapeHTML(title)}</h3>
            <p style="color:#888; font-size:0.85rem; margin-bottom:8px;">${escapeHTML(category)}</p>
            <p style="font-weight:bold; color:#e67e22; font-size:1.1rem; margin:0;">${price}</p>
        `;

        // Tıklayınca Pop-up Aç
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

            const newUrl = window.location.pathname + (cat === "Tümü" ? "" : `?category=${encodeURIComponent(cat)}`);
            window.history.pushState({ path: newUrl }, '', newUrl);

            updatePageTitle(cat);
            loadCategoryBanner(cat);
            loadProducts(cat);
        });
    });
}

// 6. ÜRÜN DETAY MODAL (POP-UP)
function openProductModal(product) {
    currentSelectedProduct = product;
    
    const image = product.image_url || product.image || product.photo || 'assets/images/logo.jpeg';
    const title = product.title || product.name || product.product_name || "Halı Modeli";

    document.getElementById("modalProductImg").src = image;
    document.getElementById("modalProductTitle").innerText = title;
    document.getElementById("modalProductCategory").innerText = `Kategori: ${product.category || 'Genel'}`;
    document.getElementById("modalProductDescription").innerText = product.description || product.details || "Bu ürün için henüz açıklama detaylandırılmamış.";
    document.getElementById("modalProductPrice").innerText = product.price ? `${product.price} TL` : "Fiyat Sorunuz";

    const modal = document.getElementById("productModal");
    if (modal) modal.style.display = "flex";
}

// 7. SEPET MEKANİZMASI
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
    const title = product.title || product.name || "Halı Modeli";
    const image = product.image_url || product.image || product.photo || "";

    cart.push({
        id: product.id,
        title: title,
        price: product.price || 0,
        image_url: image
    });
    saveCart(cart);
    alert("Ürün sepete eklendi!");
}

// 8. MODAL KONTROLLERİ
function setupModals() {
    const productModal = document.getElementById("productModal");
    const cartModal = document.getElementById("cartModal");

    document.getElementById("closeModalBtn")?.addEventListener("click", () => {
        productModal.style.display = "none";
    });

    document.getElementById("modalAddToCartBtn")?.addEventListener("click", () => {
        if (currentSelectedProduct) {
            addToCart(currentSelectedProduct);
            productModal.style.display = "none";
        }
    });

    document.getElementById("cartToggleBtn")?.addEventListener("click", () => {
        renderCartItems();
        cartModal.style.display = "flex";
    });

    document.getElementById("closeCartModalBtn")?.addEventListener("click", () => {
        cartModal.style.display = "none";
    });

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
        container.innerHTML = "<p style='text-align:center; padding:20px 0;'>Sepetiniz henüz boş.</p>";
        return;
    }

    let html = "<ul style='list-style:none; padding:0; margin:0;'>";
    cart.forEach((item) => {
        html += `
            <li style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px;">
                <img src="${item.image_url || 'assets/images/logo.jpeg'}" style="width:45px; height:45px; object-fit:cover; border-radius:4px;" onerror="this.src='assets/images/logo.jpeg'">
                <span style="flex:1; margin-left:10px; font-size:0.95rem;">${escapeHTML(item.title)}</span>
                <span style="font-weight:bold; color:#e67e22;">${item.price} TL</span>
            </li>
        `;
    });
    html += "</ul>";
    container.innerHTML = html;
}

function escapeHTML(str) {
    return String(str ?? '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
