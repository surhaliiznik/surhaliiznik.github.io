/* SUR HALI - KESİN ÇALIŞAN GİTHUB JS KODU */

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
    if (!window.surClient) {
        console.error("Supabase hak kontrolü başarısız: istemci hazır değil. Yerel 2 hakla devam ediliyor.");
        return;
    }

    let { data, error } = await window.surClient
        .from("user_credits")
        .select("identifier,credits,is_unlimited,updated_at")
        .eq("identifier", getTryOnDeviceId())
        .maybeSingle();

    if (error) {
        console.error("user_credits okunamadı, site_settings fallback deneniyor:", error);
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
        error = fallback.error;
        if (error) {
            console.error("Sanal halı hak kaydı okunamadı:", error);
            return;
        }
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

function getTryOnCredits() {
    const value = localStorage.getItem("tryOnCredits");
    return value === "unlimited" ? Infinity : Math.max(0, Number.parseInt(value, 10) || 0);
}

function consumeTryOnCredit() {
    const credits = getTryOnCredits();
    if (credits !== Infinity) localStorage.setItem("tryOnCredits", String(Math.max(0, credits - 1)));
}

async function consumeRemoteTryOnCredit() {
    if (!window.surClient) return;

    const deviceId = getTryOnDeviceId();
    const { data, error } = await window.surClient
        .from("user_credits")
        .select("id,credits,is_unlimited")
        .eq("identifier", deviceId)
        .maybeSingle();

    if (error || !data || data.is_unlimited === true) return;

    const nextCredits = Math.max(0, (Number(data.credits) || 0) - 1);
    const { error: updateError } = await window.surClient
        .from("user_credits")
        .update({ credits: nextCredits, updated_at: new Date().toISOString() })
        .eq("id", data.id);

    if (updateError) console.error("Sanal giydirme hakkı düşürülemedi:", updateError);
}

async function invokeVirtualTryOn(product, roomImage) {
    if (!window.surClient) throw new Error("Sanal giydirme servisi hazır değil (surClient yok).");
    const productImage = product?.image_url;
    if (!productImage) throw new Error("Bu ürünün görseli bulunamadı (product.image_url eksik).");
    if (!roomImage) throw new Error("Oda görseli boş, VTO çalıştırılamaz.");

    const payload = {
        room_image: roomImage,
        product_image: productImage,
        product_id: product?.id
    };
    console.log("[invokeVirtualTryOn] Edge Function çağrılıyor. product_id:", payload.product_id,
        "room_image uzunluğu:", String(payload.room_image || "").length,
        "product_image:", String(payload.product_image || "").slice(0, 120));

    let rawResult;
    try {
        rawResult = await window.surClient.functions.invoke("virtual-try-on", { body: payload });
    } catch (networkErr) {
        console.groupCollapsed("[invokeVirtualTryOn] Ağ/network hatası (fetch atıldı ama cevap alınamadı)");
        console.error("Hata nesnesi:", networkErr);
        console.error("Mesaj:", networkErr?.message);
        console.error("Stack:", networkErr?.stack);
        console.error("Name:", networkErr?.name);
        console.groupEnd();
        const enriched = new Error(`Sanal giydirme servisine ulaşılamadı (ağ hatası): ${networkErr?.message || "Bilinmeyen ağ hatası"}`);
        enriched.cause = networkErr;
        throw enriched;
    }

    const { data, error } = rawResult || {};
    if (!error && data?.output_url) {
        console.log("[invokeVirtualTryOn] BAŞARILI. output_url:", String(data.output_url).slice(0, 140));
        return data.output_url;
    }

    const httpStatus = error?.status || error?.context?.responseStatus || (typeof error?.response?.status === "number" ? error.response.status : undefined);
    const isFunctionsHttpError = error?.name === "FunctionsHttpError" ||
        (typeof httpStatus === "number" && httpStatus >= 400) ||
        (error && typeof error.context === "object");

    let edgeBody = null;
    let edgeErrorMsg = null;
    let edgeDetails = null;
    let edgeRawText = null;
    if (isFunctionsHttpError) {
        const ctx = error?.context || {};
        const resp = error?.response || {};
        let jsonCandidate = null;
        if (ctx && typeof ctx.json === "function") {
            try { jsonCandidate = await ctx.json(); } catch (_) { jsonCandidate = null; }
        }
        if (!jsonCandidate && typeof error?.context === "object" && error?.context?.error) {
            jsonCandidate = error.context;
        }
        if (!jsonCandidate && resp && typeof resp.json === "function") {
            try { jsonCandidate = await resp.json(); } catch (_) { jsonCandidate = null; }
        }
        if (!jsonCandidate) {
            let rawText = null;
            if (ctx && typeof ctx.text === "function") {
                try { rawText = await ctx.text(); } catch (_) {}
            }
            if (!rawText && resp && typeof resp.text === "function") {
                try { rawText = await resp.text(); } catch (_) {}
            }
            edgeRawText = rawText || null;
            if (rawText) {
                try { jsonCandidate = JSON.parse(rawText); } catch (_) { jsonCandidate = null; }
            }
        }
        if (!jsonCandidate && error && (error.error || error.details)) {
            jsonCandidate = { error: error.error, details: error.details };
        }
        edgeBody = jsonCandidate;
        edgeErrorMsg = jsonCandidate?.error || error?.message || edgeBody?.message || error?.context?.message || "Edge Function tarafında açıklanmamış hata";
        edgeDetails = jsonCandidate?.details || error?.details || (jsonCandidate && (jsonCandidate.reason || jsonCandidate.raw)) || null;
    }

    console.groupCollapsed("[invokeVirtualTryOn] Edge Function HATALI veya output_url eksik döndü");
    console.error("error nesnesi:", error);
    console.error("httpStatus:", httpStatus);
    console.error("isFunctionsHttpError:", isFunctionsHttpError);
    console.error("Supabase FunctionsHttpError.message (genel):", error?.message);
    console.error("Edge Function body (JSON):", edgeBody);
    console.error("Edge body içindeki 'error' alanı:", edgeErrorMsg);
    console.error("Edge body içindeki 'details' alanı (varsa):", edgeDetails);
    console.error("Edge body ham text (varsa):", edgeRawText);
    console.error("data (varsa):", data);
    console.error("data?.output_url (varsa):", data?.output_url);
    console.groupEnd();

    if (isFunctionsHttpError) {
        const statusPart = typeof httpStatus === "number" ? ` (HTTP ${httpStatus})` : "";
        const parts = [];
        if (edgeErrorMsg) parts.push(String(edgeErrorMsg));
        if (edgeDetails && String(edgeDetails) !== String(edgeErrorMsg)) parts.push(String(edgeDetails));
        const combined = parts.length ? parts.join(" | ") : (error?.message || "Bilinmeyen Edge Function hatası");
        const userMsg = `Sanal giydirme başarısız${statusPart}: ${combined}`.slice(0, 600);
        const enrichedErr = new Error(userMsg);
        enrichedErr.cause = error;
        enrichedErr.vto = {
            httpStatus,
            edgeError: edgeErrorMsg,
            edgeDetails,
            edgeBody,
            edgeRawText
        };
        throw enrichedErr;
    }

    if (error) {
        const enrichedErr = new Error(`Sanal giydirme çağrısı başarısız: ${error.message || "Bilinmeyen hata"}`);
        enrichedErr.cause = error;
        throw enrichedErr;
    }

    throw new Error("Sanal giydirme sonucu alınamadı (output_url eksik). Edge Function yanıtı: " + JSON.stringify(data || {}).slice(0, 300));
}

function compressImageToDataUrl(file, maxSize = 1024, quality = 0.7) {
    console.log("Görsel sıkıştırma başlıyor:", file.name);
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
            console.error("FileReader görsel okuma hatası:", reader.error);
            reject(reader.error || new Error("Görsel okunamadı."));
        };
        reader.onload = () => {
            console.log("FileReader görseli okudu.");
            const image = new Image();
            image.onerror = () => {
                console.error("Görsel Image nesnesine yüklenemedi.");
                reject(new Error("Görsel boyutlandırılamadı."));
            };
            image.onload = () => {
                console.log("Görsel boyutları:", image.naturalWidth, "x", image.naturalHeight);
                const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                console.log("Canvas boyutları:", canvas.width, "x", canvas.height);
                const context = canvas.getContext("2d");
                if (!context) {
                    console.error("Canvas 2D context oluşturulamadı.");
                    reject(new Error("Görsel sıkıştırma alanı oluşturulamadı."));
                    return;
                }
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const compressedImage = canvas.toDataURL("image/jpeg", quality);
                console.log("Görsel canvas üzerinde sıkıştırıldı. Base64 uzunluğu:", compressedImage.length);
                resolve(compressedImage);
            };
            image.src = reader.result;
        };
        console.log("FileReader.readAsDataURL başlatılıyor.");
        reader.readAsDataURL(file);
    });
}

async function analyzeRoom(base64Image) {
    console.log("[analyzeRoom] başladı. base64Image uzunluğu:", base64Image?.length || 0);
    try {
        if (!base64Image) {
            throw new Error("Oda görseli içeriği boş geldi (base64Image tanımsız).");
        }
        if (!window.site_settings?.openrouter_api_key) {
            console.warn("[analyzeRoom] site_settings.openrouter_api_key henüz yüklenmemiş, loadSiteSettings bekleniyor...");
            await loadSiteSettings();
            if (!window.site_settings?.openrouter_api_key) {
                throw new Error("OpenRouter API anahtarı (site_settings.openrouter_api_key) bulunamadı veya boş! Supabase site_settings tablosundaki openrouter_api_key sütununu kontrol edin.");
            }
            console.log("[analyzeRoom] site_settings beklendi ve openrouter_api_key yüklendi.");
        }
        const apiKey = String(window.site_settings.openrouter_api_key).trim();
        console.log("[analyzeRoom] kullanılacak API anahtarı (son 4): ...", apiKey.slice(-4));

        const formattedImage = base64Image.startsWith("data:")
            ? base64Image
            : `data:image/jpeg;base64,${base64Image}`;

        const endpointUrl = "https://openrouter.ai/api/v1/chat/completions".trim();
        const candidateModels = [
            "qwen/qwen2.5-vl-72b-instruct",
            "google/gemini-2.0-flash-exp:free"
        ];
        const userPrompt = "Bu oda görselini analiz et ve renk, tarz ile ortam özelliklerini değerlendirerek uygun halı önerilerinde bulun.";
        const buildPayload = (m) => ({
            model: m,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: userPrompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: formattedImage,
                                detail: "low"
                            }
                        }
                    ]
                }
            ]
        });

        let lastError = null;
        let modelIndex = 0;
        let data = null;
        let usedModel = null;
        while (modelIndex < candidateModels.length) {
            const modelName = candidateModels[modelIndex];
            usedModel = modelName;
            modelIndex++;
            console.log("[analyzeRoom] istek hazırlanıyor. endpoint:", endpointUrl, "model:", modelName);
            const requestPayload = buildPayload(modelName);
            try {
                const response = await fetch(endpointUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": window.location.origin,
                        "X-Title": "Sur Hali Iznik VTO"
                    },
                    body: JSON.stringify(requestPayload)
                });

                console.log(`[analyzeRoom] [${modelName}] yanıt durumu:`, response.status, response.statusText);
                const responseText = await response.text();
                let stepData = null;
                try {
                    stepData = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error(`[analyzeRoom] [${modelName}] yanıt JSON parse edilemedi. Ham (ilk 1500):`, responseText?.slice?.(0, 1500));
                    stepData = { raw: responseText };
                }

                if (!response.ok) {
                    const errDetail = stepData && (stepData.error || stepData.raw)
                        ? (typeof stepData.error === "string" ? stepData.error : (stepData.error?.message || JSON.stringify(stepData.error || stepData.raw)))
                        : "Açıklanamayan API hatası";
                    console.error(`[analyzeRoom] [${modelName}] HATALI:`, {
                        status: response.status,
                        statusText: response.statusText,
                        errDetail,
                        fullData: stepData,
                        rawTail: responseText?.slice?.(-1000)
                    });
                    lastError = new Error(`[${modelName}] OpenRouter API Hatası: ${response.status} ${response.statusText} — ${errDetail}`);
                    continue;
                }

                const analysis = stepData?.choices?.[0]?.message?.content?.trim?.();
                if (!analysis) {
                    console.error(`[analyzeRoom] [${modelName}] yanıt boş veya format dışı. choices:`, stepData?.choices, "tam data:", stepData);
                    lastError = new Error(`[${modelName}] Oda analizi yanıtı boş döndü.`);
                    continue;
                }
                console.log(`[analyzeRoom] [${modelName}] BAŞARILI. Analiz (ilk 200):`, analysis.slice(0, 200));
                data = stepData;
                return analysis;
            } catch (networkErr) {
                console.error(`[analyzeRoom] [${modelName}] Ağ/fetch hatası:`, networkErr);
                lastError = networkErr;
                continue;
            }
        }

        if (lastError) throw lastError;
        throw new Error("Tüm OpenRouter vision modelleri denendi ancak oda analizi tamamlanamadı.");

    } catch (error) {
        console.groupCollapsed("Oda Görseli Analiz Hatası (js/site.js - analyzeRoom)");
        console.error("Hata nesnesi:", error);
        console.error("Mesaj:", error?.message);
        console.error("Stack:", error?.stack);
        console.error("Cause:", error?.cause);
        console.error("Name:", error?.name);
        console.groupEnd();
        throw error;
    }
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
   } catch (error) {
        console.error("Giydirme hatası:", error);
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

function renderAssistantProductCards(products, roomImage = "") {
    return products.map(product => {
        const title = productTitle(product);
        const imageUrl = product.image_url || "assets/images/logo.jpeg";
        const hasRoomImage = Boolean(roomImage || lastRoomImageDataUrl);
        const productId = escapeHTML(product.id || "");
        const productJson = escapeHTML(JSON.stringify({ id: product.id, image_url: imageUrl, category: product.category, slug: product.slug, title, price: product.price, size: product.size, description: product.description }));

        return `
            <article class="ai-product-card" data-product-json='${productJson}'>
                <img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(title)}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo.jpeg';">
                <strong class="ai-product-card-title">${escapeHTML(title)}</strong>
                <div class="ai-product-card-buttons">
                    <a class="ai-product-btn ai-product-btn-link" href="${escapeHTML(productLink(product))}">Ürünü İncele</a>
                    <button type="button"
                            class="ai-product-btn ai-product-btn-tryon vto-btn ai-try-on-button"
                            data-action="vto"
                            data-product-id="${productId}"
                            ${hasRoomImage ? "" : "disabled"}
                            title="${hasRoomImage ? "Bu halıyı seçtiğiniz oda fotoğrafında gör" : "Önce oda fotoğrafı yükleyin"}"
                            onclick="window.surRunVTOFromCard('${productId}', this)">
                        ${hasRoomImage ? "Odamda Gör" : "Önce Oda Yükleyin"}
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

async function runVTO(product, roomImageOverride) {
    const roomImage = roomImageOverride || lastRoomImageDataUrl;
    if (!product) throw new Error("Ürün bulunamadı.");
    if (!roomImage) throw new Error("Önce bir oda fotoğrafı yükleyin.");
    return invokeVirtualTryOn(product, roomImage);
}

window.surRunVTOFromCard = async function (productId, buttonEl) {
    try {
        if (!productId) throw new Error("Ürün kimliği eksik.");
        if (!lastRoomImageDataUrl) throw new Error("Önce sohbetin altındaki + butonundan bir oda fotoğrafı yükleyin.");
        const product = assistantProducts.find(item => String(item.id) === String(productId));
        if (!product && buttonEl) {
            try {
                const raw = buttonEl.closest("[data-product-json]")?.getAttribute("data-product-json");
                if (raw) {
                    const restored = JSON.parse(raw);
                    if (restored && restored.id) {
                        const fromTable = assistantProducts.find(p => String(p.id) === String(restored.id));
                        return window.surRunVTOFromCard.__internalRun(fromTable || restored, lastRoomImageDataUrl, buttonEl);
                    }
                }
            } catch (_) {}
        }
        return window.surRunVTOFromCard.__internalRun(product, lastRoomImageDataUrl, buttonEl);
    } catch (err) {
        const vto = err?.vto;
        console.groupCollapsed("VTO kart butonu hatası (surRunVTOFromCard)");
        console.error("Hata:", err);
        console.error("Mesaj:", err?.message);
        if (vto) {
            console.error("VTO HTTP status:", vto.httpStatus);
            console.error("VTO edge error:", vto.edgeError);
            console.error("VTO edge details:", vto.edgeDetails);
            console.error("VTO edge body:", vto.edgeBody);
        }
        console.error("Cause:", err?.cause);
        console.error("Stack:", err?.stack);
        console.groupEnd();
        const messagesContainer = document.getElementById("aiChatMessages");
        if (messagesContainer) {
            const errMsg = document.createElement("div");
            errMsg.className = "ai-msg ai-msg-bot";
            const base = err?.message ? String(err.message) : "Bilinmeyen hata";
            const parts = [base];
            if (vto?.edgeDetails && !base.includes(String(vto.edgeDetails))) parts.push("Detay: " + String(vto.edgeDetails).slice(0, 220));
            errMsg.textContent = `Sanal deneme başlatılamadı — ${parts.join(" | ").slice(0, 700)}`;
            messagesContainer.appendChild(errMsg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        if (buttonEl) {
            buttonEl.disabled = Boolean(lastRoomImageDataUrl) ? false : true;
            buttonEl.textContent = lastRoomImageDataUrl ? "Odamda Gör" : "Önce Oda Yükleyin";
        }
        throw err;
    }
};

window.surRunVTOFromCard.__internalRun = async function (product, roomImage, buttonEl) {
    if (!product) throw new Error("Ürün kataloğuda bulunamadı.");
    const messagesContainer = document.getElementById("aiChatMessages");
    if (!messagesContainer) throw new Error("Sohbet alanı bulunamadı.");
    buttonEl.disabled = true;
    buttonEl.textContent = "Giydiriliyor...";
    const loading = document.createElement("div");
    loading.className = "ai-msg ai-msg-bot ai-try-on-loading";
    loading.textContent = "Odanıza halı giydiriliyor (5-10 sn)...";
    messagesContainer.appendChild(loading);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    try {
        const outputUrl = await runVTO(product, roomImage);
        try {
            await consumeRemoteTryOnCredit();
            consumeTryOnCredit();
        } catch (creditErr) {
            console.warn("Kredi düşürme başarısız, görsel gösterilecek:", creditErr);
        }
        const result = document.createElement("div");
        result.className = "ai-msg ai-msg-bot ai-try-on-result";
        result.innerHTML = `<img src="${escapeHTML(outputUrl)}" alt="Sanal olarak halı yerleştirilmiş oda"><div class="ai-try-on-actions"><a class="ai-category-link" href="${escapeHTML(outputUrl)}" download="sur-hali-sanal-giydirme.jpg">Resmi İndir</a><a class="ai-category-link" target="_blank" rel="noopener" href="https://wa.me/905396369095?text=${encodeURIComponent("Sanal halı görseli hakkında bilgi almak istiyorum: " + outputUrl)}">WhatsApp'tan Gönder</a></div>`;
        messagesContainer.appendChild(result);
        loading.remove();
    } catch (error) {
        const vto = error?.vto;
        console.groupCollapsed("Sanal giydirme başarısız (__internalRun catch)");
        console.error("Hata nesnesi:", error);
        console.error("Mesaj:", error?.message);
        if (vto) {
            console.error("HTTP status:", vto.httpStatus);
            console.error("Edge/Replicate error:", vto.edgeError);
            console.error("Edge/Replicate details:", vto.edgeDetails);
            console.error("Edge/Replicate body (JSON):", vto.edgeBody);
            console.error("Edge/Replicate raw text (varsa):", vto.edgeRawText);
        }
        console.error("Cause:", error?.cause);
        console.error("Stack:", error?.stack);
        console.error("Name:", error?.name);
        console.groupEnd();
        const base = error?.message ? String(error.message) : "Sanal giydirme sırasında bir hata oluştu.";
        const parts = [base];
        if (vto?.edgeDetails && !base.includes(String(vto.edgeDetails))) {
            parts.push("Replicate/Edge Detay: " + String(vto.edgeDetails).slice(0, 220));
        }
        const combined = parts.join(" | ").slice(0, 800);
        loading.textContent = combined;
        buttonEl.disabled = Boolean(lastRoomImageDataUrl) ? false : true;
        buttonEl.textContent = lastRoomImageDataUrl ? "Odamda Gör" : "Önce Oda Yükleyin";
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM yüklendi, sohbet görsel yükleme akışı hazırlanıyor.");
    loadFeaturedProducts();
    loadCategoryCovers();
    loadHeroBackground();
    loadSiteSettings();
    assistantProductsReady = loadAssistantProducts();
    setupCatalogFilters();

    const chatBox = document.getElementById("aiChatBox");
    const closeBtn = document.getElementById("aiChatClose");
    const toggleBtn = document.getElementById("aiChatToggle");
    const sendBtn = document.getElementById("aiChatSend");
    const inputField = document.getElementById("aiChatInput");
    const messagesContainer = document.getElementById("aiChatMessages");
    const uploadBtn = document.getElementById("chat-upload-btn");
    const fileInput = document.getElementById("chat-file-input");

    syncTryOnCredits();

    async function simulateRoom(file) {
        console.log("simulateRoom başladı:", file.name);
        try {
            await syncTryOnCredits();
        } catch (err) {
            console.error("Supabase hak kontrolünde beklenmeyen hata, yerel hakla devam ediliyor:", err);
            if (!localStorage.getItem("tryOnCredits")) localStorage.setItem("tryOnCredits", "2");
        }
        console.log("simulateRoom hak kontrolü tamamlandı. Kalan hak:", getTryOnCredits());
        if (getTryOnCredits() <= 0) {
            const limitMessage = document.createElement("div");
            limitMessage.className = "ai-msg ai-msg-bot";
            limitMessage.textContent = "Ücretsiz oda simülasyonu hakkınız dolmuştur. Sınırsız kullanım hakkı tanımlatmak veya canlı destek almak için WhatsApp hattımızdan (0539 636 90 95) bize ulaşabilirsiniz!";
            messagesContainer.appendChild(limitMessage);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return;
        }

        console.log("Seçilen dosya canvas sıkıştırmasına gönderiliyor.");
        const imageDataUrl = await compressImageToDataUrl(file, 800, 0.7);
        if (!imageDataUrl) {
            throw new Error("Fotoğraf sıkıştırılamadı veya boş döndü. Lütfen farklı bir görsel deneyin.");
        }
        lastRoomImageDataUrl = imageDataUrl;
        console.log("Sıkıştırılmış görsel hazır, lastRoomImageDataUrl GLOBAL state'e atandı. Uzunluk:", imageDataUrl.length);
        console.log("Sıkıştırılmış görsel hazır, önizleme oluşturuluyor.");
        const preview = document.createElement("div");
        preview.className = "ai-msg ai-msg-user ai-room-preview";
        preview.innerHTML = `<img src="${escapeHTML(imageDataUrl)}" alt="Yüklenen oda görseli">`;
        messagesContainer.appendChild(preview);

        const analysisMessage = document.createElement("div");
        analysisMessage.className = "ai-msg ai-msg-bot";
        analysisMessage.textContent = "Odanızı analiz ediyorum...";
        messagesContainer.appendChild(analysisMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            console.log("Oda görseli için Groq Vision isteği başlatılıyor.");
            console.log("simulateRoom API isteğinin ortasında: analyzeRoom çağrılıyor.");
            const analysis = await analyzeRoom(imageDataUrl);
            console.log("simulateRoom Vision yanıtı işlendi.");
            const matchedProducts = findAssistantProducts(analysis);
            const recommendations = matchedProducts.length ? matchedProducts : assistantProducts.slice(0, 2);
            analysisMessage.textContent = recommendations.length
                ? `Odanızda ${analysis} Bu alana uygun seçenekleri aşağıda bulabilirsiniz.`
                : `Oda analizi: ${analysis}`;

            if (recommendations.length) {
                const cards = document.createElement("div");
                cards.className = "ai-product-cards";
                cards.innerHTML = renderAssistantProductCards(recommendations.slice(0, 2), imageDataUrl);
                analysisMessage.appendChild(cards);
                console.log("Oda önerileri gösterildi; giydirme hakkı buton tıklamasında düşürülecek.");
                cards.querySelectorAll(".ai-try-on-button").forEach(button => {
                    button.addEventListener("click", async () => {
                        const product = recommendations.find(item => String(item.id) === button.dataset.productId);
                        if (!product) return;
                        button.disabled = true;
                        button.textContent = "Giydiriliyor...";
                        const loading = document.createElement("div");
                        loading.className = "ai-msg ai-msg-bot ai-try-on-loading";
                        loading.textContent = "Odanıza halı giydiriliyor (5-10 sn)...";
                        messagesContainer.appendChild(loading);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        try {
                            const outputUrl = await runVTO(product, imageDataUrl);
                            await consumeRemoteTryOnCredit();
                            consumeTryOnCredit();
                            const result = document.createElement("div");
                            result.className = "ai-msg ai-msg-bot ai-try-on-result";
                            result.innerHTML = `<img src="${escapeHTML(outputUrl)}" alt="Sanal olarak halı yerleştirilmiş oda"><div class="ai-try-on-actions"><a class="ai-category-link" href="${escapeHTML(outputUrl)}" download="sur-hali-sanal-giydirme.jpg">Resmi İndir</a><a class="ai-category-link" target="_blank" rel="noopener" href="https://wa.me/905396369095?text=${encodeURIComponent("Sanal halı görseli hakkında bilgi almak istiyorum: " + outputUrl)}">WhatsApp'tan Gönder</a></div>`;
                            messagesContainer.appendChild(result);
                            loading.remove();
                        } catch (error) {
                            console.error("Sanal giydirme başarısız:", error);
                            loading.textContent = "Sanal giydirme sırasında bir hata oluştu. Lütfen tekrar deneyin.";
                            button.disabled = false;
                            button.textContent = "Odamda Gör";
                        }
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    });
                });
            }
        } catch (err) {
            console.groupCollapsed("Sanal halı oda analizi başarısız (simulateRoom catch)");
            console.error("Hata:", err);
            console.error("Mesaj:", err?.message);
            console.error("Stack:", err?.stack);
            console.groupEnd();
            const realMessage = err?.message ? String(err.message).trim() : "";
            const shortError = realMessage.length > 0 && realMessage.length < 220
                ? realMessage
                : realMessage.slice(0, 210) + "…";
            const userMsg = shortError
                ? `Oda görseli analiz edilemedi. Lütfen tekrar deneyin veya WhatsApp hattımızdan destek alın. (Detay: ${shortError})`
                : "Oda görseli analiz edilemedi. Lütfen tekrar deneyin veya WhatsApp hattımızdan destek alın.";
            analysisMessage.textContent = userMsg;
            if (err?.message?.includes("analiz edilemedi") || err?.message?.includes("Hatası")) throw err;
            throw err;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (uploadBtn && fileInput) {
        console.log("Görsel yükleme elemanları bulundu, event listener'lar bağlanıyor.");
        uploadBtn.onclick = function (e) {
            e.preventDefault();
            console.log("+ butonuna tıklandı, gizli dosya seçici açılıyor.");
            fileInput.click();
        };
        fileInput.onchange = async function (e) {
            console.log("Dosya seçme olayı başladı.");
            const file = e.target.files[0];
            fileInput.value = "";
            if (!file) {
                console.log("Dosya seçilmedi.");
                return;
            }
            console.log("Dosya seçildi:", file.name);
            if (!file.type.startsWith("image/")) {
                console.error("Seçilen dosya bir görsel değil:", file.type);
                return;
            }
            try {
                console.log("Oda görseli işleme akışı başlatılıyor.");
                await simulateRoom(file);
                console.log("Oda görseli işleme akışı tamamlandı.");
            } catch (error) {
                console.error("Oda görseli işleme akışı başarısız:", error);
            }
        };
    } else {
        console.error("Görsel yükleme elemanları bulunamadı:", {
            uploadButton: Boolean(uploadBtn),
            fileInput: Boolean(fileInput)
        });
    }

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
            cards.querySelectorAll(".ai-try-on-button").forEach(button => {
                button.addEventListener("click", async () => {
                    const product = matchedProducts.find(item => String(item.id) === button.dataset.productId);
                    if (!product) return;
                    if (!lastRoomImageDataUrl) {
                        const warn = document.createElement("div");
                        warn.className = "ai-msg ai-msg-bot";
                        warn.textContent = "Sanal deneme için önce sohbetin altındaki + butonundan oda fotoğrafı yükleyin.";
                        messagesContainer.appendChild(warn);
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        return;
                    }
                    button.disabled = true;
                    button.textContent = "Giydiriliyor...";
                    const loading = document.createElement("div");
                    loading.className = "ai-msg ai-msg-bot ai-try-on-loading";
                    loading.textContent = "Odanıza halı giydiriliyor (5-10 sn)...";
                    messagesContainer.appendChild(loading);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    try {
                        const outputUrl = await runVTO(product, lastRoomImageDataUrl);
                        await consumeRemoteTryOnCredit();
                        consumeTryOnCredit();
                        const result = document.createElement("div");
                        result.className = "ai-msg ai-msg-bot ai-try-on-result";
                        result.innerHTML = `<img src="${escapeHTML(outputUrl)}" alt="Sanal olarak halı yerleştirilmiş oda"><div class="ai-try-on-actions"><a class="ai-category-link" href="${escapeHTML(outputUrl)}" download="sur-hali-sanal-giydirme.jpg">Resmi İndir</a><a class="ai-category-link" target="_blank" rel="noopener" href="https://wa.me/905396369095?text=${encodeURIComponent("Sanal halı görseli hakkında bilgi almak istiyorum: " + outputUrl)}">WhatsApp'tan Gönder</a></div>`;
                        messagesContainer.appendChild(result);
                        loading.remove();
                    } catch (error) {
                        console.error("Sanal giydirme başarısız:", error);
                        loading.textContent = "Sanal giydirme sırasında bir hata oluştu. Lütfen tekrar deneyin.";
                        button.disabled = false;
                        button.textContent = "Odamda Gör";
                    }
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                });
            });
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
