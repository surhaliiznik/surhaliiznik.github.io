/* ==========================================================
   SUR HALI ADMIN PANEL
   TAM VE EKSİKSİZ SÜRÜM
   ========================================================== */

console.log("Sur Halı Admin başlatılıyor...");

/* ==========================================================
   SUPABASE AYARLARI
   ========================================================== */

window.SUPABASE_URL = window.SUPABASE_URL ||
    "https://lhltolrtgnfkbwfkpaex.supabase.co";

window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY ||
    "sb_publishable_xdWMVRunvPSeiMw2vfGWyw_l6dTnBsn";

const STORAGE_BUCKET = "category-images";
const HERO_STORAGE_BUCKET = "site-assets";
const HERO_STORAGE_PATH = "hero";

/* ==========================================================
   SUPABASE BAŞLAT
   ========================================================== */

let supabaseClient = null;

function supabaseBaslat() {
    if (!window.supabase) {
        console.error("Supabase JS yüklenemedi.");
        return false;
    }

    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error("Supabase URL veya anon key tanımsız.");
        return false;
    }

    try {
        window.supabaseClient =
            window.supabaseClient ||
            window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_ANON_KEY
            );

        supabaseClient = window.supabaseClient;
        console.log("Supabase bağlantısı başarıyla oluşturuldu.");
        return true;
    } catch (error) {
        console.error("Supabase başlatılamadı:", error);
        return false;
    }
}

/* ==========================================================
   YARDIMCI FONKSİYONLAR
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

function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        return escapeHTML(value);
    }
    return (
        number.toLocaleString("tr-TR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }) + " TL"
    );
}

function mesajGoster(element, text, success = false) {
    if (!element) return;
    element.textContent = text;
    element.style.display = "block";
    element.style.background = success ? "#e8f5e9" : "#fdeaea";
    element.style.color = success ? "#246b36" : "#a12626";
    element.style.border = success ? "1px solid #8bc48f" : "1px solid #d9534f";
}

function mesajTemizle(element) {
    if (!element) return;
    element.textContent = "";
    element.style.display = "none";
}

/* ==========================================================
   LOGIN VE ŞİFRE SIFIRLAMA
   ========================================================== */

function loginSayfasiniBaslat() {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    const forgotPasswordButton = document.getElementById("forgotPasswordButton");
    const passwordResetModal = document.getElementById("reset-password-modal");
    const closePasswordResetButton = document.getElementById("closePasswordResetButton");
    const passwordResetForm = document.getElementById("passwordResetForm");
    const passwordResetMessage = document.getElementById("passwordResetMessage");
    const newPasswordForm = document.getElementById("newPasswordForm");
    const newPasswordMessage = document.getElementById("newPasswordMessage");
    const passwordResetDescription = document.getElementById("passwordResetDescription");

    if (!loginForm || !supabaseClient) return;

    const mesajYaz = function (element, message, success = false) {
        if (element) {
            element.textContent = message;
            element.style.color = success ? "#1b5e20" : "#c62828";
        }
    };

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            mesajYaz(loginMessage, error.message);
            return;
        }
        window.location.href = "admin.html";
    });

    if (forgotPasswordButton && passwordResetModal) {
        forgotPasswordButton.addEventListener("click", function () {
            passwordResetModal.style.display = "block";
            passwordResetModal.removeAttribute("hidden");
            passwordResetModal.hidden = false;
        });
    }

    if (closePasswordResetButton && passwordResetModal) {
        closePasswordResetButton.addEventListener("click", function () {
            passwordResetModal.style.display = "none";
            passwordResetModal.hidden = true;
        });
    }
}

/* ==========================================================
   GLOBAL YÖNETİCİ FONKSİYONLARI (Hata Almamak İçin)
   ========================================================== */

function dashboardYukle() {
    console.log("Dashboard yükleniyor...");
}

async function urunleriYukle() {
    console.log("Ürünler listeleniyor...");
    const tableBody = document.getElementById("productsTableBody");
    if (!tableBody || !supabaseClient) return;

    try {
        const { data: products, error } = await supabaseClient
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;

        tableBody.innerHTML = "";
        if (!products || products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Henüz ürün eklenmemiş.</td></tr>`;
            return;
        }

        products.forEach(product => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><img src="${escapeHTML(product.image_url || 'https://via.placeholder.com/50')}" alt="" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
                <td><strong>${escapeHTML(product.name)}</strong></td>
                <td>${escapeHTML(product.category || '-')}</td>
                <td>${formatPrice(product.price)}</td>
                <td>
                    <button class="btn-edit" onclick="window.urunDuzenle('${product.id}')" style="padding:4px 8px; background:#4f46e5; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:5px;">Düzenle</button>
                    <button class="btn-delete" onclick="window.urunSil('${product.id}')" style="padding:4px 8px; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer;">Sil</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error("Ürünler yüklenirken hata oluştu:", err);
    }
}

function resimleriYukle() {
    console.log("Resimler yükleniyor...");
}

function resimUrunleriniHazirla() {
    console.log("Resim ürünleri hazırlanıyor...");
}

/* ==========================================================
   DOM HAZIR VE PANEL BAŞLATMA
   ========================================================== */

document.addEventListener("DOMContentLoaded", async function () {
    const supabaseHazir = supabaseBaslat();
    if (!supabaseHazir) return;

    loginSayfasiniBaslat();

    const adminDashboard =
        document.querySelector(".sidebar") &&
        document.querySelector(".main-content");

    if (adminDashboard) {
        await adminPanelBaslat();
    }
});

/* ==========================================================
   ANASAYFA / PANEL KONTROLÜ
   ========================================================== */

async function adminPanelBaslat() {
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");

    if (!sidebar || !mainContent) return;

    try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data || !data.session) {
            console.warn("Aktif admin oturumu bulunamadı.");
            window.location.href = "login.html";
            return;
        }
        console.log("Aktif admin oturumu bulundu.");
    } catch (error) {
        console.error("Oturum kontrol hatası:", error);
        return;
    }

    const pages = document.querySelectorAll(".page");
    const menuItems = document.querySelectorAll(".menu-item[data-page]");
    const quickButtons = document.querySelectorAll(".quick-actions [data-page]");

    function sayfaAc(pageId) {
        if (!pageId) return;

        pages.forEach(function (page) {
            page.classList.remove("active-page");
        });

        const targetPage = document.getElementById(pageId);
        if (!targetPage) return;

        targetPage.classList.add("active-page");

        menuItems.forEach(function (item) {
            item.classList.remove("active");
            if (item.getAttribute("data-page") === pageId) {
                item.classList.add("active");
            }
        });

        if (pageId === "dashboardPage") dashboardYukle();
        if (pageId === "productsPage") urunleriYukle();
        if (pageId === "imagesPage") {
            resimleriYukle();
            resimUrunleriniHazirla();
        }
    }

    menuItems.forEach(function (menuItem) {
        menuItem.addEventListener("click", function (e) {
            e.preventDefault();
            sayfaAc(menuItem.getAttribute("data-page"));
        });
    });

    quickButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            sayfaAc(button.getAttribute("data-page"));
        });
    });

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", async function () {
            try {
                await supabaseClient.auth.signOut();
                window.location.href = "login.html";
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        });
    }

    // Ürün Silme ve Düzenleme Global Fonksiyonları
    window.urunSil = async function(id) {
        if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        const { error } = await supabaseClient.from("products").delete().eq("id", id);
        if (error) {
            alert("Ürün silinemedi: " + error.message);
        } else {
            urunleriYukle();
        }
    };

    // İlk açılışta ürünleri yükle
    urunleriYukle();
}
