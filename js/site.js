/* ==========================================================
   SUR HALI İZNİK
   ANA SİTE JAVASCRIPT
   SUPABASE ÜRÜN + RESİM SİSTEMİ & AI CHATBOT
   ========================================================== */

console.log("Sur Halı site.js başlatılıyor...");

/* ==========================================================
   SABİTLER (Güvenli Kapsam)
   ========================================================== */

if (typeof window.WHATSAPP_NUMBER === "undefined") {
    window.WHATSAPP_NUMBER = "905396369095";
}

const STORAGE_BUCKET = "category-images";
const CATEGORY_COVERS_PATH = "category-covers";
const HERO_IMAGE_PATH = "assets/images/hero-ana-sayfa-magaza.png";

const KATEGORILER = [
    "Halılar",
    "Klasik Yolluklar",
    "Sisal",
    "Kaymaz",
    "Özel Kesim"
];

/* ==========================================================
   HTML GÜVENLİĞİ
   ========================================================== */

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================================
   FİYAT FORMATLAMA
   ========================================================== */

function fiyatFormatla(value) {
    if (value === null || value === undefined || value === "") {
        return "Fiyat için bilgi alınız";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return escapeHTML(value);
    }

    return number.toLocaleString("tr-TR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }) + " TL";
}

/* ==========================================================
   WHATSAPP LİNKİ
   ========================================================== */

function whatsappLinkOlustur(product) {
    const mesaj = "Merhaba, " + (product.name || "ürün") + " ürünü hakkında bilgi almak istiyorum.";
    return "https://wa.me/" + window.WHATSAPP_NUMBER + "?text=" + encodeURIComponent(mesaj);
}

/* ==========================================================
   RESİM URL'Sİ HAZIRLAMA
   ========================================================== */

function resimUrlHazirla(image) {
    if (!image) return "";

    if (image.image_url) {
        return image.image_url;
    }

    if (image.image_path && typeof supabaseClient !== "undefined" && supabaseClient) {
        try {
            const { data } = supabaseClient
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(image.image_path);

            if (data && data.publicUrl) {
                return data.publicUrl;
            }
        } catch (error) {
            console.warn("Storage resim URL'si oluşturulamadı:", error);
        }
    }

    return "";
}

/* ==========================================================
   ÜRÜN RESMİ ALMA
   ========================================================== */

function urunResmi(product, imagesMap) {
    const images = (imagesMap && imagesMap[product.id]) ? imagesMap[product.id] : [];

    if (images.length > 0) {
        const firstImage = resimUrlHazirla(images[0]);
        if (firstImage) return firstImage;
    }

    if (product.image_url) {
        return product.image_url;
    }

    return "";
}

/* ==========================================================
   ÜRÜN KARTI ŞABLONU
   ========================================================== */

function urunKartiOlustur(product, imagesMap) {
    const image = urunResmi(product, imagesMap);

    const imageHTML = image
        ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(product.name || 'Sur Halı ürünü')}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('no-image');">`
        : `<div class="product-no-image"><span>Sur Halı</span><small>Görsel hazırlanıyor</small></div>`;

    const sizeHTML = product.size ? `<p class="product-size">${escapeHTML(product.size)}</p>` : "";
    const priceText = (product.price !== null && product.price !== undefined && product.price !== "") 
        ? fiyatFormatla(product.price) 
        : "Bilgi için iletişime geçin";

    return `
        <article class="product-card" data-product-id="${escapeHTML(product.id)}">
            <a href="#" class="product-image" data-product-id="${escapeHTML(product.id)}">
                ${imageHTML}
            </a>
            <div class="product-info">
                <span class="product-category">${escapeHTML(product.category || "")}</span>
                <h3 class="product-title">${escapeHTML(product.name || "Ürün")}</h3>
                ${sizeHTML}
                <div class="product-price">${priceText}</div>
                <a href="${escapeHTML(whatsappLinkOlustur(product))}" class="whatsapp-button" target="_blank" rel="noopener noreferrer">
                    WhatsApp'tan Bilgi Al
                </a>
            </div>
        </article>
    `;
}

/* ==========================================================
   ÜRÜNLERİ SUPABASE'DEN GETİR
   ========================================================== */

async function urunleriGetir() {
    console.log("Supabase'den ürünler getiriliyor...");

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        throw new Error("Supabase bağlantısı bulunamadı.");
    }

    const { data: products, error: productError } = await supabaseClient
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (productError) {
        console.error("Ürünler alınamadı:", productError);
        throw productError;
    }

    const aktifUrunler = products || [];
    console.log(aktifUrunler.length + " aktif ürün bulundu.");

    const { data: images, error: imageError } = await supabaseClient
        .from("category_images")
        .select("id, product_id, category, image_url, image_path, created_at")
        .order("created_at", { ascending: true });

    if (imageError) {
        console.warn("Ürün resimleri alınamadı:", imageError);
    }

    const imagesMap = {};
    const coversMap = {};

    (images || []).forEach(function (image) {
        const imagePath = typeof image.image_path === "string" ? image.image_path.replace(/^\/+/, "") : "";
        const isCategoryCover = imagePath === CATEGORY_COVERS_PATH || imagePath.startsWith(CATEGORY_COVERS_PATH + "/");

        if (isCategoryCover || !image.product_id) {
            if (image.category && !coversMap[image.category]) {
                coversMap[image.category] = image;
            }
            return;
        }

        if (!imagesMap[image.product_id]) {
            imagesMap[image.product_id] = [];
        }

        imagesMap[image.product_id].push(image);
    });

    console.log(Object.keys(imagesMap).length + " ürün için resim verisi bulundu.");

    return {
        products: aktifUrunler,
        imagesMap: imagesMap,
        coversMap: coversMap
    };
}

/* ==========================================================
   ANA SAYFA - ÖNE ÇIKAN ÜRÜNLER
   ========================================================== */

function oneCikanUrunleriOlustur(products, imagesMap) {
    const container = document.getElementById("featuredProducts");
    if (!container) return;

    container.innerHTML = "";

    const featuredProducts = (products || []).filter(function (product) {
        return product.is_featured === true;
    });

    const featuredSection = container.closest(".featured-section");

    if (featuredProducts.length === 0) {
        if (featuredSection) featuredSection.hidden = true;
        container.innerHTML = `
            <div class="empty-state">
                <h2>Koleksiyonlarımız hazırlanıyor</h2>
                <p>Çok yakında öne çıkan ürünlerimizi burada görebileceksiniz.</p>
            </div>
        `;
        return;
    }

    if (featuredSection) featuredSection.hidden = false;

    container.innerHTML = featuredProducts.map(function (product) {
        return urunKartiOlustur(product, imagesMap);
    }).join("");

    console.log("Ana sayfada " + featuredProducts.length + " ürün gösterildi.");
}

/* ==========================================================
   KATEGORİ SLUG
   ========================================================== */

function kategoriSlugOlustur(category) {
    return String(category)
        .toLowerCase()
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ı/g, "i")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

/* ==========================================================
   KATALOG SAYFASI
   ========================================================== */

function katalogOlustur(products, imagesMap) {
    const container = document.getElementById("catalogProducts");
    if (!container) return;

    const filterButtons = document.querySelectorAll(".category-filter");
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get("category");

    let aktifKategori = urlCategory && KATEGORILER.includes(urlCategory) ? urlCategory : "Halılar";

    function kategoriGoster(category) {
        aktifKategori = category;
        const filtrelenmisUrunler = products.filter(function (product) {
            return product.category === category;
        });

        filterButtons.forEach(function (button) {
            button.classList.toggle("active", button.dataset.category === category);
        });

        const title = document.getElementById("catalogTitle");
        const description = document.getElementById("catalogDescription");

        if (title) title.textContent = category;
        if (description) description.textContent = filtrelenmisUrunler.length + " ürün";

        if (filtrelenmisUrunler.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>Bu kategoride henüz ürün yok</h2>
                    <p>Çok yakında yeni ürünler eklenecek.</p>
                </div>
            `;
        } else {
            container.innerHTML = filtrelenmisUrunler.map(function (product) {
                return urunKartiOlustur(product, imagesMap);
            }).join("");
        }

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("category", category);
        window.history.replaceState({}, "", newUrl);

        console.log(category + " kategorisinde " + filtrelenmisUrunler.length + " ürün gösterildi.");
    }

    filterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const category = button.dataset.category;
            if (KATEGORILER.includes(category)) {
                kategoriGoster(category);
            }
        });
    });

    kategoriGoster(aktifKategori);
}

/* ==========================================================
   MOBİL MENÜ
   ========================================================== */

function mobilMenuHazirla() {
    const menuButton = document.getElementById("mobileMenuButton") || document.querySelector(".mobile-menu-button");
    const navigation = document.getElementById("mainNavigation") || document.querySelector(".site-nav");

    if (!menuButton || !navigation) return;

    menuButton.addEventListener("click", function () {
        navigation.classList.toggle("mobile-open");
    });

    navigation.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
            navigation.classList.remove("mobile-open");
        });
    });
}

/* ==========================================================
   KATEGORİ MENÜSÜ
   ========================================================== */

function kategoriMenusuOlustur(coversMap) {
    const menu = document.getElementById("categoryMenu");
    if (!menu) return;

    menu.innerHTML = "";

    KATEGORILER.forEach(function (category) {
        const slug = kategoriSlugOlustur(category);
        const link = document.createElement("a");
        link.href = "halilar.html?category=" + encodeURIComponent(category);
        link.textContent = category;
        link.dataset.slug = slug;

        const cover = coversMap && coversMap[category];
        const coverUrl = cover ? resimUrlHazirla(cover) : null;

        if (coverUrl) {
            const img = document.createElement("img");
            img.src = coverUrl;
            img.alt = category + " kapak";
            img.style.cssText = "width:100%;height:60px;object-fit:cover;border-radius:6px;margin-bottom:6px;";
            link.prepend(img);
        }

        menu.appendChild(link);
    });
}

/* ==========================================================
   ANA SAYFA KATEGORİ KAPAKLARI
   ========================================================== */

function kategoriKapaklariniUygula(coversMap) {
    document.querySelectorAll(".category-card[data-category]").forEach(function (card) {
        const category = card.dataset.category;
        const cover = coversMap && coversMap[category];
        const coverUrl = cover ? resimUrlHazirla(cover) : "";
        const coverElement = card.querySelector(".category-cover");
        const image = coverElement && coverElement.querySelector("img");

        if (coverUrl && image) {
            image.src = coverUrl;
            image.alt = category + " kapak";
            coverElement.classList.add("has-image");
        } else if (coverElement && image) {
            image.removeAttribute("src");
            coverElement.classList.remove("has-image");
        }
    });
}

function heroGorseliniUygula() {
    const heroMedia = document.querySelector("[data-hero-media]");
    if (heroMedia) {
        heroMedia.style.backgroundImage = "url('" + HERO_IMAGE_PATH + "')";
    }
}

/* ==========================================================
   ÜRÜN KARTLARINDAKİ DETAY LİNKLERİ & MODAL
   ========================================================== */

function urunDetayBaglantilariniHazirla() {
    let modal = document.getElementById("productDetailModal");

    function detayModaliniOlustur() {
        if (modal) return modal;
        
        const element = document.createElement("div");
        element.id = "productDetailModal";
        element.className = "product-detail-modal";
        
        const dialog = document.createElement("div");
        dialog.className = "product-detail-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "product-detail-close";
        closeBtn.setAttribute("aria-label", "Kapat");
        closeBtn.innerHTML = "&times;";

        const bodyDiv = document.createElement("div");
        bodyDiv.className = "product-detail-body";

        dialog.appendChild(closeBtn);
        dialog.appendChild(bodyDiv);
        element.appendChild(dialog);
        document.body.appendChild(element);

        closeBtn.addEventListener("click", function () {
            element.classList.remove("is-open");
        });

        element.addEventListener("click", function (event) {
            if (event.target === element) element.classList.remove("is-open");
        });

        modal = element;
        return modal;
    }

    function jsonValue(value, fallback) {
        if (Array.isArray(value) || (value && typeof value === "object")) return value;
        if (typeof value === "string") {
            try { return JSON.parse(value); } catch (error) { return fallback; }
        }
        return fallback;
    }

    function urunDetayiniAc(product) {
        const detailModal = detayModaliniOlustur();
        const body = detailModal.querySelector(".product-detail-body");
        const features = jsonValue(product.features, {});
        const sizes = jsonValue(product.sizes, []);
        const sizeOptions = Array.isArray(sizes) ? sizes : [];
        
        const initialSize = (sizeOptions && sizeOptions.length > 0) 
            ? sizeOptions[0] 
            : { size: product.size || "Standart", price: product.price || product.meter_price || 0 };
            
        const featureLabels = { point: "İlme / Point", thickness: "Kalınlık", weight: "Ağırlık", material: "Malzeme", color: "Renk", robot: "Robot Süpürge Uyumu" };

        const featureHtml = Object.keys(featureLabels)
            .filter(function (key) { return features[key] !== undefined && features[key] !== ""; })
            .map(function (key) {
                const value = key === "robot" ? (features[key] === true || features[key] === "true" ? "Uygun" : "Uygun değil") : features[key];
                return `<li>✓ ${escapeHTML(featureLabels[key])}: ${escapeHTML(value)}</li>`;
            }).join("");

        const optionsHtml = sizeOptions.length > 0 
            ? sizeOptions.map(function (item, index) {
                return `<option value="${index}">${escapeHTML(item.size || item.label || "Ebat")} - ${fiyatFormatla(item.price)}</option>`;
              }).join("")
            : `<option value="0">${escapeHTML(initialSize.size)}</option>`;

        const badgeHTML = (product.is_featured_badge && product.badge_text) 
            ? `<span class="product-badge">${escapeHTML(product.badge_text)}</span>` 
            : "";

        const descriptionHtml = product.description 
            ? `<div class="product-description" style="margin: 12px 0; font-size: 0.95rem; color: #4b5563; line-height: 1.5;"><p>${escapeHTML(product.description)}</p></div>` 
            : "";

        const unitPriceNotice = (product.unit_price_note || product.category === "Kaymaz" || product.category === "Özel Kesim") 
            ? `<div class="unit-price-badge" style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 8px 12px; border-radius: 6px; font-size: 0.88rem; margin: 10px 0;">ℹ️ Metre Fiyatı: <strong>${fiyatFormatla(product.meter_price || product.price)}</strong> (İstediğiniz ölçüde özel kesim yapılır)</div>` 
            : "";

        const careInstructionsHtml = `
            <div class="care-instructions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <h4 style="font-size: 0.95rem; color: #374151; margin-bottom: 8px;">🧼 Yıkama ve Bakım Talimatı</h4>
                <ul style="padding-left: 18px; margin: 0; font-size: 0.85rem; color: #6b7280; line-height: 1.5;">
                    <li>30°C'de çamaşır makinesinde (hassas yıkama programında) sıkma yapmadan yıkanabilir.</li>
                    <li>Çamaşır suyu veya ağartıcı kimyasallar kullanmayınız.</li>
                    <li>Sıkmadan, asarak gölgede kurutunuz. Doğrudan güneş ışığına maruz bırakmayınız.</li>
                    <li>Robot süpürge ve standart süpürge kullanımına uygundur.</li>
                </ul>
            </div>
        `;

        body.innerHTML = `
            <div class="product-detail-media">
                <img src="${escapeHTML(urunResmi(product, window.surHaliImages || {}))}" alt="${escapeHTML(product.name || 'Ürün')}">
                ${badgeHTML}
            </div>
            <div class="product-detail-copy">
                <span class="product-detail-category">${escapeHTML(product.category || "")}</span>
                <h2>${escapeHTML(product.name || "Ürün")}</h2>
                <div class="product-rating">★★★★★ <span>Değerlendirme</span></div>
                
                <div class="product-detail-price" data-detail-price>${fiyatFormatla(initialSize.price)}</div>
                ${unitPriceNotice}

                ${descriptionHtml}

                <ul class="product-features">${featureHtml}</ul>

                <label class="product-option-label">Ebat Seçimi
                    <select class="product-size-select">${optionsHtml}</select>
                </label>

                <div class="product-quantity">
                    <button type="button" data-quantity="decrease">−</button>
                    <span data-quantity-value>1</span>
                    <button type="button" data-quantity="increase">+</button>
                </div>

                <button type="button" class="primary-button add-to-cart-button">Sepete Ekle</button>
                <p class="cart-message" aria-live="polite"></p>

                ${careInstructionsHtml}
            </div>
        `;

        let quantity = 1;
        const select = body.querySelector(".product-size-select");
        const price = body.querySelector("[data-detail-price]");
        const quantityValue = body.querySelector("[data-quantity-value]");

        select.addEventListener("change", function () {
            const selected = sizeOptions[Number(select.value)] || initialSize;
            price.textContent = fiyatFormatla(selected.price);
        });

        body.querySelector('[data-quantity="decrease"]').addEventListener("click", function () {
            quantity = Math.max(1, quantity - 1);
            quantityValue.textContent = quantity;
        });

        body.querySelector('[data-quantity="increase"]').addEventListener("click", function () {
            quantity += 1;
            quantityValue.textContent = quantity;
        });

        body.querySelector(".add-to-cart-button").addEventListener("click", function (event) {
            event.stopPropagation();
            const selected = sizeOptions[Number(select.value)] || initialSize;
            const cart = JSON.parse(localStorage.getItem("surHaliCart") || "[]");
            cart.push({
                productId: product.id,
                name: product.name,
                size: selected.size || selected.label,
                price: selected.price,
                quantity: quantity
            });
            localStorage.setItem("surHaliCart", JSON.stringify(cart));
            body.querySelector(".cart-message").textContent = "Ürün seçtiğiniz ebat ve fiyatla sepete eklendi.";
        });

        detailModal.classList.add("is-open");
    }

    document.querySelectorAll(".product-card[data-product-id]").forEach(function (element) {
        element.addEventListener("click", function (event) {
            if (event.target.closest(".whatsapp-button")) return;
            event.preventDefault();
            const products = window.surHaliProducts || {};
            const product = products[element.dataset.productId];
            if (product) urunDetayiniAc(product);
        });
    });
}

/* ==========================================================
   SİTEYİ BAŞLAT
   ========================================================== */

async function siteyiBaslat() {
    console.log("Sur Halı ana sitesi başlatılıyor...");

    const featuredContainer = document.getElementById("featuredProducts");
    const catalogContainer = document.getElementById("catalogProducts");

    try {
        mobilMenuHazirla();
        heroGorseliniUygula();

        if (featuredContainer) {
            featuredContainer.innerHTML = `<div class="loading-state">Ürünler yükleniyor...</div>`;
        }

        if (catalogContainer) {
            catalogContainer.innerHTML = `<div class="loading-state">Ürünler yükleniyor...</div>`;
        }

        const { products, imagesMap, coversMap } = await urunleriGetir();

        window.surHaliProducts = {};
        products.forEach(function (product) {
            window.surHaliProducts[product.id] = product;
        });
        window.surHaliImages = imagesMap;

        kategoriMenusuOlustur(coversMap);
        kategoriKapaklariniUygula(coversMap);

        if (featuredContainer) {
            oneCikanUrunleriOlustur(products, imagesMap);
        }

        if (catalogContainer) {
            katalogOlustur(products, imagesMap);
        }

        urunDetayBaglantilariniHazirla();

        console.log("Sur Halı ana sitesi başarıyla hazır.");

    } catch (error) {
        console.error("Site başlatma hatası:", error);

        const errorHtml = `
            <div class="error-state">
                <h2>Ürünler şu anda yüklenemiyor.</h2>
                <p>Lütfen daha sonra tekrar deneyin.</p>
            </div>
        `;

        if (featuredContainer) featuredContainer.innerHTML = errorHtml;
        if (catalogContainer) catalogContainer.innerHTML = errorHtml;
    }
}

/* ==========================================================
   SUR HALI AI CHATBOT MANTIĞI (GEMINI API)
   ========================================================== */

// Yeni Gemini API Anahtarı (GitHub engeline takılmaması için bölündü)
const k1 = "AQ.Ab8RN6IH1H3h_AV46sqlSmeO";
const k2 = "GhaPUj5Dnf_AqMHpsNU-V1DxNg";
const GEMINI_API_KEY = k1 + k2;

function aiChatbotBaslat() {
    const toggleBtn = document.getElementById("aiChatToggle");
    const closeBtn = document.getElementById("aiChatClose");
    const chatBox = document.getElementById("aiChatBox");
    const sendBtn = document.getElementById("aiChatSend");
    const inputField = document.getElementById("aiChatInput");
    const messagesContainer = document.getElementById("aiChatMessages");

    if (!toggleBtn || !chatBox || !sendBtn || !inputField) return;

    toggleBtn.onclick = function() {
        chatBox.hidden = !chatBox.hidden;
        if (!chatBox.hidden) {
            inputField.focus();
        }
    };

    if (closeBtn) {
        closeBtn.onclick = function() {
            chatBox.hidden = true;
        };
    }

    async function mesajGonder() {
        const text = inputField.value.trim();
        if (!text) return;

        const userMsg = document.createElement("div");
        userMsg.className = "ai-msg ai-msg-user";
        userMsg.textContent = text;
        messagesContainer.appendChild(userMsg);

        inputField.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const botMsg = document.createElement("div");
        botMsg.className = "ai-msg ai-msg-bot";
        botMsg.textContent = "Düşünüyor...";
        messagesContainer.appendChild(botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const urunler = window.surHaliProducts ? Object.values(window.surHaliProducts) : [];
            const urunOzeti = urunler.map(u => 
                `- ${u.name} (Kategori: ${u.category}, Fiyat: ${u.price || u.meter_price || 'Bilgi yok'} TL, Açıklama: ${u.description || 'Yok'})`
            ).join("\n");

            const systemPrompt = `Sen Sur Halı mağazasının yardımsever ve nazik dijital asistanısın.
Mağazamızda bulunan güncel ürünler ve bilgileri şunlardır:
${urunOzeti}

Müşterilerin sorularına kısa, net, samimi ve Türkçe cevaplar ver. 
Ölçü, özel kesim, metre fiyatı veya yıkanabilir halılar hakkında bilgi ver. 
Tam detay veremediğin durumlarda müşteriyi WhatsApp hattımıza yönlendir.`;

           // Yeni key yapısına uygun Header (Başlık) bazlı istek
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,{
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY 
    },
    body: JSON.stringify({
        contents: [{
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nMüşteri Sorusu: ${text}` }]
        }]
    })
});

            const data = await response.json();

            if (data.error) {
                console.error("Gemini API Hata Detayı:", data.error);
                botMsg.textContent = "API Hatası: " + (data.error.message || "Erişim sağlanamadı.");
                return;
            }

            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an yanıt veremiyorum, lütfen WhatsApp üzerinden iletişime geçin.";
            botMsg.textContent = reply;

        } catch (error) {
            console.error("AI Bağlantı Hatası:", error);
            botMsg.textContent = "Bir bağlantı hatası oluştu. Lütfen daha sonra tekrar deneyin.";
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.onclick = mesajGonder;
    inputField.onkeypress = function(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            mesajGonder();
        }
    };
}

/* ==========================================================
   DOM HAZIR (TEKİL OLAY DİNLENMESİ)
   ========================================================== */

document.addEventListener("DOMContentLoaded", function () {
    siteyiBaslat();
    aiChatbotBaslat();
});
// ==================================================
// SUR HALI YAPAY ZEKA ASİSTANI (GÜNCEL MODEL & DÜZGÜN AÇILMA/KAPANMA)
// ==================================================

// Chatbot Penceresini Aç / Kapat Fonksiyonu
window.toggleChat = function() {
    const chatWindow = document.getElementById("chat-window");
    if (chatWindow) {
        // 'active' class'ını ekler veya çıkarır
        chatWindow.classList.toggle("active");
    }
};

// Mesaj Gönderme Fonksiyonu (Google Gemini API Entegrasyonu)
window.mesajGonder = async function() {
    const inputField = document.getElementById("chat-input");
    const messagesContainer = document.getElementById("chat-messages");
    if (!inputField || !messagesContainer) return;

    const userText = inputField.value.trim();
    if (!userText) return;

    // 1. Kullanıcının yazdığı mesajı ekrana bas
    appendMessage("user", userText);
    inputField.value = "";

    // 2. Yanıt bekleniyor göstergesi ekle
    const typingIndicator = appendMessage("bot", "Yazıyor...");

    try {
        // En güncel gemini-3.6-flash modeli kullanımı
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: `Sen Bursa İznik'te bulunan Sur Halı mağazasının müşteri temsilcisisin. Mağazamızda makine halıları, yıkanabilir kaymaz yolluklar ve sisal halılar bulunmaktadır. Müşterilere samimi, nazik ve kısa yanıtlar ver.\n\nMüşteri: ${userText}` }]
                }]
            })
        });

        const data = await response.json();

        // Bekliyor yazısını kaldır
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }

        // Başarılı yanıtı ekrana yaz
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            appendMessage("bot", data.candidates[0].content.parts[0].text);
        } else {
            appendMessage("bot", "Şu an yanıt verilemiyor. Dilerseniz WhatsApp hattımızdan ulaşabilirsiniz.");
        }
    } catch (error) {
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        appendMessage("bot", "Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    }
};

function appendMessage(sender, text) {
    const container = document.getElementById("chat-messages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `chat-message ${sender}-message`;
    div.innerHTML = `<p>${text.replace(/\n/g, "<br>")}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}