/* ==========================================================
   SUR HALI ADMIN PANEL
   TEMİZ VE STABİL SÜRÜM
   ========================================================== */

console.log("Sur Halı Admin başlatılıyor...");

/* ==========================================================
   SUPABASE AYARLARI
   ========================================================== */

window.SUPABASE_URL = window.SUPABASE_URL ||
    "https://lhltolrtgnfkbwfkpaex.supabase.co";

window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY ||
    "sb_publishable_xdWMVRunvPSeiMw2vfGWyw_l6dTnBsn";

/*
 * SUPABASE STORAGE BUCKET
 * CATEGORY-IMAGES -> Bucket ID: category-images
 */

const STORAGE_BUCKET = "category-images";
const CATEGORY_COVERS_PATH = "category-covers";
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

/* ==========================================================
   DOSYA UZANTISI VE GÜVENLİ DOSYA ADI
   ========================================================== */

function dosyaUzantisi(filename) {
    if (!filename) return "jpg";
    const index = filename.lastIndexOf(".");
    if (index === -1) return "jpg";
    return filename.substring(index + 1).toLowerCase();
}

function guvenliDosyaAdi(filename) {
    const extension = dosyaUzantisi(filename);
    let base = filename.substring(0, filename.lastIndexOf("."));

    const karakterMap = {
        "ç": "c", "Ç": "c",
        "ğ": "g", "Ğ": "g",
        "ı": "i", "İ": "i",
        "ö": "o", "Ö": "o",
        "ş": "s", "Ş": "s",
        "ü": "u", "Ü": "u"
    };

    base = base.replace(/[çÇğĞıİöÖşŞüÜ]/g, function (character) {
        return karakterMap[character] || character;
    });

    base = base
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    if (!base) base = "urun-resmi";

    return base + "-" + Date.now() + "." + extension;
}

function kategoriStorageAdi(category) {
    const map = {
        "Halılar": "halilar",
        "Klasik Yolluklar": "klasik-yolluklar",
        "Sisal": "sisal",
        "Kaymaz": "kaymaz",
        "Özel Kesim": "ozel-kesim"
    };
    return map[category] || "diger";
}

/* ==========================================================
   MESAJ İŞLEMLERİ
   ========================================================== */

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

    if (passwordResetForm) {
        passwordResetForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const emailInput = document.getElementById("resetEmail");
            const { error } = await supabaseClient.auth.resetPasswordForEmail(emailInput.value.trim());

            if (error) {
                mesajYaz(passwordResetMessage, error.message);
                return;
            }

            passwordResetForm.hidden = true;
            if (newPasswordForm) newPasswordForm.removeAttribute("hidden");
            if (passwordResetModal) passwordResetModal.style.display = "block";
            if (passwordResetDescription) {
                passwordResetDescription.textContent = "E-postanıza gelen 6 haneli kodu ve yeni şifrenizi girin.";
            }
            mesajYaz(passwordResetMessage, "6 haneli doğrulama kodu e-postanıza gönderildi", true);
        });
    }

    if (newPasswordForm) {
        newPasswordForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const emailInput = document.getElementById("resetEmail");
            const codeInput = document.getElementById("resetCode");
            const newPasswordInput = document.getElementById("newPassword");
            const newPassword = newPasswordInput.value;
            const confirmation = document.getElementById("newPasswordConfirm").value;

            if (newPassword !== confirmation) {
                mesajYaz(newPasswordMessage, "Şifreler eşleşmiyor.");
                return;
            }

            const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
                email: emailInput.value.trim(),
                token: codeInput.value.trim(),
                type: "recovery"
            });

            if (verifyError || !data || !data.session) {
                mesajYaz(newPasswordMessage, verifyError?.message || "Kurtarma oturumu oluşturulamadı.");
                return;
            }

            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: newPasswordInput.value.trim()
            });

            if (updateError) {
                mesajYaz(newPasswordMessage, updateError.message);
                return;
            }

            mesajYaz(newPasswordMessage, "Şifreniz başarıyla güncellendi!", true);
            setTimeout(function () {
                window.location.href = "login.html";
            }, 1200);
        });
    }
}

async function heroGorseliniYonet() {
    const fileInput = document.getElementById("heroImageFile");
    const saveButton = document.getElementById("saveHeroImageButton");
    const messageElement = document.getElementById("heroImageMessage");

    if (!fileInput || !saveButton || !messageElement) return;

    function showMessage(text, success = false) {
        messageElement.textContent = text;
        messageElement.style.display = "block";
        messageElement.style.background = success ? "#e7f6ec" : "#fdeaea";
        messageElement.style.color = success ? "#166534" : "#991b1b";
    }

    saveButton.addEventListener("click", async function () {
        const file = fileInput.files && fileInput.files[0];
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!file) {
            showMessage("Lütfen bir hero görseli seçin.");
            return;
        }

        if (!allowedTypes.includes(file.type)) {
            showMessage("Sadece JPG, PNG veya WEBP yükleyebilirsiniz.");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Kaydediliyor...";

        try {
            const extension = file.name.split(".").pop().toLowerCase();
            const filePath = `${HERO_STORAGE_PATH}/hero-bg-${Date.now()}.${extension}`;
            const { error: uploadError } = await supabaseClient.storage
                .from(HERO_STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseClient.storage
                .from(HERO_STORAGE_BUCKET)
                .getPublicUrl(filePath);
            const heroUrl = publicUrlData?.publicUrl || "";
            if (!heroUrl) throw new Error("Hero görseli için public URL oluşturulamadı.");

            const { data: settingsRows, error: settingsReadError } = await supabaseClient
                .from("site_settings")
                .select("id")
                .limit(1);

            if (settingsReadError) throw settingsReadError;

            let settingsError;
            if (settingsRows && settingsRows.length > 0) {
                const { error } = await supabaseClient
                    .from("site_settings")
                    .update({ hero_bg_url: heroUrl })
                    .eq("id", settingsRows[0].id);
                settingsError = error;
            } else {
                const { error } = await supabaseClient
                    .from("site_settings")
                    .insert({ hero_bg_url: heroUrl });
                settingsError = error;
            }

            if (settingsError) throw settingsError;

            fileInput.value = "";
            showMessage("Hero görseli başarıyla kaydedildi.", true);
        } catch (error) {
            console.error("Hero görseli kaydetme hatası:", error);
            showMessage(error.message || "Hero görseli kaydedilemedi.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Kaydet";
        }
    });
}

async function musteriHaklariniYonet() {
    const identifierInput = document.getElementById("creditIdentifier");
    const unlimitedButton = document.getElementById("grantUnlimitedCreditsButton");
    const addButton = document.getElementById("addFiveCreditsButton");
    const messageElement = document.getElementById("creditMessage");
    if (!identifierInput || !unlimitedButton || !addButton || !messageElement) return;

    function showMessage(text, success = false) {
        messageElement.textContent = text;
        messageElement.style.display = "block";
        messageElement.style.background = success ? "#e7f6ec" : "#fdeaea";
        messageElement.style.color = success ? "#166534" : "#991b1b";
    }

    async function saveCredits(unlimited) {
        const identifier = identifierInput.value.trim();
        if (!identifier) {
            showMessage("Lütfen telefon numarası veya cihaz ID'si girin.");
            return;
        }

        unlimitedButton.disabled = true;
        addButton.disabled = true;
        try {
            const { data: existing, error: readError } = await supabaseClient
                .from("user_credits")
                .select("id,credits,is_unlimited")
                .eq("identifier", identifier)
                .maybeSingle();

            const currentCredits = Number(existing?.credits) || 0;
            const values = {
                identifier,
                credits: unlimited ? 0 : currentCredits + 5,
                is_unlimited: unlimited,
                updated_at: new Date().toISOString()
            };
            let result;
            if (!readError) {
                result = existing
                    ? await supabaseClient.from("user_credits").update(values).eq("id", existing.id)
                    : await supabaseClient.from("user_credits").insert(values);
            } else {
                const { data: fallback, error: fallbackReadError } = await supabaseClient
                    .from("site_settings")
                    .select("id,identifier,try_on_credits,try_on_unlimited")
                    .eq("identifier", identifier)
                    .maybeSingle();
                if (fallbackReadError) throw fallbackReadError;

                const fallbackValues = {
                    identifier,
                    try_on_credits: unlimited ? 0 : (Number(fallback?.try_on_credits) || 0) + 5,
                    try_on_unlimited: unlimited,
                    updated_at: new Date().toISOString()
                };
                result = fallback
                    ? await supabaseClient.from("site_settings").update(fallbackValues).eq("id", fallback.id)
                    : await supabaseClient.from("site_settings").insert(fallbackValues);
            }
            if (result.error) throw result.error;

            showMessage(unlimited ? "Sınırsız hak tanımlandı." : "+5 hak eklendi.", true);
            identifierInput.value = "";
        } catch (error) {
            console.error("Müşteri hak kaydı güncellenemedi:", error);
            showMessage(error.message || "Müşteri hakkı kaydedilemedi.");
        } finally {
            unlimitedButton.disabled = false;
            addButton.disabled = false;
        }
    }

    unlimitedButton.addEventListener("click", () => saveCredits(true));
    addButton.addEventListener("click", () => saveCredits(false));
}

/* ==========================================================
   DOM HAZIR VE PANEL BAŞLATMA
========================================================== */

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM hazır.");

    const supabaseHazir = supabaseBaslat();
    if (!supabaseHazir) return;

    console.log("Supabase hazır.");
    loginSayfasiniBaslat();

    const adminDashboard =
        document.querySelector(".sidebar") &&
        document.querySelector(".main-content");

    if (adminDashboard) {
        await adminPanelBaslat();
        heroGorseliniYonet();
        musteriHaklariniYonet();
    }
});

/* ==========================================================
   DİNAMİK SAYFA YÖNETİCİLERİ (GLOBAL SCOPE)
   ========================================================== */

function dashboardYukle() {
    console.log("Dashboard yükleniyor...");
}

function urunleriYukle() {
    console.log("Ürünler listeleniyor...");
    // Ürün listeleme/yükleme mantığınız burada yer alır
}

function resimleriYukle() {
    console.log("Resimler yükleniyor...");
}

function resimUrunleriniHazirla() {
    console.log("Resim ürünleri hazırlanıyor...");
}

/* ==========================================================
   ADMIN PANEL BAŞLAT
   ========================================================== */

async function adminPanelBaslat() {
    console.log("Admin paneli başlatılıyor...");

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
                const { error } = await supabaseClient.auth.signOut();
                if (error) return;
                window.location.href = "login.html";
            } catch (error) {
                console.error("Çıkış hatası:", error);
            }
        });
    }

    let duzenlenenUrunId = null;
    const newProductButton = document.getElementById("newProductButton");
    const cancelProductButton = document.getElementById("cancelProductButton");
    const productForm = document.getElementById("productForm");
    const productFormBox = document.getElementById("productFormBox");
    const productFormTitle = document.getElementById("productFormTitle");
    const saveProductButton = document.getElementById("saveProductButton");
    const productFormMessage = document.getElementById("productFormMessage");
    const nameElement = document.getElementById("productName");
    const categoryElement = document.getElementById("productCategory");
    const sizeElement = document.getElementById("productSize");
    const priceElement = document.getElementById("productPrice");
    const descriptionElement = document.getElementById("productDescription");
    const activeElement = document.getElementById("productActive");
    const featuredElement = document.getElementById("productFeatured");
    const badgeElement = document.getElementById("productBadgeText");
    const badgeEnabledElement = document.getElementById("productFeaturedBadge");
    const productSizesElement = document.getElementById("productSizes");
    const addProductSizeButton = document.getElementById("addProductSizeButton");
    const featureElements = {
        point: document.getElementById("featurePoint"),
        thickness: document.getElementById("featureThickness"),
        weight: document.getElementById("featureWeight"),
        material: document.getElementById("featureMaterial"),
        color: document.getElementById("featureColor"),
        robot: document.getElementById("featureRobot")
    };

    function ebatSatiriEkle(size = "", price = "") {
        if (!productSizesElement) return;
        const row = document.createElement("div");
        row.className = "product-size-row";
        row.innerHTML = `
            <input type="text" class="size-value" placeholder="Ebat (160x230)" value="${escapeHTML(size)}">
            <input type="number" class="size-price" min="0" step="0.01" placeholder="Fiyat" value="${escapeHTML(price)}">
            <button type="button" class="remove-size-button" aria-label="Ebadı sil">Sil</button>
        `;
        row.querySelector(".remove-size-button").addEventListener("click", function () {
            row.remove();
        });
        productSizesElement.appendChild(row);
    }

    function formEbatlariniDoldur(sizes) {
        if (!productSizesElement) return;
        productSizesElement.innerHTML = "";
        let parsedSizes = sizes;
        if (typeof parsedSizes === "string") {
            try { parsedSizes = JSON.parse(parsedSizes); } catch (error) { parsedSizes = []; }
        }
        parsedSizes = Array.isArray(parsedSizes) ? parsedSizes : [];
        parsedSizes.forEach(function (item) {
            if (item && typeof item === "object") ebatSatiriEkle(item.size || item.label || "", item.price ?? "");
        });
    }

    if (addProductSizeButton) {
        addProductSizeButton.addEventListener("click", function () {
            ebatSatiriEkle();
        });
    }

    function urunFormunuAc(product = null) {
        if (!productFormBox) return;
        productFormBox.style.display = "block";

        if (product) {
            duzenlenenUrunId = product.id;
            if (productFormTitle) productFormTitle.textContent = "Ürünü Düzenle";
            if (saveProductButton) saveProductButton.textContent = "Güncelle";
            if (nameElement) nameElement.value = product.name || "";
            if (categoryElement) categoryElement.value = product.category || "";
            if (sizeElement) sizeElement.value = product.size || "";
            if (priceElement) priceElement.value = product.price ?? "";
            if (descriptionElement) descriptionElement.value = product.description || "";
            if (activeElement) activeElement.value = String(product.is_active !== false);
            if (featuredElement) featuredElement.checked = product.is_featured === true;
            if (badgeElement) badgeElement.value = product.badge_text || "";
            if (badgeEnabledElement) badgeEnabledElement.checked = product.is_featured_badge === true;

            let productFeatures = product.features;
            if (typeof productFeatures === "string") {
                try { productFeatures = JSON.parse(productFeatures); } catch (error) { productFeatures = {}; }
            }
            Object.keys(featureElements).forEach(function (key) {
                if (featureElements[key]) featureElements[key].value = productFeatures?.[key] ?? "";
            });
            formEbatlariniDoldur(product.sizes);
        } else {
            duzenlenenUrunId = null;
            if (productForm) productForm.reset();
            if (productFormTitle) productFormTitle.textContent = "Yeni Ürün Ekle";
            if (saveProductButton) saveProductButton.textContent = "Ürünü Kaydet";
            if (badgeElement) badgeElement.value = "";
            if (badgeEnabledElement) badgeEnabledElement.checked = false;
            Object.keys(featureElements).forEach(function (key) {
                if (featureElements[key]) featureElements[key].value = "";
            });
            formEbatlariniDoldur([]);
        }

        productFormBox.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function urunFormunuKapat() {
        duzenlenenUrunId = null;
        if (productForm) productForm.reset();
        if (productFormBox) productFormBox.style.display = "none";
        if (productFormTitle) productFormTitle.textContent = "Yeni Ürün Ekle";
        if (saveProductButton) saveProductButton.textContent = "Ürünü Kaydet";
        mesajTemizle(productFormMessage);
    }

    if (newProductButton) newProductButton.addEventListener("click", () => urunFormunuAc());
    if (cancelProductButton) cancelProductButton.addEventListener("click", () => urunFormunuKapat());

    async function gorselKaydet(productId, imageUrl, asCategoryCover = false) {
        if (!asCategoryCover) {
            const { error: productImageError } = await supabaseClient
                .from("products")
                .update({ image_url: imageUrl })
                .eq("id", productId);

            if (productImageError) {
                console.warn("Ürün ana resmi güncellenemedi:", productImageError);
            }
        }
    }
}
