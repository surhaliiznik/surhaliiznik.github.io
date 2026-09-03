/* SUR HALI - KESİN ÇALIŞAN GİTHUB JS KODU */

const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";
const GROQ_API_KEY = "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";

window.surClient = window.supabase ? window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY) : null;
let assistantProducts = [];
let assistantProductsReady = Promise.resolve();

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
        console.error("Asistan ürün hafızası yüklenemedi. products sorgusu hata verdi:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            error
        });
        return;
    }

    assistantProducts = data || [];
    if (!assistantProducts.length) {
        console.error("Asistan ürün hafızası boş: products tablosunda is_active = true olan ürün bulunamadı.");
        return;
    }

    console.info(`Asistan ürün hafızası hazır: ${assistantProducts.length} aktif ürün yüklendi.`);
}

function assistantProductContext() {
    return assistantProducts.map(product => ({
        id: product.id,
        slug: product.slug || null,
        title: productTitle(product),
        category: product.category || "",
        image_url: product.image_url || ""
    }));
}

function needsStoreSupport(message) {
    const normalizedMessage = message.toLocaleLowerCase("tr-TR");
    return normalizedMessage.includes("özel ölçü") || normalizedMessage.includes("özel olcu") ||
        normalizedMessage.includes("özel kesim") || normalizedMessage.includes("fiyat teklifi") ||
        normalizedMessage.includes("kararsız") || normalizedMessage.includes("kararsiz") ||
        normalizedMessage.includes("emin değil") || normalizedMessage.includes("emin degil");
}

async function loadCategoryCovers() {
    if (!window.surClient) return;

    const { data: covers, error } = await window.surClient
        .from("category_images")
        .select("category,image_url,created_at")
        .is("product_id", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Kategori kapakları yüklenemedi:", error);
        return;
    }

    const latestCovers = {};
    (covers || []).forEach(cover => {
        if (cover.category && cover.image_url && !latestCovers[cover.category]) {
            latestCovers[cover.category] = cover.image_url;
        }
    });

    document.querySelectorAll(".category-card[data-category]").forEach(card => {
        const imageUrl = latestCovers[card.dataset.category];
        const image = card.querySelector(".category-cover img");

        if (imageUrl && image) {
            image.src = imageUrl;
            image.closest(".category-cover")?.classList.add("has-image");
        }
    });

}

async function loadHeroBackground() {
    const defaultHeroUrl = "assets/images/hero-bg.jpg";
    const heroSection = document.querySelector(".hero-section");
    const heroMedia = document.querySelector("[data-hero-media]");
    if (!heroSection) return;

    let heroUrl = defaultHeroUrl;
    if (window.surClient) {
        const { data, error } = await window.surClient
            .from("site_settings")
            .select("hero_bg_url")
            .limit(1);

        if (error) {
            console.warn("Hero ayarı okunamadı, varsayılan görsel kullanılacak:", error);
        } else if (data?.[0]?.hero_bg_url) {
            heroUrl = data[0].hero_bg_url;
        }
    }

    heroSection.style.backgroundImage = `url("${heroUrl}")`;
    if (heroMedia) {
        heroMedia.style.backgroundImage = `url("${heroUrl}")`;
    }
}

// ÜRÜNLERİ YÜKLE
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container || !window.surClient) return;

    try {
        // Filte kullanmadan doğrudan ürünleri çekiyoruz
        const { data: products, error } = await window.surClient
            .from('products')
            .select('*')
            .eq('is_featured', true);

        if (error || !products || products.length === 0) {
            container.innerHTML = '<p class="no-data" style="text-align:center; width:100%; padding:20px;">Ürün bulunamadı.</p>';
            return;
        }

        container.innerHTML = products.map(product => {
            const title = product.name || 'Halı Model';
            const price = product.price ? `${product.price} TL` : 'Fiyat Belirtilmedi';
            
            // Eğer image_url varsa onu kullan, yoksa veya NULL ise varsayılan logoyu bas
            let imgSrc = (product.image_url && product.image_url.trim() !== '') 
                ? product.image_url 
                : 'assets/images/logo.jpeg';

            return `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${imgSrc}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo.jpeg';">
                    </div>
                    <div class="product-info">
                        <h3>${title}</h3>
                        <p class="product-price">${price}</p>
                        <a href="https://wa.me/905396369095?text=Merhaba,%20${encodeURIComponent(title)}%20hakkında%20bilgi%20almak%20istiyorum" target="_blank" class="primary-button">WhatsApp ile Sipariş</a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("Ürün yükleme hatası:", err);
    }
}

function renderCatalogProducts(products, category) {
    const container = document.getElementById("catalogProducts");
    if (!container) return;

    if (!products.length) {
        container.innerHTML = `<div class="empty-state"><h2>${escapeHTML(category)}</h2><p>Bu kategoride şu anda ürün bulunamadı.</p></div>`;
        return;
    }

    container.innerHTML = products.map(product => {
        const title = product.name || "Halı Model";
        const imageUrl = product.image_url || "assets/images/logo.jpeg";
        const price = product.price ? `${escapeHTML(product.price)} TL` : "Fiyat bilgisi için iletişime geçin";

        return `
            <article class="product-card" data-product-id="${escapeHTML(product.slug || product.id || "")}">
                <div class="product-image">
                    <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(title)}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo.jpeg';">
                </div>
                <div class="product-info">
                    <span class="product-category">${escapeHTML(product.category || category)}</span>
                    <h3 class="product-title">${escapeHTML(title)}</h3>
                    <p class="product-size">${escapeHTML(product.size || "")}</p>
                    <p class="product-price">${price}</p>
                    <a class="primary-button product-card-button" href="https://wa.me/905396369095?text=${encodeURIComponent(`${title} hakkında bilgi almak istiyorum`)}" target="_blank" rel="noopener">WhatsApp ile Bilgi Al</a>
                </div>
            </article>
        `;
    }).join("");
}

async function loadCatalogProducts(category) {
    const container = document.getElementById("catalogProducts");
    if (!container || !window.surClient) return;

    container.innerHTML = '<div class="loading-state">Ürünler yükleniyor...</div>';

    const { data, error } = await window.surClient
        .from("products")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Katalog ürünleri yüklenemedi:", error);
        container.innerHTML = '<div class="error-state">Ürünler yüklenirken bir hata oluştu.</div>';
        return;
    }

    renderCatalogProducts((data || []).filter(product => product.is_active !== false), category);

    const requestedProduct = new URLSearchParams(window.location.search).get("product");
    if (requestedProduct) {
        const productCard = container.querySelector(`[data-product-id="${CSS.escape(requestedProduct)}"]`);
        productCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

function setupCatalogFilters() {
    const filters = document.querySelectorAll(".category-filter[data-category]");
    if (!filters.length) return;

    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    const initialCategory = [...filters].some(filter => filter.dataset.category === requestedCategory)
        ? requestedCategory
        : filters[0].dataset.category;

    function selectCategory(category, updateUrl) {
        filters.forEach(filter => filter.classList.toggle("active", filter.dataset.category === category));
        const title = document.getElementById("catalogTitle");
        if (title) title.textContent = category;
        loadCatalogProducts(category);

        if (updateUrl) {
            history.replaceState(null, "", `halilar.html?category=${encodeURIComponent(category)}`);
        }
    }

    filters.forEach(filter => {
        filter.addEventListener("click", () => selectCategory(filter.dataset.category, true));
    });
    selectCategory(initialCategory, false);
}

// GROQ AI CHATBOT
async function askGroqAI(userMessage) {
    const category = detectCategoryIntent(userMessage);
    const categoryInstruction = category
        ? ` Kullanıcı ${category} kategorisiyle ilgileniyor. Yanıtının sonunda ${category} kategorisini inceleyebileceğini belirt.`
        : " Kategori net değilse kullanıcıdan tercihlerini veya ölçüsünü sor.";
    const productsInstruction = assistantProducts.length
        ? ` Aktif ürün kataloğu context'i: ${JSON.stringify(assistantProductContext())}. Bu listedeki ürünler dışındaki ürünleri varmış gibi anlatma.`
        : " Aktif ürün kataloğu şu anda kullanılamıyor; ürün adı veya stok uydurma.";

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "Sen İznik Sur Halı'nın samimi ve uzman satış danışmanısın. Müşterilere evleri için en uygun halı, kaymaz yolluk, makine halısı ve özel ölçü kesim seçeneklerinde yardımcı olursun. Kısa, açık ve samimi cevaplar ver." + categoryInstruction + productsInstruction },
                    { role: "user", content: userMessage }
                ]
            })
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("Groq asistan yanıtı başarısız:", {
                status: response.status,
                statusText: response.statusText,
                response: data
            });
        }

        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;

        const matchedProducts = findAssistantProducts(userMessage);
        if (matchedProducts.length) {
            return `${matchedProducts.map(productTitle).join(" ve ")} ürünleri sorunuza uygun olabilir. Aşağıdaki kartlardan ürünleri inceleyebilirsiniz.`;
        }

        return "Ürünlerimiz hakkında yardımcı olabilmem için halı türü, kullanım alanı veya ölçü bilgisini paylaşabilirsiniz.";
    } catch (error) {
        console.error("Groq asistan bağlantı hatası:", error);
        const matchedProducts = findAssistantProducts(userMessage);
        if (matchedProducts.length) {
            return `${matchedProducts.map(productTitle).join(" ve ")} ürünleri sorunuza uygun olabilir. Aşağıdaki kartlardan ürünleri inceleyebilirsiniz.`;
        }
        return "Ürünlerimiz hakkında yardımcı olabilmem için halı türü, kullanım alanı veya ölçü bilgisini paylaşabilirsiniz.";
    }
}

function renderAssistantProductCards(products) {
    return products.map(product => {
        const title = productTitle(product);
        const imageUrl = product.image_url || "assets/images/logo.jpeg";

        return `
            <article class="ai-product-card">
                <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(title)}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo.jpeg';">
                <strong>${escapeHTML(title)}</strong>
                <a class="ai-category-link" href="${escapeHTML(productLink(product))}">Ürünü İncele</a>
            </article>
        `;
    }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
    loadFeaturedProducts();
    loadCategoryCovers();
    loadHeroBackground();
    assistantProductsReady = loadAssistantProducts();
    setupCatalogFilters();

    const chatBox = document.getElementById("aiChatBox");
    const closeBtn = document.getElementById("aiChatClose");
    const toggleBtn = document.getElementById("aiChatToggle");
    const sendBtn = document.getElementById("aiChatSend");
    const inputField = document.getElementById("aiChatInput");
    const messagesContainer = document.getElementById("aiChatMessages");

    if (toggleBtn && chatBox) {
        toggleBtn.onclick = function (e) {
            e.preventDefault();
            chatBox.style.display = (chatBox.style.display === "none" || chatBox.style.display === "") ? "flex" : "none";
            if (chatBox.style.display === "flex" && inputField) inputField.focus();
        };
    }

    if (closeBtn && chatBox) {
        closeBtn.onclick = function (e) {
            e.preventDefault();
            chatBox.style.display = "none";
        };
    }

    async function mesajGonder() {
        if (!inputField || !messagesContainer) return;
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
        botMsg.style.cssText = "background:#e9ecef; padding:8px 12px; border-radius:8px; margin-bottom:8px;";
        botMsg.textContent = "Yazıyor...";
        messagesContainer.appendChild(botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        await assistantProductsReady;
        const reply = await askGroqAI(text);
        botMsg.textContent = reply;
        const category = detectCategoryIntent(text);
        if (category && categoryLinks[category]) {
            const link = document.createElement("a");
            link.className = "ai-category-link";
            link.href = categoryLinks[category];
            link.textContent = `${category} kategorisini incele`;
            botMsg.appendChild(document.createElement("br"));
            botMsg.appendChild(link);
        }

        const matchedProducts = findAssistantProducts(text);
        if (matchedProducts.length) {
            const cards = document.createElement("div");
            cards.className = "ai-product-cards";
            cards.innerHTML = renderAssistantProductCards(matchedProducts);
            botMsg.appendChild(cards);
        }

        if (needsStoreSupport(text)) {
            const supportMessage = document.createElement("p");
            supportMessage.className = "ai-support-message";
            supportMessage.textContent = "Ölçünüze özel kesim ve canlı görsel desteği için WhatsApp hattımızdan (0539 636 90 95) bize ulaşabilir veya İznik mağazamızı ziyaret edebilirsiniz!";
            botMsg.appendChild(supportMessage);
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (sendBtn) sendBtn.onclick = mesajGonder;
    if (inputField) {
        inputField.onkeypress = function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                mesajGonder();
            }
        };
    }
});
