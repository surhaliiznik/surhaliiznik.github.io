if (!window.__SUR_SITE_JS_LOADED__) {
    window.__SUR_SITE_JS_LOADED__ = true;

    const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
    const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";
    const GROQ_API_KEY = "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";

    window.surClient = window.supabase ? window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY) : null;
    let assistantProducts = [];
    let assistantProductsReady = Promise.resolve();
    let lastRoomImageDataUrl = "";
    window.site_settings = window.site_settings || {};

    async function loadSiteSettings() {
        if (!window.surClient) return;
        try {
            const { data, error } = await window.surClient
                .from("site_settings")
                .select("*")
                .limit(1);
            if (error) {
                console.error("site_settings yüklenemedi (sorgu hatası):", error);
                return;
            }
            const row = data?.[0];
            if (row) {
                window.site_settings = Object.assign({}, window.site_settings, row);
                if (window.site_settings.openrouter_api_key) {
                    console.info("site_settings yüklendi. openrouter_api_key mevcut.");
                } else {
                    console.warn("site_settings tablosunda openrouter_api_key tanımlı değil veya boş.");
                }
            } else {
                console.warn("site_settings tablosunda kayıt bulunamadı.");
            }
        } catch (err) {
            console.error("site_settings yüklenirken beklenmeyen hata:", err);
        }
    }

    const categoryLinks = {
        "Halılar": "halilar.html?category=Halılar",
        "Klasik Yolluklar": "halilar.html?category=Klasik%20Yolluklar",
        "Sisal": "halilar.html?category=Sisal",
        "Kaymaz": "halilar.html?category=Kaymaz",
        "Özel Kesim": "halilar.html?category=%C3%96zel%20Kesim"
    };

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function detectCategoryIntent(message) {
        const normalizedMessage = message.toLocaleLowerCase("tr-TR");

        if (normalizedMessage.includes("sisal")) return "Sisal";
        if (normalizedMessage.includes("kaymaz")) return "Kaymaz";
        if (normalizedMessage.includes("özel ölçü") || normalizedMessage.includes("özel olcu") || normalizedMessage.includes("özel kesim") || normalizedMessage.includes("özel kes") || normalizedMessage.includes("metreye")) return "Özel Kesim";
        if (normalizedMessage.includes("klasik yolluk")) return "Klasik Yolluklar";
        if (normalizedMessage.includes("yolluk")) return "Klasik Yolluklar";
        if (normalizedMessage.includes("halı") || normalizedMessage.includes("hali") || normalizedMessage.includes("fiyat")) return "Halılar";

        return null;
    }

    function productTitle(product) {
        return product.title || product.name || "Halı Model";
    }

    function productLink(product) {
        const category = product.category || "Halılar";
        const identifier = product.slug || product.id;
        return `halilar.html?category=${encodeURIComponent(category)}&product=${encodeURIComponent(identifier || "")}`;
    }

    function findAssistantProducts(message) {
        const normalizedMessage = message.toLocaleLowerCase("tr-TR");
        const category = detectCategoryIntent(message);
        const tokens = normalizedMessage
            .replace(/[^a-zçğıöşü0-9\s-]/gi, " ")
            .split(/\s+/)
            .filter(token => token.length > 2);

        return assistantProducts
            .map(product => {
                const searchable = [productTitle(product), product.category, product.description, product.size]
                    .filter(Boolean)
                    .join(" ")
                    .toLocaleLowerCase("tr-TR");
                let score = category && product.category === category ? 5 : 0;
                tokens.forEach(token => {
                    if (searchable.includes(token)) score += 1;
                });
                return { product, score };
            })
            .filter(item => item.score > 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, 2)
            .map(item => item.product);
    }

    async function loadAssistantProducts() {
        if (!window.surClient) {
            console.error("Asistan ürün hafızası yüklenemedi: Supabase istemcisi hazır değil.");
            return;
        }

        const { data, error } = await window.surClient
            .from("products")
            .select("*")
            .eq("is_active", true);

        if (error) {
            console.error("Asistan ürün hafızası yüklenemedi. products sorgusu hata verdi:", error);
            return;
        }

        assistantProducts = data || [];
        if (!assistantProducts.length) {
            console.error("Asistan ürün hafızası boş: products tablosunda is_active = true olan ürün bulunamadı.");
            return;
        }

        console.info(`Asistan ürün hafızası hazır: ${assistantProducts.length} aktif ürün yüklendi.`);
    }

    function getTryOnDeviceId() {
        let deviceId = localStorage.getItem("tryOnDeviceId");
        if (!deviceId) {
            deviceId = `device-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
            localStorage.setItem("tryOnDeviceId", deviceId);
        }
        return deviceId;
    }

    async function syncTryOnCredits() {
        console.log("Sanal halı hakları kontrolü başladı.");
        const storedValue = localStorage.getItem("tryOnCredits");
        const storedCredits = Number.parseInt(storedValue, 10);
        if (storedValue !== "unlimited" && Number.isNaN(storedCredits)) localStorage.setItem("tryOnCredits", "2");
        if (!window.surClient) return;

        let { data, error } = await window.surClient
            .from("user_credits")
            .select("identifier,credits,is_unlimited,updated_at")
            .eq("identifier", getTryOnDeviceId())
            .maybeSingle();

        if (error) {
            const fallback = await window.surClient
                .from("site_settings")
                .select("id,identifier,try_on_credits,try_on_unlimited,updated_at")
                .eq("identifier", getTryOnDeviceId())
                .maybeSingle();
            data = fallback.data ? {
                identifier: fallback.data.identifier,
                credits: fallback.data.try_on_credits,
                is_unlimited: fallback.data.try_on_unlimited,
                updated_at: fallback.data.updated_at
            } : null;
        }
        if (!data) return;
        if (data.is_unlimited === true) {
            localStorage.setItem("tryOnCredits", "unlimited");
            return;
        }

        const syncKey = `tryOnCreditsSynced:${getTryOnDeviceId()}`;
        if (data.updated_at !== localStorage.getItem(syncKey)) {
            const currentCredits = Number.parseInt(localStorage.getItem("tryOnCredits"), 10) || 0;
            localStorage.setItem("tryOnCredits", String(currentCredits + (Number(data.credits) || 0)));
            localStorage.setItem(syncKey, data.updated_at || String(Date.now()));
        }
    }

    function compressImageToDataUrl(file, maxSize = 1024, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error || new Error("Görsel okunamadı."));
            reader.onload = () => {
                const image = new Image();
                image.onerror = () => reject(new Error("Görsel yüklenemedi."));
                image.onload = () => {
                    let width = image.width;
                    let height = image.height;

                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, width);
                    canvas.height = Math.max(1, height);

                    const ctx = canvas.getContext("2d");
                    if (!ctx) return reject(new Error("Canvas oluşturulamadı."));

                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", quality));
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /* RESİM VE KAPAK YÜKLEME FONKSİYONLARI */
    async function loadHeroBackground() {
        const heroSection = document.querySelector('.hero, .hero-section');
        if (!heroSection || !window.surClient) return;

        const { data } = await window.surClient.from("site_settings").select("hero_bg_url").maybeSingle();
        if (data?.hero_bg_url) {
            heroSection.style.backgroundImage = `url('${data.hero_bg_url}')`;
        }
    }

   async function loadCategoryCovers() {
    if (!window.surClient) return;
    // 'categories' yerine veritabanındaki doğru tablo adı olan 'category_images' kullanılıyor:
    const { data: categories } = await window.surClient.from("category_images").select("*");
    if (!categories) return;

    categories.forEach(cat => {
        const el = document.querySelector(`[data-category-cover="${cat.name}"]`);
        if (el && cat.image_url) {
            if (el.tagName === 'IMG') el.src = cat.image_url;
            else el.style.backgroundImage = `url('${cat.image_url}')`;
        }
    });
}
    async function loadFeaturedProducts() {
        const container = document.getElementById("featured-products-container");
        if (!container || !window.surClient) return;

        const { data: products } = await window.surClient
            .from("products")
            .select("*")
            .eq("is_active", true)
            .eq("is_featured", true)
            .limit(6);

        if (!products || !products.length) return;

        container.innerHTML = products.map(product => `
            <div class="product-card">
                <img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(productTitle(product))}" loading="lazy">
                <h3>${escapeHTML(productTitle(product))}</h3>
                <a href="${productLink(product)}" class="btn-detail">İncele</a>
            </div>
        `).join("");
    }

    async function loadCatalogProducts(categoryName = "Halılar") {
        const container = document.getElementById("catalog-products-container");
        if (!container) return;

        if (!window.surClient) {
            container.innerHTML = `<p class="error-msg">Supabase istemcisi yüklenemedi.</p>`;
            return;
        }

        let query = window.surClient.from("products").select("*").eq("is_active", true);
        if (categoryName && categoryName !== "Tümü") {
            query = query.eq("category", categoryName);
        }

        const { data: products, error } = await query;

        if (error) {
            console.error("Katalog ürünleri alınamadı:", error);
            container.innerHTML = `<p class="error-msg">Ürünler yüklenirken bir hata oluştu.</p>`;
            return;
        }

        if (!products || products.length === 0) {
            container.innerHTML = `<p class="no-products">Bu kategoride gösterilecek ürün bulunamadı.</p>`;
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card" data-product-id="${product.slug || product.id}">
                <img src="${escapeHTML(product.image_url)}" alt="${escapeHTML(productTitle(product))}" loading="lazy">
                <h3>${escapeHTML(productTitle(product))}</h3>
                <p class="category">${escapeHTML(product.category || '')}</p>
                <a href="${productLink(product)}" class="btn-detail">İncele</a>
            </div>
        `).join("");

        const requestedProduct = new URLSearchParams(window.location.search).get("product");
        if (requestedProduct) {
            const productCard = container.querySelector(`[data-product-id="${requestedProduct}"]`);
            if (productCard) {
                productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                productCard.classList.add('highlighted-product');
            }
        }
    }

    // DOM Hazır Olduğunda Tüm Resimleri ve Verileri Yükle
    document.addEventListener("DOMContentLoaded", () => {
        loadSiteSettings();
        assistantProductsReady = loadAssistantProducts();
        syncTryOnCredits();
        loadHeroBackground();
        loadCategoryCovers();
        loadFeaturedProducts();

        const category = new URLSearchParams(window.location.search).get("category") || "Halılar";
        loadCatalogProducts(category);
    });
}
