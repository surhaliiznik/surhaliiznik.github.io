/* SUR HALI - KESİN GÖRSEL VE KATEGORİ EŞLEŞTİRME KODU */

if (typeof SUR_SUPABASE_URL === 'undefined') {
    var SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
}
if (typeof SUR_SUPABASE_KEY === 'undefined') {
    var SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";
}

if (!window.surClient && window.supabase) {
    window.surClient = window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY);
}

var currentSelectedProduct = null;

document.addEventListener("DOMContentLoaded", function () {
    initCart();
    loadSiteSettings();
    
    var urlParams = new URLSearchParams(window.location.search);
    var categoryParam = urlParams.get('category') || "Tümü";

    updatePageTitle(categoryParam);
    loadCategoryBanner(categoryParam);
    loadProducts(categoryParam);
    setupFilterButtons(categoryParam);
    setupModals();
});

function updatePageTitle(category) {
    var titleEl = document.getElementById("catalogTitle");
    if (titleEl) {
        titleEl.innerText = (category === "Tümü" || !category) ? "Tüm Halılar" : category;
    }
}

async function loadSiteSettings() {
    if (!window.surClient) return;
    try {
        var res = await window.surClient.from("site_settings").select("*").limit(1);
        if (res.data && res.data[0] && res.data[0].logo_url) {
            var logoImg = document.getElementById("siteLogo");
            if (logoImg) logoImg.src = res.data[0].logo_url;
        }
    } catch (e) {
        console.error("Logo yüklenemedi:", e);
    }
}

// 1. KATALOG KAPAK RESMİ YÜKLEME
async function loadCategoryBanner(category) {
    var bannerContainer = document.getElementById("bannerImageContainer");
    var bannerImg = document.getElementById("categoryBannerImg");
    
    if (!window.surClient || category === "Tümü" || !bannerContainer || !bannerImg) {
        if (bannerContainer) bannerContainer.style.display = "none";
        return;
    }

    try {
        var res = await window.surClient
            .from("category_images")
            .select("*")
            .ilike("category", category)
            .maybeSingle();

        if (!res.data) {
            res = await window.surClient
                .from("category_covers")
                .select("*")
                .ilike("category", category)
                .maybeSingle();
        }

        var data = res.data;
        var bannerUrl = data ? (data.image_url || data.image_path) : null;

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

// 2. KATEGORİ VE ÜRÜN FİLTRELEME
async function loadProducts(category) {
    if (!category) category = "Tümü";
    var container = document.getElementById("catalog-products-container");
    if (!container) return;

    container.innerHTML = '<div class="catalog-loading"><p>Ürünler yükleniyor...</p></div>';

    if (!window.surClient) {
        container.innerHTML = "<p>Veritabanı bağlantısı kurulamadı.</p>";
        return;
    }

    try {
        var res = await window.surClient.from("products").select("*");
        var allProducts = res.data;
        var error = res.error;

        if (error) {
            console.error("Ürün hatası:", error);
            container.innerHTML = "<p>Ürünler yüklenirken bir hata oluştu.</p>";
            return;
        }

        if (!allProducts || allProducts.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px 0;">Veritabanında ürün bulunamadı.</p>';
            return;
        }

        // Esnek Kategori Filtreleme
        var filteredProducts = allProducts;
        if (category !== "Tümü") {
            var targetCat = category.toLocaleLowerCase('tr-TR').trim();
            filteredProducts = allProducts.filter(function (p) {
                var pCat = (p.category || "").toLocaleLowerCase('tr-TR').trim();
                return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
            });
        }

        if (filteredProducts.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px 0;">"' + escapeHTML(category) + '" kategorisinde ürün bulunamadı.</p>';
            return;
        }

        renderProducts(filteredProducts, container);

    } catch (err) {
        console.error("Hata:", err);
        container.innerHTML = "<p>Sistem hatası oluştu.</p>";
    }
}

function renderProducts(products, container) {
    container.innerHTML = "";

    products.forEach(function (product) {
        var title = product.title || product.name || product.product_name || "Halı Modeli";
        // Doğrudan Supabase'deki image_url sütununu alır
        var image = product.image_url || product.image_path || product.image || "assets/images/logo.jpeg";
        var price = product.price ? product.price + " TL" : "Fiyat Sorunuz";
        var category = product.category || "";

        var card = document.createElement("div");
        card.className = "product-card";
        card.style.cssText = "border: 1px solid #eee; border-radius: 8px; padding: 12px; cursor: pointer; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
        
        card.innerHTML = 
            '<div style="overflow:hidden; border-radius:6px; height:220px; background:#f9f9f9;">' +
                '<img src="' + escapeHTML(image) + '" alt="' + escapeHTML(title) + '" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=\'assets/images/logo.jpeg\'">' +
            '</div>' +
            '<h3 style="font-size:1.05rem; margin:12px 0 4px 0; color:#333;">' + escapeHTML(title) + '</h3>' +
            '<p style="color:#888; font-size:0.85rem; margin-bottom:8px;">' + escapeHTML(category) + '</p>' +
            '<p style="font-weight:bold; color:#e67e22; font-size:1.1rem; margin:0;">' + price + '</p>';

        card.addEventListener("click", function () {
            openProductModal(product);
        });

        container.appendChild(card);
    });
}

function setupFilterButtons(activeCategory) {
    var buttons = document.querySelectorAll(".category-filter");
    buttons.forEach(function (btn) {
        var cat = btn.getAttribute("data-category");
        if (cat === activeCategory) btn.classList.add("active");
        else btn.classList.remove("active");

        btn.addEventListener("click", function () {
            buttons.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var newUrl = window.location.pathname + (cat === "Tümü" ? "" : "?category=" + encodeURIComponent(cat));
            window.history.pushState({ path: newUrl }, '', newUrl);

            updatePageTitle(cat);
            loadCategoryBanner(cat);
            loadProducts(cat);
        });
    });
}

function openProductModal(product) {
    currentSelectedProduct = product;
    
    var image = product.image_url || product.image_path || product.image || 'assets/images/logo.jpeg';
    var title = product.title || product.name || product.product_name || "Halı Modeli";

    var imgEl = document.getElementById("modalProductImg");
    var titleEl = document.getElementById("modalProductTitle");
    var catEl = document.getElementById("modalProductCategory");
    var descEl = document.getElementById("modalProductDescription");
    var priceEl = document.getElementById("modalProductPrice");

    if (imgEl) imgEl.src = image;
    if (titleEl) titleEl.innerText = title;
    if (catEl) catEl.innerText = "Kategori: " + (product.category || 'Genel');
    if (descEl) descEl.innerText = product.description || product.details || "Bu ürün için detaylı açıklama girilmemiş.";
    if (priceEl) priceEl.innerText = product.price ? product.price + " TL" : "Fiyat Sorunuz";

    var modal = document.getElementById("productModal");
    if (modal) modal.style.display = "flex";
}

function getCart() {
    return JSON.parse(localStorage.getItem("sur_cart") || "[]");
}

function saveCart(cart) {
    localStorage.setItem("sur_cart", JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    var cart = getCart();
    var countBadge = document.getElementById("cartCount");
    if (countBadge) countBadge.innerText = cart.length;
}

function initCart() {
    updateCartBadge();
}

function addToCart(product) {
    if (!product) return;
    var cart = getCart();
    var title = product.title || product.name || "Halı Modeli";
    var image = product.image_url || product.image_path || "";

    cart.push({
        id: product.id,
        title: title,
        price: product.price || 0,
        image_url: image
    });
    saveCart(cart);
    alert("Ürün sepete eklendi!");
}

function setupModals() {
    var productModal = document.getElementById("productModal");
    var cartModal = document.getElementById("cartModal");

    var closeModalBtn = document.getElementById("closeModalBtn");
    if (closeModalBtn) closeModalBtn.addEventListener("click", function () { productModal.style.display = "none"; });

    var modalAddToCartBtn = document.getElementById("modalAddToCartBtn");
    if (modalAddToCartBtn) modalAddToCartBtn.addEventListener("click", function () {
        if (currentSelectedProduct) {
            addToCart(currentSelectedProduct);
            productModal.style.display = "none";
        }
    });

    var cartToggleBtn = document.getElementById("cartToggleBtn");
    if (cartToggleBtn) cartToggleBtn.addEventListener("click", function () {
        renderCartItems();
        cartModal.style.display = "flex";
    });

    var closeCartModalBtn = document.getElementById("closeCartModalBtn");
    if (closeCartModalBtn) closeCartModalBtn.addEventListener("click", function () { cartModal.style.display = "none"; });

    var clearCartBtn = document.getElementById("clearCartBtn");
    if (clearCartBtn) clearCartBtn.addEventListener("click", function () {
        saveCart([]);
        renderCartItems();
    });
}

function renderCartItems() {
    var cart = getCart();
    var container = document.getElementById("cartItemsContainer");
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px 0;'>Sepetiniz henüz boş.</p>";
        return;
    }

    var html = "<ul style='list-style:none; padding:0; margin:0;'>";
    cart.forEach(function (item) {
        html += 
            '<li style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px;">' +
                '<img src="' + (item.image_url || 'assets/images/logo.jpeg') + '" style="width:45px; height:45px; object-fit:cover; border-radius:4px;" onerror="this.src=\'assets/images/logo.jpeg\'">' +
                '<span style="flex:1; margin-left:10px; font-size:0.95rem;">' + escapeHTML(item.title) + '</span>' +
                '<span style="font-weight:bold; color:#e67e22;">' + item.price + ' TL</span>' +
            '</li>';
    });
    html += "</ul>";
    container.innerHTML = html;
}

function escapeHTML(str) {
    return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
