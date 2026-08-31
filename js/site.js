/* SUR HALI - TAM VE GÜNCEL KOD (v102.0) */

const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";

const GROQ_K1 = "gsk_1XmszSHMd9GCOKVsfN44WGdyb3";
const GROQ_K2 = "FYIa5eKHxX5TchnxdWZvVQJZP5";
const GROQ_API_KEY = GROQ_K1 + GROQ_K2;

// Supabase İstemcisi Başlatma
let supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY);
}

// Global Ürün Hafızası (AI için)
let globalProductsCache = [];

// 1. KATEGORİLERİ VE KAPAK RESİMLERİNİ YÜKLEME
async function loadCategories() {
    const categoryContainer = document.getElementById('categoryGrid') || document.getElementById('categoriesContainer');
    if (!categoryContainer || !supabaseClient) return;

    try {
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*');

        if (error || !categories || categories.length === 0) return;

        categoryContainer.innerHTML = categories.map(cat => {
            const name = cat.name || cat.title || 'Koleksiyon';
            const desc = cat.description || 'Seçkin koleksiyonları keşfedin.';
            const coverImg = cat.cover_image || cat.image_url || 'assets/images/logo.jpeg';

            return `
                <div class="category-card" style="background-image: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${coverImg}'); background-size: cover; background-position: center;">
                    <div class="category-content">
                        <span class="category-badge">KOLEKSİYON</span>
                        <h3>${name}</h3>
                        <p>${desc}</p>
                        <a href="#featuredProducts" class="category-link">Koleksiyonu İncele →</a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.warn("Kategori yükleme atlandı/hata:", err);
    }
}

// 2. ÖNE ÇIKAN ÜRÜNLERİ VE GÖRSELLERİ YÜKLEME
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;

    try {
        if (!supabaseClient) {
            container.innerHTML = '<p>Veritabanı bağlantısı kurulamadı. Lütfen sayfayı yenileyin.</p>';
            return;
        }

        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*');

        if (error) {
            console.error("Supabase sorgu hatası:", error);
            throw error;
        }

        if (!products || products.length === 0) {
            container.innerHTML = '<p>Henüz sergilenecek ürün bulunamadı.</p>';
            return;
        }

        // AI için ürünleri önbelleğe al
        globalProductsCache = products;

        // Ürün Kartlarını Oluşturma
        container.innerHTML = products.map(product => {
            const title = product.title || product.name || 'Halı';
            const price = product.price || product.meter_price ? `${product.price || product.meter_price} TL` : 'Fiyat Belirtilmedi';
            
            // Tam Görsel Yolu Doğrulama
            let imgSrc = product.image_url || product.image;
            if (!imgSrc || imgSrc.trim() === '') {
                imgSrc = 'assets/images/logo.jpeg';
            }

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
        container.innerHTML = '<p>Ürünler yüklenirken bir sorun oluştu.</p>';
    }
}

// 3. GROQ YAPAY ZEKA ASİSTANI
async function askGroqAI(userMessage) {
    try {
        // Mağaza ve Örnek Ürün Bağlamı
        const productSummary = globalProductsCache.length > 0 
            ? `Mağazadaki mevcut ürünlerden bazıları: ${globalProductsCache.slice(0, 5).map(p => p.title || p.name).join(', ')}.`
            : '';

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `Sen Bursa İznik'te bulunan Sur Halı mağazasının yardımsever dijital asistanısın. Müşterilere makine halıları, yıkanabilir kaymaz yolluklar, sisal halılar ve özel ölçü kesimleri hakkında samimi, kısa ve nazik bilgiler ver. ${productSummary}`
                    },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Şu an yanıt veremiyorum, dilerseniz WhatsApp hattımızdan (0539 636 90 95) ulaşabilirsiniz.";
    } catch (error) {
        console.error("Groq AI Hatası:", error);
        return "Bağlantı hatası oluştu. Lütfen tekrar deneyin.";
    }
}

// 4. SAYFA TETİKLEYİCİSİ (DOM LOAD)
document.addEventListener("DOMContentLoaded", function () {
    // Verileri Yükle
    loadCategories();
    loadFeaturedProducts();

    // AI Chat Elemanları
    const chatBox = document.getElementById("aiChatBox");
    const closeBtn = document.getElementById("aiChatClose");
    const toggleBtn = document.getElementById("aiChatToggle");
    const sendBtn = document.getElementById("aiChatSend");
    const inputField = document.getElementById("aiChatInput");
    const messagesContainer = document.getElementById("aiChatMessages");

    if (toggleBtn && chatBox) {
        toggleBtn.onclick = function (e) {
            e.preventDefault();
            const isHidden = chatBox.style.display === "none" || chatBox.style.display === "";
            chatBox.style.display = isHidden ? "flex" : "none";
            if (isHidden && inputField) inputField.focus();
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

        messagesContainer.innerHTML += `<div class="ai-msg ai-msg-user" style="background:#2c3e50; color:#fff; padding:8px 12px; border-radius:8px; margin-bottom:8px; text-align:right;">${text}</div>`;
        inputField.value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const botMsg = document.createElement("div");
        botMsg.className = "ai-msg ai-msg-bot";
        botMsg.style.cssText = "background:#e9ecef; padding:8px 12px; border-radius:8px; margin-bottom:8px;";
        botMsg.textContent = "Yazıyor...";
        messagesContainer.appendChild(botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        const reply = await askGroqAI(text);
        botMsg.textContent = reply;
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
