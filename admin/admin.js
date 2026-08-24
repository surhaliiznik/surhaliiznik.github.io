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
 *
 * Supabase panelinde görünen:
 *
 * CATEGORY-IMAGES
 *
 * Bucket ID:
 *
 * category-images
 */

const STORAGE_BUCKET =
    "category-images";

const CATEGORY_COVERS_PATH =
    "category-covers";


/* ==========================================================
   SUPABASE BAŞLAT
   ========================================================== */

let supabaseClient = null;


function supabaseBaslat() {

    if (!window.supabase) {

        console.error(
            "Supabase JS yüklenemedi."
        );

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


        console.log(
            "Supabase bağlantısı başarıyla oluşturuldu."
        );


        return true;

    } catch (error) {

        console.error(
            "Supabase başlatılamadı:",
            error
        );

        return false;
    }
}


/* ==========================================================
   YARDIMCI FONKSİYONLAR
   ========================================================== */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

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

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "-";
    }


    const number =
        Number(value);


    if (Number.isNaN(number)) {

        return escapeHTML(value);
    }


    return (
        number.toLocaleString(
            "tr-TR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ) +
        " TL"
    );
}


/* ==========================================================
   DOSYA UZANTISI
   ========================================================== */

function dosyaUzantisi(filename) {

    if (!filename) {

        return "jpg";
    }


    const index =
        filename.lastIndexOf(".");


    if (index === -1) {

        return "jpg";
    }


    return filename
        .substring(index + 1)
        .toLowerCase();
}


/* ==========================================================
   GÜVENLİ DOSYA ADI
   ========================================================== */

function guvenliDosyaAdi(filename) {

    const extension =
        dosyaUzantisi(filename);


    let base =
        filename
            .substring(
                0,
                filename.lastIndexOf(".")
            );


    /*
     * Türkçe karakterleri
     * ASCII karakterlere çevir.
     */

    const karakterMap = {

        "ç": "c",
        "Ç": "c",

        "ğ": "g",
        "Ğ": "g",

        "ı": "i",
        "İ": "i",

        "ö": "o",
        "Ö": "o",

        "ş": "s",
        "Ş": "s",

        "ü": "u",
        "Ü": "u"
    };


    base =
        base.replace(
            /[çÇğĞıİöÖşŞüÜ]/g,
            function (character) {

                return karakterMap[character] || character;
            }
        );


    base =
        base
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");


    if (!base) {

        base =
            "urun-resmi";
    }


    /*
     * Aynı isimli dosyaların
     * çakışmasını engelle.
     */

    return (
        base +
        "-" +
        Date.now() +
        "." +
        extension
    );
}


/* ==========================================================
   KATEGORİYİ STORAGE İÇİN GÜVENLİ HALE GETİR
   ========================================================== */

function kategoriStorageAdi(category) {

    const map = {

        "Halılar":
            "halilar",

        "Klasik Yolluklar":
            "klasik-yolluklar",

        "Sisal":
            "sisal",

        "Kaymaz":
            "kaymaz",

        "Özel Kesim":
            "ozel-kesim"
    };


    return (
        map[category] ||
        "diger"
    );
}


/* ==========================================================
   MESAJ GÖSTER
   ========================================================== */

function mesajGoster(
    element,
    text,
    success = false
) {

    if (!element) {

        return;
    }


    element.textContent =
        text;


    element.style.display =
        "block";


    element.style.background =
        success
            ? "#e8f5e9"
            : "#fdeaea";


    element.style.color =
        success
            ? "#246b36"
            : "#a12626";


    element.style.border =
        success
            ? "1px solid #8bc48f"
            : "1px solid #d9534f";
}


/* ==========================================================
   MESAJ TEMİZLE
   ========================================================== */

function mesajTemizle(element) {

    if (!element) {

        return;
    }


    element.textContent =
        "";


    element.style.display =
        "none";
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

    if (!loginForm || !supabaseClient) {
        return;
    }

    const mesajYaz = function (element, message, success = false) {
        if (element) {
            element.textContent = message;
            element.style.color = success ? "#1b5e20" : "#c62828";
        }
    };

    const yeniSifreModunuAc = function () {
        if (passwordResetModal) {
            passwordResetModal.removeAttribute("hidden");
            passwordResetModal.style.display = "block";
            passwordResetModal.hidden = false;
        }
        if (passwordResetForm) {
            passwordResetForm.hidden = true;
        }
        if (newPasswordForm) {
            newPasswordForm.hidden = false;
        }
        if (passwordResetDescription) {
            passwordResetDescription.textContent = "Yeni şifreni belirle ve kaydet.";
        }
    };

    if (loginForm) {
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
    }

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
            const { error } = await supabaseClient.auth.resetPasswordForEmail(
                emailInput.value.trim()
            );

            if (error) {
                mesajYaz(passwordResetMessage, error.message);
                return;
            }

            if (passwordResetForm) {
                passwordResetForm.hidden = true;
            }
            if (newPasswordForm) {
                newPasswordForm.removeAttribute("hidden");
                newPasswordForm.hidden = false;
            }
            if (passwordResetModal) {
                passwordResetModal.style.display = "block";
                passwordResetModal.removeAttribute("hidden");
            }
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

            if (verifyError) {
                console.error("Şifre sıfırlama doğrulama hatası:", verifyError);
                mesajYaz(newPasswordMessage, verifyError.message);
                return;
            }

            if (!data || !data.session) {
                const sessionError = "Kurtarma oturumu oluşturulamadı.";
                console.error("Şifre sıfırlama doğrulama hatası:", sessionError);
                mesajYaz(newPasswordMessage, sessionError);
                return;
            }

            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: newPasswordInput.value.trim()
            });

            if (updateError) {
                console.error("Yeni şifre güncellenemedi:", updateError);
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


/* ==========================================================
   DOM HAZIR
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log("DOM hazır.");


        const supabaseHazir =
            supabaseBaslat();


        if (!supabaseHazir) {

            return;
        }


        console.log("Supabase hazır.");


        loginSayfasiniBaslat();


        const adminDashboard =
            document.querySelector(".sidebar") &&
            document.querySelector(".main-content");


        if (adminDashboard) {
            await adminPanelBaslat();
        }

    }
);


/* ==========================================================
   ADMIN PANEL BAŞLAT
   ========================================================== */

async function adminPanelBaslat() {

    console.log(
        "Admin paneli başlatılıyor..."
    );


    const sidebar =
        document.querySelector(".sidebar");


    const mainContent =
        document.querySelector(".main-content");


    if (!sidebar || !mainContent) {
        return;
    }


    console.log(
        "Admin paneli bulundu."
    );


    /* ======================================================
       OTURUM KONTROLÜ
       ====================================================== */

    try {

        const { data, error } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Oturum kontrol hatası:",
                error
            );

            return;
        }


        if (!data || !data.session) {

            console.warn(
                "Aktif admin oturumu bulunamadı."
            );


            window.location.href =
                "login.html";


            return;
        }


        console.log(
            "Aktif admin oturumu bulundu."
        );

    } catch (error) {

        console.error(
            "Oturum kontrol hatası:",
            error
        );

        return;
    }


    /* ======================================================
       SAYFALAR
       ====================================================== */

    const pages = document.querySelectorAll(".page");


    const menuItems = document.querySelectorAll(
        ".menu-item[data-page]"
    );


    const quickButtons = document.querySelectorAll(
        ".quick-actions [data-page]"
    );


    /* ======================================================
       SAYFA AÇ
       ====================================================== */

    function sayfaAc(pageId) {

        if (!pageId) {

            return;
        }


        console.log(
            "Sayfa açılıyor:",
            pageId
        );


        pages.forEach(function (page) {
            page.classList.remove("active-page");
        });


        const targetPage = document.getElementById(pageId);


        if (!targetPage) {

            console.warn(
                "Sayfa bulunamadı:",
                pageId
            );

            return;
        }


        targetPage.classList.add("active-page");


        menuItems.forEach(function (item) {

            item.classList.remove("active");


            if (item.getAttribute("data-page") === pageId) {

                item.classList.add("active");
            }
        });


        if (pageId === "dashboardPage") {

            dashboardYukle();
        }


        if (pageId === "productsPage") {

            urunleriYukle();
        }


        if (pageId === "imagesPage") {

            resimleriYukle();

            resimUrunleriniHazirla();
        }
    }


    /* ======================================================
       MENÜLER
       ====================================================== */

    menuItems.forEach(function (menuItem) {

        menuItem.addEventListener("click", function (e) {

            e.preventDefault();


            const pageId = menuItem.getAttribute("data-page");


            sayfaAc(pageId);
        });
    });


    /* ======================================================
       HIZLI BUTONLAR
       ====================================================== */

    quickButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const pageId = button.getAttribute("data-page");


            sayfaAc(pageId);
        });
    });


    /* ======================================================
       ÇIKIŞ
       ====================================================== */

    const logoutButton = document.getElementById("logoutButton");


    if (logoutButton) {

        logoutButton.addEventListener("click", async function () {

            try {

                const { error } = await supabaseClient.auth.signOut();


                if (error) {

                    console.error("Çıkış hatası:", error);

                    return;
                }


                window.location.href = "login.html";

            } catch (error) {

                console.error("Çıkış hatası:", error);
            }
        });
    }


    /* ======================================================
       ÜRÜN ELEMANLARI
       ====================================================== */

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
            <button type="button" class="remove-size-button" aria-label="Ebadi sil">Sil</button>
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

    if (addProductSizeButton) addProductSizeButton.addEventListener("click", function () {
        ebatSatiriEkle();
    });


    /* ======================================================
       ÜRÜN FORMUNU AÇ
       ====================================================== */

    function urunFormunuAc(product = null) {

        if (!productFormBox) {

            return;
        }


        productFormBox.style.display = "block";


        if (product) {

            duzenlenenUrunId = product.id;


            if (productFormTitle) {

                productFormTitle.textContent = "Ürünü Düzenle";
            }


            if (saveProductButton) {

                saveProductButton.textContent = "Güncelle";
            }


            if (nameElement) {

                nameElement.value = product.name || "";
            }


            if (categoryElement) {

                categoryElement.value = product.category || "";
            }


            if (sizeElement) {

                sizeElement.value = product.size || "";
            }


            if (priceElement) {

                priceElement.value = product.price ?? "";
            }


            if (descriptionElement) {

                descriptionElement.value = product.description || "";
            }


            if (activeElement) {

                activeElement.value = String(product.is_active !== false);
            }


            if (featuredElement) {

                featuredElement.checked = product.is_featured === true;
            }

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


            if (productForm) {

                productForm.reset();
            }


            if (productFormTitle) {

                productFormTitle.textContent = "Yeni Ürün Ekle";
            }


            if (saveProductButton) {

                saveProductButton.textContent = "Ürünü Kaydet";
            }

            if (badgeElement) badgeElement.value = "";
            if (badgeEnabledElement) badgeEnabledElement.checked = false;
            Object.keys(featureElements).forEach(function (key) {
                if (featureElements[key]) featureElements[key].value = "";
            });
            formEbatlariniDoldur([]);
        }


        productFormBox.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    /* ======================================================
       ÜRÜN FORMUNU KAPAT
       ====================================================== */

    function urunFormunuKapat() {

        duzenlenenUrunId = null;


        if (productForm) {

            productForm.reset();
        }


        if (productFormBox) {

            productFormBox.style.display = "none";
        }


        if (productFormTitle) {

            productFormTitle.textContent = "Yeni Ürün Ekle";
        }


        if (saveProductButton) {

            saveProductButton.textContent = "Ürünü Kaydet";
        }


        mesajTemizle(productFormMessage);
    }


    if (newProductButton) {

        newProductButton.addEventListener("click", function () {

            urunFormunuAc();
        });
    }


    if (cancelProductButton) {

        cancelProductButton.addEventListener("click", function () {

            urunFormunuKapat();
        });
    }


    /* ======================================================
       ÜRÜN KAYDET
       ====================================================== */

    if (productForm) {

        productForm.addEventListener("submit", async function (e) {

            e.preventDefault();


            const name = nameElement ? nameElement.value.trim() : "";


            const category = categoryElement ? categoryElement.value : "";


            const size = sizeElement ? sizeElement.value.trim() : "";


            const priceText = priceElement ? priceElement.value.trim() : "";


            const description = descriptionElement ? descriptionElement.value.trim() : "";


            const isActive = activeElement ? activeElement.value === "true" : true;


            const isFeatured = featuredElement ? featuredElement.checked : false;
            const features = {};
            Object.keys(featureElements).forEach(function (key) {
                const value = featureElements[key] ? featureElements[key].value.trim() : "";
                if (value) features[key] = value;
            });
            const sizes = productSizesElement
                ? Array.from(productSizesElement.querySelectorAll(".product-size-row")).map(function (row) {
                    return {
                        size: row.querySelector(".size-value").value.trim(),
                        price: Number(row.querySelector(".size-price").value)
                    };
                }).filter(function (item) { return item.size && !Number.isNaN(item.price); })
                : [];


            mesajTemizle(productFormMessage);


            if (!name) {

                mesajGoster(productFormMessage, "Ürün adı boş bırakılamaz.");

                return;
            }


            if (!category) {

                mesajGoster(productFormMessage, "Lütfen kategori seçin.");

                return;
            }


            let price = null;


            if (priceText !== "") {

                price = Number(priceText);


                if (Number.isNaN(price)) {

                    mesajGoster(productFormMessage, "Fiyat bilgisi geçerli değil.");

                    return;
                }


            }


            const urunData = {

                name: name,

                category: category,

                size: size || null,

                price: price,

                description: description || null,

                is_active: isActive,

                is_featured: isFeatured,
                features: features,
                sizes: sizes,
                is_featured_badge: badgeEnabledElement ? badgeEnabledElement.checked : false,
                badge_text: badgeElement ? badgeElement.value.trim() || null : null
            };


            try {

                if (duzenlenenUrunId) {

                    const { error } = await supabaseClient.from("products").update(urunData).eq("id", duzenlenenUrunId);


                    if (error) {

                        throw error;
                    }


                    mesajGoster(productFormMessage, "Ürün başarıyla güncellendi.", true);

                } else {

                    const { error } = await supabaseClient.from("products").insert([urunData]);


                    if (error) {

                        throw error;
                    }


                    mesajGoster(productFormMessage, "Ürün başarıyla kaydedildi.", true);
                }


                duzenlenenUrunId = null;


                if (productForm) {

                    productForm.reset();
                }


                if (productFormTitle) {

                    productFormTitle.textContent = "Yeni Ürün Ekle";
                }


                if (saveProductButton) {

                    saveProductButton.textContent = "Ürünü Kaydet";
                }


                await urunleriYukle();

                await dashboardYukle();

                await resimUrunleriniHazirla();

            } catch (error) {

                console.error("Ürün kaydetme hatası:", error);


                mesajGoster(productFormMessage, error.message || "Ürün kaydedilemedi.");
            }
        });
    }


    /* ======================================================
       ÜRÜNLERİ YÜKLE
       ====================================================== */

    async function urunleriYukle() {

        const productList = document.getElementById("productList");


        const productCount = document.getElementById("productCount");


        if (!productList) {

            return;
        }


        productList.innerHTML = "<p>Ürünler yükleniyor...</p>";


        try {

            const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });


            if (error) {

                throw error;
            }


            const products = data || [];


            if (productCount) {

                productCount.textContent = products.length + " ürün";
            }


            if (products.length === 0) {

                productList.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-icon">
                            ▤
                        </div>

                        <h2>
                            Henüz ürün yok
                        </h2>

                        <p>
                            Yeni Ürün butonunu kullanarak ürün ekleyebilirsiniz.
                        </p>

                    </div>
                `;

                return;
            }


            productList.innerHTML = products.map(function (product) {

                return `

                                <div
                                    class="product-item"
                                    style="
                                        display:flex;
                                        justify-content:space-between;
                                        align-items:center;
                                        gap:20px;
                                        padding:18px;
                                        margin-bottom:12px;
                                        border:1px solid rgba(212,175,55,.25);
                                        border-radius:10px;
                                    "
                                >

                                    <div>

                                        <h3>
                                            ${escapeHTML(product.name)}
                                        </h3>

                                        <p>
                                            <strong>Kategori:</strong>
                                            ${escapeHTML(product.category || "-")}
                                        </p>

                                        <p>
                                            <strong>Ölçü:</strong>
                                            ${escapeHTML(product.size || "-")}
                                        </p>

                                        <p>
                                            <strong>Fiyat:</strong>
                                            ${formatPrice(product.price)}
                                        </p>

                                        <p>
                                            <strong>Durum:</strong>
                                            ${product.is_active ? "Aktif" : "Pasif"}
                                        </p>

                                        <p>
                                            <strong>Vitrin:</strong>
                                            ${product.is_featured ? "Açık" : "Kapalı"}
                                        </p>

                                    </div>


                                    <div
                                        style="
                                            display:flex;
                                            gap:10px;
                                            flex-wrap:wrap;
                                        "
                                    >

                                        <button
                                            type="button"
                                            class="edit-product-button"
                                            data-id="${escapeHTML(product.id)}"
                                            style="
                                                padding:8px 12px;
                                                cursor:pointer;
                                                color:#D4AF37;
                                                border:1px solid #D4AF37;
                                                background:transparent;
                                                border-radius:6px;
                                            "
                                        >
                                            Düzenle
                                        </button>


                                        <button
                                            type="button"
                                            class="toggle-featured-button"
                                            data-id="${escapeHTML(product.id)}"
                                            data-featured="${product.is_featured ? "true" : "false"}"
                                            style="
                                                padding:8px 12px;
                                                cursor:pointer;
                                                color:#1c1917;
                                                border:1px solid #c5a880;
                                                background:${product.is_featured ? "#d4af37" : "transparent"};
                                                border-radius:6px;
                                            "
                                        >
                                            ${product.is_featured ? "Vitrinden Çıkar" : "Vitrine Al"}
                                        </button>


                                        <button
                                            type="button"
                                            class="delete-product-button"
                                            data-id="${escapeHTML(product.id)}"
                                            style="
                                                padding:8px 14px;
                                                cursor:pointer;
                                                color:#fff;
                                                background:#b52b2b;
                                                border:0;
                                                border-radius:6px;
                                            "
                                        >
                                            Sil
                                        </button>

                                    </div>

                                </div>
                            `;
            }).join("");


            /* ==================================================
               ÜRÜN DÜZENLE
               ================================================== */

            productList.querySelectorAll(".edit-product-button").forEach(function (button) {
                button.addEventListener("click", async function () {

                    const id = button.getAttribute("data-id");


                    const { data, error } = await supabaseClient.from("products").select("*").eq("id", id).single();


                    if (error) {

                        console.error("Ürün alınamadı:", error);

                        return;
                    }


                    urunFormunuAc(data);
                });
            });


            /* ==================================================
               VİTRİN DURUMUNU DEĞİŞTİR
               ================================================== */

            productList.querySelectorAll(".toggle-featured-button").forEach(function (button) {
                button.addEventListener("click", async function () {
                    const id = button.dataset.id;
                    const nextValue = button.dataset.featured !== "true";

                    button.disabled = true;

                    try {
                        const { error } = await supabaseClient
                            .from("products")
                            .update({ is_featured: nextValue })
                            .eq("id", id);

                        if (error) {
                            throw error;
                        }

                        await urunleriYukle();
                        await dashboardYukle();
                    } catch (error) {
                        console.error("Vitrin durumu güncellenemedi:", error);
                        alert(error.message || "Vitrin durumu güncellenemedi.");
                        button.disabled = false;
                    }
                });
            });


            /* ==================================================
               ÜRÜN SİL
               ================================================== */

            productList.querySelectorAll(".delete-product-button").forEach(function (button) {
                button.addEventListener("click", async function () {

                    const id = button.getAttribute("data-id");


                    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) {

                        return;
                    }


                    try {

                        /*
                         * Ürüne ait resimleri bul.
                         */

                        const { data: images, error: imageError } = await supabaseClient.from("category_images").select("id,image_path").eq("product_id", id);


                        if (imageError) {

                            throw imageError;
                        }


                        /*
                         * Storage dosyalarını sil.
                         */

                        if (images && images.length) {

                            const paths = images.map(image => image.image_path).filter(Boolean);


                            if (paths.length) {

                                const { error: storageError } = await supabaseClient.storage.from(STORAGE_BUCKET).remove(paths);


                                if (storageError) {

                                    console.warn("Storage dosyaları silinemedi:", storageError);
                                }
                            }


                            const { error: imageDeleteError } = await supabaseClient.from("category_images").delete().eq("product_id", id);


                            if (imageDeleteError) {

                                throw imageDeleteError;
                            }
                        }


                        /*
                         * Ürünü sil.
                         */

                        const { error } = await supabaseClient.from("products").delete().eq("id", id);


                        if (error) {

                            throw error;
                        }


                        await urunleriYukle();

                        await dashboardYukle();

                        await resimUrunleriniHazirla();

                    } catch (error) {

                        console.error("Ürün silme hatası:", error);


                        alert(error.message || "Ürün silinemedi.");
                    }
                });
            });

        } catch (error) {

            console.error("Ürünler alınamadı:", error);


            productList.innerHTML = `

                <div class="empty-state">

                    <h2>
                        Ürünler yüklenemedi
                    </h2>

                    <p>
                        ${escapeHTML(error.message)}
                    </p>

                </div>
            `;


            if (productCount) {

                productCount.textContent = "0 ürün";
            }
        }
    }


    /* ======================================================
       DASHBOARD
       ====================================================== */

    async function dashboardYukle() {

        const totalProducts = document.getElementById("totalProducts");


        const activeProducts = document.getElementById("activeProducts");


        const totalImages = document.getElementById("totalImages");


        try {

            const { count: productCount, error: productError } = await supabaseClient.from("products").select("id", { count: "exact", head: true });


            if (productError) {

                throw productError;
            }


            const { count: activeCount, error: activeError } = await supabaseClient.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);


            if (activeError) {

                throw activeError;
            }


            const { count: imageCount, error: imageError } = await supabaseClient.from("category_images").select("id", { count: "exact", head: true });


            if (imageError) {

                throw imageError;
            }


            if (totalProducts) {

                totalProducts.textContent = productCount || 0;
            }


            if (activeProducts) {

                activeProducts.textContent = activeCount || 0;
            }


            if (totalImages) {

                totalImages.textContent = imageCount || 0;
            }

        } catch (error) {

            console.error("Dashboard verileri alınamadı:", error);
        }
    }


    /* ======================================================
       RESİM ELEMANLARI
       ====================================================== */

    const imageFile = document.getElementById("imageFile");


    const imageCategory = document.getElementById("imageCategory");


    const imageProduct = document.getElementById("imageProduct");


    const imagePreviewBox = document.getElementById("imagePreviewBox");


    const imagePreview = document.getElementById("imagePreview");


    const uploadImageButton = document.getElementById("uploadImageButton");


    const imageUploadMessage = document.getElementById("imageUploadMessage");

    const categoryCoverCheckbox = document.getElementById("asCategoryCover");


    /* ======================================================
       KATEGORİ DEĞİŞTİ
       ====================================================== */

    if (imageCategory) {

        imageCategory.addEventListener("change", async function () {

            await resimUrunleriniHazirla();
        });
    }

    if (categoryCoverCheckbox && imageProduct) {

        categoryCoverCheckbox.addEventListener("change", function () {

            imageProduct.disabled = categoryCoverCheckbox.checked;

            if (categoryCoverCheckbox.checked) {
                imageProduct.value = "";
            } else if (imageCategory && imageCategory.value) {
                resimUrunleriniHazirla();
            }
        });
    }


    /* ======================================================
       KATEGORİYE GÖRE ÜRÜNLERİ GETİR
       ====================================================== */

    async function resimUrunleriniHazirla() {

        if (!imageProduct) {

            console.warn("imageProduct elementi bulunamadı.");

            return;
        }


        const category = imageCategory ? imageCategory.value : "";


        imageProduct.innerHTML = "";


        imageProduct.disabled = true;


        if (categoryCoverCheckbox && categoryCoverCheckbox.checked) {

            imageProduct.innerHTML = `

                <option value="">
                    Kategori kapağı seçildi
                </option>
            `;

            return;
        }


        if (!category) {

            imageProduct.innerHTML = `

                <option value="">
                    Önce kategori seçiniz
                </option>
            `;

            return;
        }


        imageProduct.innerHTML = `

            <option value="">
                Ürünler yükleniyor...
            </option>
        `;


        try {

            const { data, error } = await supabaseClient.from("products").select("id,name,size,price,is_active").eq("category", category).order("name", { ascending: true });


            if (error) {

                throw error;
            }


            const products = data || [];


            const activeProducts = products.filter(product => product.is_active !== false);


            if (activeProducts.length === 0) {

                imageProduct.innerHTML = `

                    <option value="">
                        Bu kategoride ürün bulunamadı
                    </option>
                `;


                imageProduct.disabled = true;


                return;
            }


            imageProduct.innerHTML = `

                <option value="">
                    Ürün seçiniz
                </option>
            `;


            activeProducts.forEach(function (product) {

                const option = document.createElement("option");


                option.value = product.id;


                option.textContent = product.size ? product.name + " — " + product.size : product.name;


                imageProduct.appendChild(option);
            });


            imageProduct.disabled = false;

        } catch (error) {

            console.error("Kategori ürünleri alınamadı:", error);


            imageProduct.innerHTML = `

                <option value="">
                    Ürünler yüklenemedi
                </option>
            `;


            imageProduct.disabled = true;
        }
    }


    /* ======================================================
       RESİM ÖNİZLEME
       ====================================================== */

    if (imageFile) {

        imageFile.addEventListener("change", function () {

            mesajTemizle(imageUploadMessage);


            const file = imageFile.files && imageFile.files[0];


            if (!file) {

                if (imagePreviewBox) {

                    imagePreviewBox.style.display = "none";
                }


                return;
            }


            if (!file.type.startsWith("image/")) {

                mesajGoster(imageUploadMessage, "Lütfen geçerli bir resim dosyası seçin.");


                imageFile.value = "";


                return;
            }


            const reader = new FileReader();


            reader.onload = function (event) {

                if (imagePreview) {

                    imagePreview.src = event.target.result;
                }


                if (imagePreviewBox) {

                    imagePreviewBox.style.display = "block";
                }
            };


            reader.readAsDataURL(file);
        });
    }


    /* ======================================================
       RESİM YÜKLE
       ====================================================== */

    if (uploadImageButton) {

        uploadImageButton.addEventListener("click", async function () {

            mesajTemizle(imageUploadMessage);


            const file = imageFile && imageFile.files && imageFile.files[0];


            const category = imageCategory ? imageCategory.value : "";


            const productId = imageProduct ? imageProduct.value : "";


            /* ------------------------------------------
               KONTROLLER
               ------------------------------------------ */

            if (!file) {

                mesajGoster(imageUploadMessage, "Lütfen bir resim seçin.");

                return;
            }


            if (!category) {

                mesajGoster(imageUploadMessage, "Lütfen resim kategorisini seçin.");

                return;
            }


            const asCategoryCover = categoryCoverCheckbox?.checked || false;

            if (!asCategoryCover && !productId) {

                mesajGoster(imageUploadMessage, "Lütfen resmi bağlayacağınız ürünü seçin.");

                return;
            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp"
            ];


            if (!allowedTypes.includes(file.type)) {

                mesajGoster(imageUploadMessage, "Sadece JPG, PNG veya WEBP yükleyebilirsiniz.");

                return;
            }


            uploadImageButton.disabled = true;


            uploadImageButton.textContent = "Yükleniyor...";


            try {

                /* --------------------------------------
                   ÜRÜNÜ BUL (sadece ürün bağlıysa)
                   -------------------------------------- */

                let product = null;

                if (!asCategoryCover) {

                    const { data: productData, error: productError } = await supabaseClient.from("products").select("id,name,category").eq("id", productId).single();


                    if (productError) {

                        throw productError;
                    }


                    if (!productData) {

                        throw new Error("Seçilen ürün bulunamadı.");
                    }


                    product = productData;
                }


                /* --------------------------------------
                   STORAGE KATEGORİ ADI
                   -------------------------------------- */

                const storageCategory = kategoriStorageAdi(category);


                /* --------------------------------------
                   DOSYA YOLU
                   -------------------------------------- */

                let filePath = "";


                if (asCategoryCover) {

                    // category cover path
                    filePath = CATEGORY_COVERS_PATH + "/" + storageCategory + "/" + guvenliDosyaAdi(file.name);

                } else {

                    // existing product-based path
                    const fileName = guvenliDosyaAdi(file.name);

                    filePath = storageCategory + "/" + productId + "/" + fileName;
                }


                console.log("Storage bucket:", STORAGE_BUCKET);


                console.log("Storage filePath:", filePath);


                /* --------------------------------------
                   STORAGE'A YÜKLE
                   -------------------------------------- */

                const { error: uploadError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(filePath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                });


                if (uploadError) {

                    console.error("Storage upload hatası:", uploadError);


                    if (uploadError.message && uploadError.message.toLowerCase().includes("bucket")) {

                        throw new Error("category-images Storage bucket bulunamadı. Supabase Storage > Buckets bölümünde bucket ID'sinin category-images olduğundan emin olun.");
                    }


                    if (uploadError.message && (uploadError.message.toLowerCase().includes("policy") || uploadError.message.toLowerCase().includes("not allowed") || uploadError.message.toLowerCase().includes("permission"))) {

                        throw new Error("Storage güvenlik politikası yüklemeye izin vermiyor. storage.objects INSERT policy oluşturmanız gerekiyor.");
                    }


                    throw uploadError;
                }


                console.log("Storage yükleme başarılı:", filePath);


                /* --------------------------------------
                   PUBLIC URL
                   -------------------------------------- */

                const { data: publicUrlData } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);


                const imageUrl = publicUrlData && publicUrlData.publicUrl ? publicUrlData.publicUrl : "";


                if (!imageUrl) {

                    await supabaseClient.storage.from(STORAGE_BUCKET).remove([filePath]);


                    throw new Error("Resmin public URL'si oluşturulamadı.");
                }


                console.log("Resim URL:", imageUrl);


                /* --------------------------------------
                   DATABASE KAYDI
                   -------------------------------------- */

                if (asCategoryCover) {

                    // Insert as a category cover: product_id = null
                    const { data: imageRecord, error: databaseError } = await supabaseClient.from("category_images").insert([
                        {
                            category: category,
                            image_path: filePath,
                            image_url: imageUrl,
                            product_id: null
                        }
                    ]).select().single();


                    if (databaseError) {

                        console.error("category_images kayıt hatası (cover):", databaseError);


                        // remove from storage if DB insert failed
                        await supabaseClient.storage.from(STORAGE_BUCKET).remove([filePath]);


                        throw databaseError;
                    }


                    console.log("category_images kaydı başarılı (cover):", imageRecord);


                    mesajGoster(imageUploadMessage, "Kategori kapağı başarıyla yüklendi.", true);


                } else {

                    const { data: imageRecord, error: databaseError } = await supabaseClient.from("category_images").insert([
                        {
                            category: category,
                            image_path: filePath,
                            image_url: imageUrl,
                            product_id: productId
                        }
                    ]).select().single();


                    if (databaseError) {

                        console.error("category_images kayıt hatası:", databaseError);


                        // remove from storage if DB insert failed
                        await supabaseClient.storage.from(STORAGE_BUCKET).remove([filePath]);


                        throw databaseError;
                    }


                    console.log("category_images kaydı başarılı:", imageRecord);


                    /* --------------------------------------
                       ÜRÜNÜN ANA RESMİ
                       -------------------------------------- */

                    try {

                        const { data: existingProduct } = await supabaseClient.from("products").select("image_url").eq("id", productId).single();


                        if (existingProduct && !existingProduct.image_url) {

                            await supabaseClient.from("products").update({ image_url: imageUrl }).eq("id", productId);
                        }

                    } catch (imageUrlError) {

                        console.warn("Ürün ana resmi güncellenemedi:", imageUrlError);
                    }


                    mesajGoster(imageUploadMessage, product.name + " ürününe ait resim başarıyla yüklendi.", true);
                }


                /* --------------------------------------
                   FORM TEMİZLE
                   -------------------------------------- */

                if (imageFile) {

                    imageFile.value = "";
                }


                if (imagePreview) {

                    imagePreview.src = "";
                }


                if (imagePreviewBox) {

                    imagePreviewBox.style.display = "none";
                }


                if (imageProduct) {

                    imageProduct.value = "";
                }


                await resimleriYukle();

                await dashboardYukle();


            } catch (error) {

                console.error("Resim yükleme hatası:", error);


                mesajGoster(imageUploadMessage, error.message || "Resim yüklenemedi.");

            } finally {

                uploadImageButton.disabled = false;


                uploadImageButton.textContent = "Resmi Yükle";
            }
        });
    }


    /* ======================================================
       RESİMLERİ YÜKLE
       ====================================================== */

    async function resimleriYukle() {

        const imageList = document.getElementById("imageList");


        const imageCount = document.getElementById("imageCount");


        if (!imageList) {

            return;
        }


        imageList.innerHTML = "<p>Resimler yükleniyor...</p>";


        try {

            const { data, error } = await supabaseClient.from("category_images").select(`
                        id,
                        category,
                        image_path,
                        image_url,
                        created_at,
                        product_id,
                        products (
                            name,
                            size
                        )
                        `).order("created_at", { ascending: false });


            if (error) {

                throw error;
            }


            const images = data || [];


            if (imageCount) {

                imageCount.textContent = images.length + " resim";
            }


            if (images.length === 0) {

                imageList.innerHTML = `

                    <div class="empty-state">

                        <div class="empty-icon">
                            ▧
                        </div>

                        <h2>
                            Henüz resim yok
                        </h2>

                        <p>
                            Yukarıdaki formu kullanarak ürün resmi yükleyebilirsiniz.
                        </p>

                    </div>
                `;

                return;
            }


            imageList.innerHTML = images.map(function (image) {

                const product = image.products;


                const productName = product && product.name ? product.name : "Ürün bilgisi yok";


                const productSize = product && product.size ? " — " + product.size : "";


                return `

                                <div
                                    class="image-card"
                                    style="
                                        border:1px solid #e0e0e0;
                                        border-radius:10px;
                                        overflow:hidden;
                                        background:#fff;
                                    "
                                >

                                    <div
                                        style="
                                            width:100%;
                                            height:220px;
                                            background:#f5f5f5;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                        "
                                    >

                                        <img
                                            src="${escapeHTML(image.image_url || "")}"
                                            alt="${escapeHTML(productName)}"
                                            style="
                                                width:100%;
                                                height:220px;
                                                object-fit:cover;
                                            "
                                        >

                                    </div>


                                    <div
                                        style="
                                            padding:15px;
                                        "
                                    >

                                        <strong>
                                            ${escapeHTML(productName)}
                                            ${escapeHTML(productSize)}
                                        </strong>


                                        <p
                                            style="
                                                margin:8px 0;
                                            "
                                        >
                                            Kategori:
                                            ${escapeHTML(image.category)}
                                        </p>


                                        <button
                                            type="button"
                                            class="delete-image-button"
                                            data-id="${escapeHTML(image.id)}"
                                            data-path="${escapeHTML(image.image_path || "")}"
                                            style="
                                                width:100%;
                                                padding:9px;
                                                cursor:pointer;
                                                background:#b52b2b;
                                                color:#fff;
                                                border:0;
                                                border-radius:6px;
                                            "
                                        >
                                            Resmi Sil
                                        </button>

                                    </div>

                                </div>
                            `;
            }).join("");


            /* ==================================================
               RESİM SİL
               ================================================== */

            imageList.querySelectorAll(".delete-image-button").forEach(function (button) {
                button.addEventListener("click", async function () {

                    const imageId = button.getAttribute("data-id");


                    const imagePath = button.getAttribute("data-path");


                    if (!confirm("Bu resmi silmek istediğinize emin misiniz?")) {

                        return;
                    }


                    try {

                        /*
                         * Önce Storage.
                         */

                        if (imagePath) {

                            const { error: storageError } = await supabaseClient.storage.from(STORAGE_BUCKET).remove([imagePath]);


                            if (storageError) {

                                console.warn("Storage resmi silinemedi:", storageError);
                            }
                        }


                        /*
                         * Sonra DB.
                         */

                        const { error } = await supabaseClient.from("category_images").delete().eq("id", imageId);


                        if (error) {

                            throw error;
                        }


                        await resimleriYukle();

                        await dashboardYukle();

                    } catch (error) {

                        console.error("Resim silme hatası:", error);


                        alert(error.message || "Resim silinemedi.");
                    }
                });
            });

        } catch (error) {

            console.error("Resimler alınamadı:", error);


            imageList.innerHTML = `

                <div class="empty-state">

                    <h2>
                        Resimler yüklenemedi
                    </h2>

                    <p>
                        ${escapeHTML(error.message)}
                    </p>

                </div>
            `;


            if (imageCount) {

                imageCount.textContent = "0 resim";
            }
        }
    }


    /* ======================================================
       İLK VERİLER
       ====================================================== */

    await dashboardYukle();

    await urunleriYukle();

    await resimleriYukle();

    await resimUrunleriniHazirla();


    /* ======================================================
       İLK SAYFA
       ====================================================== */

    sayfaAc("dashboardPage");


    console.log(
        "Admin paneli başarıyla başlatıldı."
    );
}
