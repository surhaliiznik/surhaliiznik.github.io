/* SUR HALI - KESİN ÇALIŞAN GÜNCEL KOD */

const SUR_SUPABASE_URL = "https://lhltolrtgnfkbwfkpaex.supabase.co";
const SUR_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxobHRvbHJ0Z25ma2J3ZmtwYWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTExNjYsImV4cCI6MjEwMTY4NzE2Nn0.y8OryUG7jK2lvDwKD6Y61oqPJnzKzd9RWohRQc1bBgw";
const GROQ_API_KEY = "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";

const STORAGE_PUBLIC_URL = `${SUR_SUPABASE_URL}/storage/v1/object/public/halilar/`;

window.surClient = window.supabase ? window.supabase.createClient(SUR_SUPABASE_URL, SUR_SUPABASE_KEY) : null;

// 1. ÖNE ÇIKAN ÜRÜNLERİ YÜKLE
async function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container || !window.surClient) return;

    try {
        // Tablodaki tüm kayıtları çekiyoruz (is_featured filtresi kaldırıldı)
        const { data: products, error } = await window.surClient
            .from('products')
            .select('*');

        if (error || !products || products.length === 0) {
            container.innerHTML = '<p class="no-data" style="text-align:center; width:100%; padding:20px;">Ürün bulunamadı.</p>';
            return;
        }

        container.innerHTML = products.map(product => {
            const title = product.name || product.title || 'Halı Model';
            const price = product.price || product.meter_price ? `${product.price || product.meter_price} TL` : 'Fiyat Belirtilmedi';
            
            let rawImg = product.image_url || product.image || product.cover_image;
            let imgSrc = 'assets/images/logo.jpeg';

            if (rawImg) {
                imgSrc = rawImg.startsWith('http') ? rawImg : `${STORAGE_PUBLIC_URL}${rawImg}`;
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
    }
}

// 2. KOLEKSİYON KAPAK RESİMLERİNİ YÜKLE (category_covers tablosundan)
async function loadCategoryCovers() {
    if (!window.surClient) return;

    try {
        const { data: covers, error } = await window.surClient
            .from('category_covers')
            .select('*');

        if (error || !covers) return;

        covers.forEach(cover => {
            // HTML içindeki data-category eşleşmesine göre kapak resmini kartın içine basar
            const card = document.querySelector(`.category-card[data-category="${cover.category_name}"]`);
            if (card) {
                let imgUrl = cover.image_url || cover.image;
                if (imgUrl && !imgUrl.startsWith('http')) {
                    imgUrl = `${STORAGE_PUBLIC_URL}${imgUrl}`;
                }

                let imgBox = card.querySelector('.category-card-image');
                if (!imgBox) {
                    imgBox = document.createElement('div');
                    imgBox.className = 'category-card-image';
                    card.insertBefore(imgBox, card.firstChild);
                }
                imgBox.innerHTML = `<img src="${imgUrl}" alt="${cover.category_name}">`;
            }
        });
    } catch (err) {
        console.error("Kapak resmi yükleme hatası:", err);
    }
}

// GROQ AI CHATBOT
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
                    { role: "system", content: "Sen Bursa İznik'te bulunan Sur Halı mağazasının yardımsever dijital asistanısın. Müşterilere makine halıları, yıkanabilir kaymaz yolluklar, sisal halılar ve özel ölçü kesimleri hakkında samimi, kısa ve nazik bilgiler ver." },
                    { role: "user", content: userMessage }
                ]
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Şu an yanıt veremiyorum, dilerseniz WhatsApp hattımızdan (0539 636 90 95) ulaşabilirsiniz.";
    } catch (error) {
        return "Bağlantı hatası oluştu. Lütfen tekrar deneyin.";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadFeaturedProducts();
    loadCategoryCovers();

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
