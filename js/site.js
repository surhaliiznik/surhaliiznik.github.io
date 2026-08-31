/* ==========================================================
   SUR HALI - TEMİZ DİNAMİK SİSTEM & GROQ AI
   ========================================================== */

// 1. SUPABASE VE GROQ YAPILANDIRMASI
const SUPABASE_URL = "//https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xdWMVRunvPSeiMw2vfGWyw_l6dTnBsn";

// Groq API Anahtarı (Sadece 1 kez tanımlanmalıdır)
const k1 = "gsk_1XmszSHMd9GCOKVsfN44WGdyb3";
const k2 = "FYIa5eKHxX5TchnxdWZvVQJZP5";
const GROQ_API_KEY = k1 + k2;

// Supabase İstemcisi Başlatma
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 2. SUPABASE'DEN ÜRÜNLERİ VE RESİMLERİ ÇEKME
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;

    try {
        if (!supabaseClient) {
            container.innerHTML = '<p>Veritabanı bağlantısı bekleniyor...</p>';
            return;
        }

        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*');

        if (error) throw error;

        if (!products || products.length === 0) {
            container.innerHTML = '<p>Henüz ürün eklenmedi.</p>';
            return;
        }

        // Admin panelinden gelen resimleri ve fiyatları bas
        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image_url || 'assets/images/logo.jpeg'}" alt="${product.title || 'Halı'}" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${product.title || product.name}</h3>
                    <p class="product-price">${product.price || product.meter_price || 'Fiyat Belirtilmedi'} TL</p>
                    <a href="https://wa.me/905396369095?text=Merhaba,%20${encodeURIComponent(product.title || product.name)}%20hakkında%20bilgi%20almak%20istiyorum" target="_blank" class="primary-button">WhatsApp ile Sipariş</a>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Ürün yükleme hatası:", err);
        container.innerHTML = '<p>Ürünler yüklenirken bir sorun oluştu.</p>';
    }
}

// 3. GROQ YAPAY ZEKA ASİSTANI
async function askGroqAI(userMessage) {
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
                    {
                        role: "system",
                        content: "Sen Bursa İznik'te bulunan Sur Halı mağazasının yardımsever dijital asistanısın. Müşterilere makine halıları, yıkanabilir kaymaz yolluklar, sisal halılar ve özel ölçü kesimleri hakkında samimi, kısa ve nazik bilgiler ver."
                    },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Şu an yanıt veremiyorum, dilerseniz WhatsApp hattımızdan ulaşabilirsiniz.";
    } catch (error) {
        console.error("Groq AI Hatası:", error);
        return "Bağlantı hatası oluştu. Lütfen tekrar deneyin.";
    }
}

// 4. SAYFA YÜKLENDİĞİNDE ÇALIŞACAK TETİKLEYİCİ
document.addEventListener("DOMContentLoaded", function () {
    loadFeaturedProducts();

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
