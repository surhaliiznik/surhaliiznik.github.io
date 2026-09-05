if (!window.__SUR_SITE_JS_LOADED__) {
    window.__SUR_SITE_JS_LOADED__ = true;

    const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
    const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";

    window.surClient = window.supabase ? window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY) : null;
    let assistantProducts = [];

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function productTitle(product) {
        return product.title || product.name || "Halı Modeli";
    }

    // Görsel URL'sini garantileyen ve kırılmaları önleyen fonksiyon
    function getProductImage(product) {
        const url = product.image_url || product.image || product.img_url || product.img;
        if (!url || url.trim() === "" || url.includes("null")) {
            return "https://via.placeholder.com/400x400?text=G%C3%B6rsel+Y%C3%BCkleniyor";
        }
        return url;
    }

    // Kategori kapak resimlerini (category_images tablosundan) doldurur
    async function loadCategoryCovers() {
        if (!window.surClient) return;
        try {
            const { data: categories } = await window.surClient.from("category_images").select("*");
            if (!categories) return;

            categories.forEach(cat => {
                const el = document.querySelector(`[data-category-cover="${cat.name}"], [data-category="${cat.name}"]`);
                if (el) {
                    const imgUrl = cat.image_url || cat.image || cat.url;
                    if (imgUrl) {
                        if (el.tagName === 'IMG') {
                            el.src = imgUrl;
                        } else {
                            el.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${imgUrl}')`;
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Kategori kapakları yüklenirken hata:", err);
        }
    }

    // Katalog Ürünlerini Getiren Temel Fonksiyon
    async function loadCatalogProducts(categoryName = null) {
        const container = document.getElementById("catalog-products-container");
        if (!container) return;

        if (!window.surClient) {
            container.innerHTML = `<p class="error-msg">Supabase bağlantısı kurulamadı.</p>`;
            return;
        }

        try {
            let query = window.surClient.from("products").select("*").eq("is_active", true);

            // Filtreleme mantığı: Eğer kategori parametresi varsa filtrele
            if (categoryName && categoryName !== "Tümü" && categoryName !== "Halılar") {
                query = query.eq("category", categoryName);
            }

            const { data: products, error } = await query;

            if (error) {
                console.error("Katalog sorgu hatası:", error);
                container.innerHTML = `<p class="error-msg">Ürünler yüklenirken bir hata oluştu.</p>`;
                return;
            }

            // 'type' veya 'is_category' gibi alanlarla girilmiş kapak kaydı varsa filtrele
            const cleanProducts = (products || []).filter(p => !p.is_category && p.type !== "category_cover");

            if (cleanProducts.length === 0) {
                container.innerHTML = `<p class="no-products">Bu kategoride gösterilecek ürün bulunamadı.</p>`;
                return;
            }

            window.currentCatalogProducts = cleanProducts;

            // Kart Yapısı ve Görsel Yükleme
            container.innerHTML = cleanProducts.map(product => `
                <div class="product-card" data-product-id="${product.id}">
                    <div class="img-wrapper" style="width:100%; height:260px; overflow:hidden; background:#f5f5f5; border-radius:6px;">
                        <img src="${escapeHTML(getProductImage(product))}" 
                             alt="${escapeHTML(productTitle(product))}" 
                             loading="lazy" 
                             style="width:100%; height:100%; object-fit:cover;"
                             onerror="this.src='https://via.placeholder.com/400x400?text=G%C3%B6rsel+A%C3%A7%C4%B1lmad%C4%B1'">
                    </div>
                    <h3 style="margin:10px 0 5px 0; font-size:16px;">${escapeHTML(productTitle(product))}</h3>
                    <p class="category" style="color:#666; font-size:13px; margin-bottom:10px;">${escapeHTML(product.category || '')}</p>
                    <button type="button" class="btn-detail" data-id="${product.id}">İncele & Detaylar</button>
                </div>
            `).join("");

        } catch (err) {
            console.error("Katalog yükleme beklenmeyen hata:", err);
        }
    }

    // Detay Modal (Açıklama Penceresi) Fonksiyonları
    window.openProductModal = function(productId) {
        const product = (window.currentCatalogProducts || []).find(p => String(p.id) === String(productId));
        if (!product) return;

        let modal = document.getElementById("product-detail-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "product-detail-modal";
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content" style="background:#fff; padding:25px; max-width:550px; width:90%; margin:auto; border-radius:10px; position:relative; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <span class="close-modal" onclick="closeProductModal()" style="position:absolute; top:12px; right:18px; cursor:pointer; font-size:28px; color:#333;">&times;</span>
                <div class="modal-body">
                    <img src="${escapeHTML(getProductImage(product))}" alt="${escapeHTML(productTitle(product))}" style="width:100%; max-height:320px; object-fit:cover; border-radius:8px;">
                    <div class="modal-info" style="margin-top:15px; text-align:left;">
                        <h2 style="margin-bottom:10px; font-size:20px;">${escapeHTML(productTitle(product))}</h2>
                        <p style="margin:5px 0;"><strong>Kategori:</strong> ${escapeHTML(product.category || '-')}</p>
                        <p style="margin:5px 0;"><strong>Ölçü:</strong> ${escapeHTML(product.size || 'Belirtilmedi')}</p>
                        <p style="margin:5px 0; color:#d97706; font-weight:bold; font-size:16px;"><strong>Fiyat:</strong> ${product.price ? product.price + ' TL' : 'İletişime Geçiniz'}</p>
                        <hr style="margin:12px 0; border:0; border-top:1px solid #eee;">
                        <p style="margin:5px 0; line-height:1.5; color:#444;"><strong>Açıklama:</strong><br>${escapeHTML(product.description || 'Bu ürün için henüz detaylı açıklama eklenmedi.')}</p>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.6)";
        modal.style.zIndex = "99999";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
    };

    window.closeProductModal = function() {
        const modal = document.getElementById("product-detail-modal");
        if (modal) modal.style.display = "none";
    };

    // Global Tıklama Dinleyicisi (Modal Tetikleme)
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-detail");
        if (btn && btn.dataset.id) {
            e.preventDefault();
            window.openProductModal(btn.dataset.id);
        }
        if (e.target.id === "product-detail-modal") {
            window.closeProductModal();
        }
    });

    // Sayfa Yüklendiğinde Tetiklenen Kısım
    document.addEventListener("DOMContentLoaded", () => {
        loadCategoryCovers();
        const categoryParam = new URLSearchParams(window.location.search).get("category");
        loadCatalogProducts(categoryParam);
    });
}
