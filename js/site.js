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
                console.log("Görsel boyutları:", image.naturalWidth, "x", image.naturalHeight
