/* SUR HALI - TEMİZ SİSTEM (v101.0) */

var SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
var SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";

var GROQ_K1 = "gsk_1XmszSHMd9GCOKVsfN44WGdyb3";
var GROQ_K2 = "FYIa5eKHxX5TchnxdWZvVQJZP5";

// Groq API anahtarını birleştirme
var GROQ_API_KEY = GROQ_K1 + GROQ_K2;

// Supabase İstemcisi
var supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY);
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

        if (error) {
            console.error("Supabase sorgu hatası:", error);
            throw error;
        }

        if (!products || products.length === 0) {
            container.innerHTML = '<p>Henüz ürün eklenmedi.</p>';
            return;
        }

        // Resim URL Kontrolü ve Basım
        container.innerHTML = products.map(product => {
            const title = product.title || product.name || 'Halı';
            const price = product.price || product.meter_price || 'Fiyat Belirtilmedi';
            
            // Resim URL var mı, yoksa varsayılan resim koy
            let imgSrc = product.image_url || product.image || 'assets/images/logo.jpeg';

            return `
                <div class="product-card">
                    <div class="product-image">
                        <img src="${imgSrc}" alt="${title}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/logo.jpeg';">
                    </div>
                    <div class="product-info">
                        <h3>${title}</h3>
                        <p class="product-price">${price} TL</p>
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
