/* ==========================================================
   SUR HALI ADMIN PANEL
   TAM ÇALIŞAN SÜRÜM
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

let supabaseClient = null;
let duzenlenenUrunId = null;

/* ==========================================================
   SUPABASE BAŞLAT
   ========================================================== */

function supabaseBaslat() {

    if (!window.supabase) {
        console.error("Supabase JS yüklenemedi.");
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

        console.log("Supabase bağlantısı hazır.");

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

    const number = Number(value);

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
        ) + " TL"
    );
}


function mesajGoster(
    element,
    text,
    success = false
) {

    if (!element) return;

    element.textContent = text;

    element.style.display = "block";

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


function mesajTemizle(element) {

    if (!element) return;

    element.textContent = "";

    element.style.display = "none";
}


function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (element) {
        element.value =
            value !== null &&
            value !== undefined
                ? value
                : "";
    }
}


function dosyaUzantisi(
    fileName
) {

    if (!fileName) {
        return "";
    }

    const dotIndex =
        fileName.lastIndexOf(".");

    if (dotIndex === -1) {
        return "";
    }

    return fileName
        .substring(dotIndex)
        .toLowerCase();
}


function guvenliDosyaAdi(
    fileName
) {

    return String(fileName || "resim")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");
}


/* ==========================================================
   LOGIN
   ========================================================== */

function loginSayfasiniBaslat() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );

    const loginMessage =
        document.getElementById(
            "loginMessage"
        );

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const emailElement =
                document.getElementById(
                    "email"
                );

            const passwordElement =
                document.getElementById(
                    "password"
                );

            const email =
                emailElement
                    ? emailElement.value.trim()
                    : "";

            const password =
                passwordElement
                    ? passwordElement.value
                    : "";

            if (!email || !password) {

                if (loginMessage) {
                    loginMessage.textContent =
                        "E-posta ve şifre giriniz.";
                }

                return;
            }

            try {

                const {
                    error
                } =
                    await supabaseClient.auth
                        .signInWithPassword({
                            email,
                            password
                        });

                if (error) {
                    throw error;
                }

                window.location.href =
                    "admin.html";

            } catch (error) {

                console.error(
                    "Giriş hatası:",
                    error
                );

                if (loginMessage) {
                    loginMessage.textContent =
                        error.message;
                }
            }
        }
    );


    const forgotPasswordButton =
        document.getElementById(
            "forgotPasswordButton"
        );

    const resetModal =
        document.getElementById(
            "reset-password-modal"
        );

    const closeResetButton =
        document.getElementById(
            "closePasswordResetButton"
        );

    if (
        forgotPasswordButton &&
        resetModal
    ) {

        forgotPasswordButton.addEventListener(
            "click",
            function () {

                resetModal.style.display =
                    "block";

                resetModal.hidden = false;
            }
        );
    }


    if (
        closeResetButton &&
        resetModal
    ) {

        closeResetButton.addEventListener(
            "click",
            function () {

                resetModal.style.display =
                    "none";

                resetModal.hidden = true;
            }
        );
    }
}


/* ==========================================================
   DASHBOARD
   ========================================================== */

async function dashboardYukle() {

    if (!supabaseClient) {
        return;
    }

    await toplamUrunSayisiniGetir();

    await aktifUrunSayisiniGetir();

    await toplamResimSayisiniGetir();

    await storageKullaniminiGetir();
}


async function toplamUrunSayisiniGetir() {

    const element =
        document.getElementById(
            "totalProducts"
        );

    if (!element) {
        return;
    }

    try {

        const {
            count,
            error
        } =
            await supabaseClient
                .from("products")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (error) {
            throw error;
        }

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "Toplam ürün sayısı alınamadı:",
            error
        );

        element.textContent = "0";
    }
}


async function aktifUrunSayisiniGetir() {

    const element =
        document.getElementById(
            "activeProducts"
        );

    if (!element) {
        return;
    }

    try {

        let result =
            await supabaseClient
                .from("products")
                .select("*", {
                    count: "exact",
                    head: true
                })
                .eq("is_active", true);

        /*
         * Bazı eski veritabanlarında
         * is_active alanı olmayabilir.
         */
        if (result.error) {

            result =
                await supabaseClient
                    .from("products")
                    .select("*", {
                        count: "exact",
                        head: true
                    });
        }

        if (result.error) {
            throw result.error;
        }

        element.textContent =
            result.count ?? 0;

    } catch (error) {

        console.error(
            "Aktif ürün sayısı alınamadı:",
            error
        );

        element.textContent = "0";
    }
}


async function toplamResimSayisiniGetir() {

    const element =
        document.getElementById(
            "totalImages"
        );

    if (!element) {
        return;
    }

    try {

        const {
            count,
            error
        } =
            await supabaseClient
                .from("category_images")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (error) {
            throw error;
        }

        element.textContent =
            count ?? 0;

    } catch (error) {

        console.error(
            "Toplam resim sayısı alınamadı:",
            error
        );

        element.textContent = "0";
    }
}


async function storageKullaniminiGetir() {

    const element =
        document.getElementById(
            "storageUsage"
        );

    if (!element) {
        return;
    }

    /*
     * Storage API toplam byte bilgisini
     * doğrudan vermediği için burada
     * güvenli şekilde yaklaşık dosya sayısını
     * gösteriyoruz.
     */

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("category_images")
                .select("id");

        if (error) {
            throw error;
        }

        element.textContent =
            (data?.length || 0) + " dosya";

    } catch (error) {

        console.error(
            "Storage bilgisi alınamadı:",
            error
        );

        element.textContent = "—";
    }
}


/* ==========================================================
   EBAT EDITÖRÜ
   ========================================================== */

function ebatSatiriEkle(
    size = "",
    price = ""
) {

    const container =
        document.getElementById(
            "productSizes"
        );

    if (!container) {
        return;
    }

    const row =
        document.createElement("div");

    row.className =
        "product-size-row";

    row.style.display =
        "grid";

    row.style.gridTemplateColumns =
        "1fr 1fr auto";

    row.style.gap =
        "10px";

    row.style.marginBottom =
        "10px";


    row.innerHTML = `

        <input
            type="text"
            class="size-option"
            placeholder="Örn. 160x230"
            value="${escapeHTML(size)}"
        >

        <input
            type="number"
            class="size-price"
            min="0"
            step="0.01"
            placeholder="Fiyat"
            value="${escapeHTML(price)}"
        >

        <button
            type="button"
            class="outline-button remove-size-button"
        >
            Sil
        </button>

    `;


    const removeButton =
        row.querySelector(
            ".remove-size-button"
        );

    if (removeButton) {

        removeButton.addEventListener(
            "click",
            function () {
                row.remove();
            }
        );
    }


    container.appendChild(row);
}


function ebatlariTemizle() {

    const container =
        document.getElementById(
            "productSizes"
        );

    if (container) {
        container.innerHTML = "";
    }
}


function ebatlariTopla() {

    const container =
        document.getElementById(
            "productSizes"
        );

    if (!container) {
        return [];
    }

    const rows =
        container.querySelectorAll(
            ".product-size-row"
        );

    return Array.from(rows)
        .map(function (row) {

            const size =
                row.querySelector(
                    ".size-option"
                )?.value.trim();

            const priceText =
                row.querySelector(
                    ".size-price"
                )?.value.trim();

            if (!size) {
                return null;
            }

            return {
                size: size,
                price:
                    priceText
                        ? Number(
                            priceText.replace(
                                ",",
                                "."
                            )
                        )
                        : null
            };

        })
        .filter(Boolean);
}


/* ==========================================================
   ÜRÜN YÖNETİMİ
   ========================================================== */

function urunYonetiminiBaslat() {

    const productForm =
        document.getElementById(
            "productForm"
        );

    const productList =
        document.getElementById(
            "productList"
        );

    const newProductButton =
        document.getElementById(
            "newProductButton"
        );

    const productFormBox =
        document.getElementById(
            "productFormBox"
        );

    const saveButton =
        document.getElementById(
            "saveProductButton"
        );

    const cancelButton =
        document.getElementById(
            "cancelProductButton"
        );

    const addSizeButton =
        document.getElementById(
            "addProductSizeButton"
        );


    if (!productForm && !productList) {
        return;
    }


    /* ======================================================
       EBAT EKLE
       ====================================================== */

    if (addSizeButton) {

        addSizeButton.addEventListener(
            "click",
            function () {
                ebatSatiriEkle();
            }
        );
    }


    /* ======================================================
       YENİ ÜRÜN
       ====================================================== */

    if (newProductButton) {

        newProductButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                duzenlenenUrunId = null;

                if (productForm) {
                    productForm.reset();
                }

                ebatlariTemizle();

                if (saveButton) {
                    saveButton.textContent =
                        "Ürünü Kaydet";
                }

                const title =
                    document.getElementById(
                        "productFormTitle"
                    );

                if (title) {
                    title.textContent =
                        "Yeni Ürün Ekle";
                }

                if (productFormBox) {

                    productFormBox.style.display =
                        "";

                    productFormBox.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }
        );
    }


    /* ======================================================
       ÜRÜN FORMU
       ====================================================== */

    if (productForm) {

        productForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const name =
                    document.getElementById(
                        "productName"
                    )?.value.trim() || "";

                const category =
                    document.getElementById(
                        "productCategory"
                    )?.value.trim() || "";

                const size =
                    document.getElementById(
                        "productSize"
                    )?.value.trim() || "";

                const priceText =
                    document.getElementById(
                        "productPrice"
                    )?.value.trim() || "";

                const description =
                    document.getElementById(
                        "productDescription"
                    )?.value.trim() || "";

                const activeValue =
                    document.getElementById(
                        "productActive"
                    )?.value;

                const featured =
                    document.getElementById(
                        "productFeatured"
                    )?.checked || false;

                const badgeText =
                    document.getElementById(
                        "productBadgeText"
                    )?.value.trim() || "";

                const featuredBadge =
                    document.getElementById(
                        "productFeaturedBadge"
                    )?.checked || false;


                if (!name) {

                    alert(
                        "Ürün adı giriniz."
                    );

                    return;
                }


                if (!category) {

                    alert(
                        "Kategori seçiniz."
                    );

                    return;
                }


                let price = null;

                if (priceText) {

                    price =
                        Number(
                            priceText.replace(
                                ",",
                                "."
                            )
                        );

                    if (
                        Number.isNaN(price)
                    ) {

                        alert(
                            "Fiyat bilgisi geçerli değil."
                        );

                        return;
                    }
                }


                const features = {

                    point:
                        document.getElementById(
                            "featurePoint"
                        )?.value.trim() || "",

                    thickness:
                        document.getElementById(
                            "featureThickness"
                        )?.value.trim() || "",

                    weight:
                        document.getElementById(
                            "featureWeight"
                        )?.value.trim() || "",

                    material:
                        document.getElementById(
                            "featureMaterial"
                        )?.value.trim() || "",

                    color:
                        document.getElementById(
                            "featureColor"
                        )?.value.trim() || "",

                    robot:
                        document.getElementById(
                            "featureRobot"
                        )?.value || ""
                };


                const sizes =
                    ebatlariTopla();


                /*
                 * ÖNEMLİ:
                 *
                 * Temel alanlar mevcut eski
                 * products yapısıyla uyumludur.
                 *
                 * Yeni alanlar daha sonra
                 * ayrı ayrı denenir.
                 */

                const basicData = {

                    name: name,

                    category: category,

                    size:
                        size || null,

                    price: price,

                    description:
                        description || null,

                    is_active:
                        activeValue !== "false"
                };


                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent =
                        duzenlenenUrunId
                            ? "Güncelleniyor..."
                            : "Kaydediliyor...";
                }


                try {

                    let savedId =
                        duzenlenenUrunId;


                    /* ==================================================
                       GÜNCELLE
                       ================================================== */

                    if (duzenlenenUrunId) {

                        const {
                            error
                        } =
                            await supabaseClient
                                .from("products")
                                .update(basicData)
                                .eq(
                                    "id",
                                    duzenlenenUrunId
                                );

                        if (error) {
                            throw error;
                        }

                    }

                    /* ==================================================
                       YENİ ÜRÜN
                       ================================================== */

                    else {

                        const {
                            data,
                            error
                        } =
                            await supabaseClient
                                .from("products")
                                .insert([
                                    basicData
                                ])
                                .select("id")
                                .single();

                        if (error) {
                            throw error;
                        }

                        savedId =
                            data?.id || null;
                    }


                    /*
                     * Yeni alanları tek tek deniyoruz.
                     * Veritabanında yoksa temel ürün
                     * kaydını bozmaz.
                     */

                    if (savedId) {

                        const optionalFields = {

                            featured:
                                featured,

                            badge_text:
                                badgeText || null,

                            featured_badge:
                                featuredBadge,

                            features:
                                features,

                            sizes:
                                sizes
                        };


                        for (
                            const [
                                field,
                                value
                            ]
                            of Object.entries(
                                optionalFields
                            )
                        ) {

                            try {

                                const {
                                    error
                                } =
                                    await supabaseClient
                                        .from("products")
                                        .update({
                                            [field]:
                                                value
                                        })
                                        .eq(
                                            "id",
                                            savedId
                                        );

                                if (error) {

                                    console.warn(
                                        "Opsiyonel alan kaydedilemedi:",
                                        field,
                                        error.message
                                    );
                                }

                            } catch (optionalError) {

                                console.warn(
                                    "Opsiyonel alan hatası:",
                                    field,
                                    optionalError
                                );
                            }
                        }
                    }


                    alert(
                        duzenlenenUrunId
                            ? "Ürün başarıyla güncellendi."
                            : "Ürün başarıyla eklendi."
                    );


                    duzenlenenUrunId =
                        null;


                    productForm.reset();

                    ebatlariTemizle();


                    if (saveButton) {
                        saveButton.textContent =
                            "Ürünü Kaydet";
                    }


                    const title =
                        document.getElementById(
                            "productFormTitle"
                        );

                    if (title) {
                        title.textContent =
                            "Yeni Ürün Ekle";
                    }


                    await urunleriYukle();

                    await dashboardYukle();


                } catch (error) {

                    console.error(
                        "Ürün kaydetme hatası:",
                        error
                    );

                    alert(
                        "Ürün kaydedilemedi:\n\n" +
                        error.message
                    );

                } finally {

                    if (saveButton) {
                        saveButton.disabled =
                            false;

                        saveButton.textContent =
                            duzenlenenUrunId
                                ? "Güncelle"
                                : "Ürünü Kaydet";
                    }
                }
            }
        );
    }


    /* ======================================================
       İPTAL
       ====================================================== */

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                duzenlenenUrunId = null;

                if (productForm) {
                    productForm.reset();
                }

                ebatlariTemizle();

                if (productFormBox) {
                    productFormBox.style.display =
                        "none";
                }

                if (saveButton) {
                    saveButton.textContent =
                        "Ürünü Kaydet";
                }
            }
        );
    }


    urunleriYukle();
}


/* ==========================================================
   ÜRÜN LİSTESİ
   ========================================================== */

async function urunleriYukle() {

    const productList =
        document.getElementById(
            "productList"
        );

    if (!productList ||
        !supabaseClient) {
        return;
    }


    productList.innerHTML =
        "<p>Ürünler yükleniyor...</p>";


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("products")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        const productCount =
            document.getElementById(
                "productCount"
            );


        if (productCount) {

            productCount.textContent =
                `${data?.length || 0} ürün`;
        }


        if (
            !data ||
            data.length === 0
        ) {

            productList.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ▤
                    </div>

                    <h2>
                        Henüz ürün yok
                    </h2>

                    <p>
                        Yeni ürün ekleyebilirsiniz.
                    </p>

                </div>

            `;

            return;
        }


        productList.innerHTML =
            data.map(
                function (product) {

                    const image =
                        product.image_url ||
                        "";


                    const active =
                        product.is_active !== false;


                    return `

                        <div
                            class="product-item"
                            data-product-id="${escapeHTML(product.id)}"
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                gap:15px;
                                padding:15px;
                                margin-bottom:10px;
                                border:1px solid #ddd;
                                border-radius:8px;
                                background:#fff;
                            "
                        >

                            <div
                                style="
                                    display:flex;
                                    align-items:center;
                                    gap:15px;
                                    min-width:0;
                                "
                            >

                                ${
                                    image
                                        ? `
                                            <img
                                                src="${escapeHTML(image)}"
                                                alt="${escapeHTML(product.name || "")}"
                                                style="
                                                    width:70px;
                                                    height:70px;
                                                    object-fit:cover;
                                                    border-radius:8px;
                                                    border:1px solid #ddd;
                                                "
                                            >
                                        `
                                        : `
                                            <div
                                                style="
                                                    width:70px;
                                                    height:70px;
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:center;
                                                    background:#eee;
                                                    border-radius:8px;
                                                "
                                            >
                                                🖼
                                            </div>
                                        `
                                }

                                <div>

                                    <h3>
                                        ${escapeHTML(
                                            product.name || "-"
                                        )}
                                    </h3>

                                    <p>
                                        <strong>Kategori:</strong>
                                        ${escapeHTML(
                                            product.category || "-"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Ölçü:</strong>
                                        ${escapeHTML(
                                            product.size || "-"
                                        )}
                                    </p>

                                    <p>
                                        <strong>Fiyat:</strong>
                                        ${formatPrice(
                                            product.price
                                        )}
                                    </p>

                                    <p>
                                        <strong>Durum:</strong>
                                        ${
                                            active
                                                ? "Aktif"
                                                : "Pasif"
                                        }
                                    </p>

                                </div>

                            </div>


                            <div
                                style="
                                    display:flex;
                                    gap:8px;
                                    flex-wrap:wrap;
                                "
                            >

                                <button
                                    type="button"
                                    class="edit-product-button gold-button"
                                    data-id="${escapeHTML(product.id)}"
                                >
                                    Düzenle
                                </button>

                                <button
                                    type="button"
                                    class="delete-product-button"
                                    data-id="${escapeHTML(product.id)}"
                                    style="
                                        padding:8px 12px;
                                        background:#dc2626;
                                        color:white;
                                        border:none;
                                        border-radius:6px;
                                        cursor:pointer;
                                    "
                                >
                                    Sil
                                </button>

                            </div>

                        </div>

                    `;
                }
            ).join("");


        productList
            .querySelectorAll(
                ".edit-product-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            urunDuzenle(
                                button.dataset.id
                            );
                        }
                    );
                }
            );


        productList
            .querySelectorAll(
                ".delete-product-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            urunSil(
                                button.dataset.id
                            );
                        }
                    );
                }
            );


    } catch (error) {

        console.error(
            "Ürün listesi hatası:",
            error
        );


        productList.innerHTML = `

            <div class="empty-state">

                <h2>
                    Ürünler yüklenemedi
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* ==========================================================
   ÜRÜN DÜZENLE
   ========================================================== */

async function urunDuzenle(id) {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("products")
                .select("*")
                .eq("id", id)
                .single();


        if (error) {
            throw error;
        }


        if (!data) {

            alert(
                "Ürün bulunamadı."
            );

            return;
        }


        duzenlenenUrunId =
            data.id;


        setInputValue(
            "productName",
            data.name
        );

        setInputValue(
            "productCategory",
            data.category
        );

        setInputValue(
            "productSize",
            data.size
        );

        setInputValue(
            "productPrice",
            data.price
        );

        setInputValue(
            "productDescription",
            data.description
        );


        const active =
            document.getElementById(
                "productActive"
            );

        if (active) {

            active.value =
                data.is_active === false
                    ? "false"
                    : "true";
        }


        const featured =
            document.getElementById(
                "productFeatured"
            );

        if (featured) {
            featured.checked =
                Boolean(
                    data.featured
                );
        }


        const badgeText =
            document.getElementById(
                "productBadgeText"
            );

        if (badgeText) {

            badgeText.value =
                data.badge_text || "";
        }


        const featuredBadge =
            document.getElementById(
                "productFeaturedBadge"
            );

        if (featuredBadge) {

            featuredBadge.checked =
                Boolean(
                    data.featured_badge
                );
        }


        const features =
            data.features || {};


        setInputValue(
            "featurePoint",
            features.point
        );

        setInputValue(
            "featureThickness",
            features.thickness
        );

        setInputValue(
            "featureWeight",
            features.weight
        );

        setInputValue(
            "featureMaterial",
            features.material
        );

        setInputValue(
            "featureColor",
            features.color
        );


        const robot =
            document.getElementById(
                "featureRobot"
            );

        if (robot) {

            robot.value =
                features.robot || "";
        }


        ebatlariTemizle();


        if (
            Array.isArray(data.sizes)
        ) {

            data.sizes.forEach(
                function (item) {

                    ebatSatiriEkle(
                        item.size || "",
                        item.price ?? ""
                    );
                }
            );
        }


        const saveButton =
            document.getElementById(
                "saveProductButton"
            );

        if (saveButton) {
            saveButton.textContent =
                "Güncelle";
        }


        const title =
            document.getElementById(
                "productFormTitle"
            );

        if (title) {

            title.textContent =
                "Ürünü Düzenle";
        }


        const formBox =
            document.getElementById(
                "productFormBox"
            );

        if (formBox) {

            formBox.style.display =
                "";

            formBox.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


    } catch (error) {

        console.error(
            "Ürün düzenleme hatası:",
            error
        );

        alert(
            "Ürün bilgileri alınamadı:\n\n" +
            error.message
        );
    }
}


/* ==========================================================
   ÜRÜN SİL
   ========================================================== */

async function urunSil(id) {

    if (
        !confirm(
            "Bu ürünü silmek istediğinize emin misiniz?"
        )
    ) {
        return;
    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("products")
                .delete()
                .eq("id", id);


        if (error) {
            throw error;
        }


        alert(
            "Ürün silindi."
        );


        await urunleriYukle();

        await dashboardYukle();


    } catch (error) {

        console.error(
            "Ürün silme hatası:",
            error
        );

        alert(
            "Ürün silinemedi:\n\n" +
            error.message
        );
    }
}


/* ==========================================================
   GLOBAL ÜRÜN FONKSİYONLARI
   ========================================================== */

window.urunDuzenle =
    urunDuzenle;

window.urunSil =
    urunSil;


/* ==========================================================
   RESİM YÖNETİMİ
   ========================================================== */

function resimYonetiminiBaslat() {

    const imageFile =
        document.getElementById(
            "imageFile"
        );

    const imageCategory =
        document.getElementById(
            "imageCategory"
        );

    const imageProduct =
        document.getElementById(
            "imageProduct"
        );

    const categoryCover =
        document.getElementById(
            "asCategoryCover"
        );

    const uploadButton =
        document.getElementById(
            "uploadImageButton"
        );


    /* ======================================================
       ÖNİZLEME
       ====================================================== */

    if (imageFile) {

        imageFile.addEventListener(
            "change",
            function () {

                const file =
                    imageFile.files?.[0];

                if (!file) {
                    return;
                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    alert(
                        "Lütfen geçerli bir resim dosyası seçin."
                    );

                    imageFile.value = "";

                    return;
                }


                const preview =
                    document.getElementById(
                        "imagePreview"
                    );

                const previewBox =
                    document.getElementById(
                        "imagePreviewBox"
                    );


                if (preview) {

                    preview.src =
                        URL.createObjectURL(
                            file
                        );

                    preview.style.display =
                        "";
                }


                if (previewBox) {

                    previewBox.style.display =
                        "";
                }
            }
        );
    }


    /* ======================================================
       KATEGORİ DEĞİŞİNCE ÜRÜNLERİ GETİR
       ====================================================== */

    if (imageCategory) {

        imageCategory.addEventListener(
            "change",
            function () {

                resimUrunleriniHazirla();
            }
        );
    }


    if (categoryCover) {

        categoryCover.addEventListener(
            "change",
            function () {

                if (
                    categoryCover.checked &&
                    imageProduct
                ) {

                    imageProduct.value =
                        "";

                    imageProduct.disabled =
                        true;
                } else {

                    if (imageProduct) {
                        imageProduct.disabled =
                            !imageCategory?.value;
                    }
                }
            }
        );
    }


    /* ======================================================
       RESİM YÜKLE
       ====================================================== */

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            async function (event) {

                event.preventDefault();


                const file =
                    imageFile?.files?.[0];


                const category =
                    imageCategory?.value.trim()
                    || "";


                const productId =
                    imageProduct?.value
                    || "";


                const isCategoryCover =
                    categoryCover?.checked
                    || false;


                if (!file) {

                    alert(
                        "Lütfen bir resim seçin."
                    );

                    return;
                }


                if (!category) {

                    alert(
                        "Lütfen kategori seçin."
                    );

                    return;
                }


                if (
                    !isCategoryCover &&
                    !productId
                ) {

                    /*
                     * Ürün seçimi yapılmadıysa
                     * yine de kategori resmi olarak
                     * yüklenmesine izin veriyoruz.
                     */
                }


                try {

                    uploadButton.disabled =
                        true;

                    uploadButton.textContent =
                        "Yükleniyor...";


                    const extension =
                        dosyaUzantisi(
                            file.name
                        );


                    const safeCategory =
                        category
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(
                                /[\u0300-\u036f]/g,
                                ""
                            )
                            .replace(
                                /[^a-z0-9_-]/g,
                                "-"
                            );


                    const fileName =
                        Date.now() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .substring(2) +
                        extension;


                    const filePath =
                        safeCategory +
                        "/" +
                        fileName;


                    /* STORAGE */

                    const {
                        error:
                            uploadError
                    } =
                        await supabaseClient
                            .storage
                            .from(
                                STORAGE_BUCKET
                            )
                            .upload(
                                filePath,
                                file,
                                {
                                    cacheControl:
                                        "3600",
                                    upsert:
                                        false,
                                    contentType:
                                        file.type
                                }
                            );


                    if (uploadError) {
                        throw uploadError;
                    }


                    /* PUBLIC URL */

                    const {
                        data:
                            publicUrlData
                    } =
                        supabaseClient
                            .storage
                            .from(
                                STORAGE_BUCKET
                            )
                            .getPublicUrl(
                                filePath
                            );


                    const imageUrl =
                        publicUrlData?.publicUrl
                        || "";


                    if (!imageUrl) {

                        await supabaseClient
                            .storage
                            .from(
                                STORAGE_BUCKET
                            )
                            .remove([
                                filePath
                            ]);

                        throw new Error(
                            "Resim URL'si oluşturulamadı."
                        );
                    }


                    /* DATABASE */

                    const {
                        data:
                            imageRecord,
                        error:
                            databaseError
                    } =
                        await supabaseClient
                            .from(
                                "category_images"
                            )
                            .insert([
                                {
                                    category:
                                        category,

                                    image_path:
                                        filePath,

                                    image_url:
                                        imageUrl
                                }
                            ])
                            .select()
                            .single();


                    if (databaseError) {

                        await supabaseClient
                            .storage
                            .from(
                                STORAGE_BUCKET
                            )
                            .remove([
                                filePath
                            ]);

                        throw databaseError;
                    }


                    /*
                     * Eğer product_id kolonu varsa
                     * ürüne bağlamayı deniyoruz.
                     */

                    if (
                        imageRecord?.id &&
                        productId
                    ) {

                        try {

                            const {
                                error
                            } =
                                await supabaseClient
                                    .from(
                                        "category_images"
                                    )
                                    .update({
                                        product_id:
                                            productId
                                    })
                                    .eq(
                                        "id",
                                        imageRecord.id
                                    );

                            if (error) {

                                console.warn(
                                    "product_id bağlanamadı:",
                                    error.message
                                );
                            }

                        } catch (error) {

                            console.warn(
                                "Ürün bağlantısı oluşturulamadı:",
                                error
                            );
                        }
                    }


                    /*
                     * Kategori kapağı alanı varsa
                     * işaretlemeyi deniyoruz.
                     */

                    if (
                        imageRecord?.id &&
                        isCategoryCover
                    ) {

                        const possibleFields = [
                            "is_category_cover",
                            "category_cover"
                        ];


                        for (
                            const field
                            of possibleFields
                        ) {

                            try {

                                const {
                                    error
                                } =
                                    await supabaseClient
                                        .from(
                                            "category_images"
                                        )
                                        .update({
                                            [field]:
                                                true
                                        })
                                        .eq(
                                            "id",
                                            imageRecord.id
                                        );

                                if (!error) {
                                    break;
                                }

                            } catch (error) {
                                console.warn(
                                    "Kategori kapak alanı bulunamadı:",
                                    field
                                );
                            }
                        }
                    }


                    alert(
                        "Resim başarıyla yüklendi."
                    );


                    imageFile.value = "";


                    if (imageCategory) {
                        imageCategory.value =
                            "";
                    }


                    if (imageProduct) {

                        imageProduct.innerHTML =
                            `<option value="">
                                Önce kategori seçiniz
                             </option>`;

                        imageProduct.disabled =
                            true;
                    }


                    if (categoryCover) {
                        categoryCover.checked =
                            false;
                    }


                    const preview =
                        document.getElementById(
                            "imagePreview"
                        );

                    const previewBox =
                        document.getElementById(
                            "imagePreviewBox"
                        );


                    if (preview) {
                        preview.src = "";
                    }

                    if (previewBox) {
                        previewBox.style.display =
                            "none";
                    }


                    await resimleriYukle();

                    await dashboardYukle();


                } catch (error) {

                    console.error(
                        "Resim yükleme hatası:",
                        error
                    );

                    alert(
                        "Resim yüklenemedi:\n\n" +
                        error.message
                    );

                } finally {

                    uploadButton.disabled =
                        false;

                    uploadButton.textContent =
                        "Resmi Yükle";
                }
            }
        );
    }


    resimleriYukle();
}


/* ==========================================================
   RESİM ÜRÜNLERİNİ HAZIRLA
   ========================================================== */

async function resimUrunleriniHazirla() {

    const category =
        document.getElementById(
            "imageCategory"
        )?.value.trim();


    const productSelect =
        document.getElementById(
            "imageProduct"
        );


    if (!productSelect) {
        return;
    }


    if (!category) {

        productSelect.innerHTML =
            `<option value="">
                Önce kategori seçiniz
             </option>`;

        productSelect.disabled =
            true;

        return;
    }


    productSelect.disabled =
        true;


    productSelect.innerHTML =
        `<option value="">
            Ürünler yükleniyor...
         </option>`;


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("products")
                .select(
                    "id,name,category"
                )
                .eq(
                    "category",
                    category
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        productSelect.innerHTML =
            `<option value="">
                Ürün seçiniz
             </option>`;


        if (
            !data ||
            data.length === 0
        ) {

            productSelect.innerHTML +=
                `<option value="">
                    Bu kategoride ürün bulunamadı
                 </option>`;

            return;
        }


        data.forEach(
            function (product) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    product.id;

                option.textContent =
                    product.name;

                productSelect.appendChild(
                    option
                );
            }
        );


        productSelect.disabled =
            false;


    } catch (error) {

        console.error(
            "Resim ürünleri alınamadı:",
            error
        );


        productSelect.innerHTML =
            `<option value="">
                Ürünler alınamadı
             </option>`;
    }
}


/* ==========================================================
   RESİMLERİ YÜKLE
   ========================================================== */

async function resimleriYukle() {

    const imageList =
        document.getElementById(
            "imageList"
        );

    if (!imageList ||
        !supabaseClient) {
        return;
    }


    imageList.innerHTML =
        "<p>Resimler yükleniyor...</p>";


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("category_images")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            throw error;
        }


        const imageCount =
            document.getElementById(
                "imageCount"
            );


        if (imageCount) {

            imageCount.textContent =
                `${data?.length || 0} resim`;
        }


        if (
            !data ||
            data.length === 0
        ) {

            imageList.innerHTML = `

                <div class="empty-state">

                    <h2>
                        Henüz resim yok
                    </h2>

                    <p>
                        Yeni resim yükleyebilirsiniz.
                    </p>

                </div>

            `;

            return;
        }


        imageList.innerHTML =
            data.map(
                function (image) {

                    const url =
                        image.image_url ||
                        "";


                    return `

                        <div
                            class="image-card"
                            data-image-id="${escapeHTML(image.id)}"
                            style="
                                border:1px solid #ddd;
                                border-radius:10px;
                                padding:10px;
                                background:#fff;
                            "
                        >

                            ${
                                url
                                    ? `
                                        <img
                                            src="${escapeHTML(url)}"
                                            alt="${escapeHTML(image.category || "Sur Halı")}"
                                            style="
                                                width:100%;
                                                height:180px;
                                                object-fit:cover;
                                                border-radius:8px;
                                                display:block;
                                            "
                                        >
                                    `
                                    : ""
                            }


                            <p>
                                <strong>
                                    Kategori:
                                </strong>

                                ${escapeHTML(
                                    image.category || "-"
                                )}
                            </p>


                            ${
                                image.product_id
                                    ? `
                                        <p>
                                            <strong>
                                                Ürün:
                                            </strong>
                                            ${escapeHTML(
                                                image.product_id
                                            )}
                                        </p>
                                    `
                                    : ""
                            }


                            ${
                                image.is_category_cover ||
                                image.category_cover
                                    ? `
                                        <p
                                            style="
                                                color:#b8860b;
                                                font-weight:bold;
                                            "
                                        >
                                            ★ Kategori Kapağı
                                        </p>
                                    `
                                    : ""
                            }


                            <button
                                type="button"
                                class="delete-image-button"
                                data-id="${escapeHTML(image.id)}"
                                data-path="${escapeHTML(image.image_path || "")}"
                                style="
                                    width:100%;
                                    padding:9px;
                                    border:none;
                                    border-radius:6px;
                                    background:#dc2626;
                                    color:white;
                                    cursor:pointer;
                                "
                            >
                                Resmi Sil
                            </button>

                        </div>

                    `;
                }
            ).join("");


        imageList
            .querySelectorAll(
                ".delete-image-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            resimSil(
                                button.dataset.id,
                                button.dataset.path
                            );
                        }
                    );
                }
            );


    } catch (error) {

        console.error(
            "Resimler alınamadı:",
            error
        );


        imageList.innerHTML = `

            <div class="empty-state">

                <h2>
                    Resimler yüklenemedi
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;
    }
}


/* ==========================================================
   RESİM SİL
   ========================================================== */

async function resimSil(
    id,
    imagePath
) {

    if (
        !confirm(
            "Bu resmi silmek istediğinize emin misiniz?"
        )
    ) {
        return;
    }


    try {

        if (imagePath) {

            const {
                error:
                    storageError
            } =
                await supabaseClient
                    .storage
                    .from(
                        STORAGE_BUCKET
                    )
                    .remove([
                        imagePath
                    ]);


            if (storageError) {
                throw storageError;
            }
        }


        const {
            error:
                databaseError
        } =
            await supabaseClient
                .from(
                    "category_images"
                )
                .delete()
                .eq(
                    "id",
                    id
                );


        if (databaseError) {
            throw databaseError;
        }


        alert(
            "Resim silindi."
        );


        await resimleriYukle();

        await dashboardYukle();


    } catch (error) {

        console.error(
            "Resim silme hatası:",
            error
        );

        alert(
            "Resim silinemedi:\n\n" +
            error.message
        );
    }
}


/* ==========================================================
   HERO GÖRSELİ
   ========================================================== */

function heroYonetiminiBaslat() {

    const fileInput =
        document.getElementById(
            "heroImageFile"
        );

    const saveButton =
        document.getElementById(
            "saveHeroImageButton"
        );


    if (!fileInput ||
        !saveButton) {
        return;
    }


    saveButton.addEventListener(
        "click",
        async function () {

            const file =
                fileInput.files?.[0];


            if (!file) {

                alert(
                    "Lütfen bir hero görseli seçin."
                );

                return;
            }


            try {

                saveButton.disabled =
                    true;

                saveButton.textContent =
                    "Kaydediliyor...";


                const extension =
                    dosyaUzantisi(
                        file.name
                    );


                const fileName =
                    "hero-" +
                    Date.now() +
                    extension;


                const filePath =
                    HERO_STORAGE_PATH +
                    "/" +
                    fileName;


                const {
                    error:
                        uploadError
                } =
                    await supabaseClient
                        .storage
                        .from(
                            HERO_STORAGE_BUCKET
                        )
                        .upload(
                            filePath,
                            file,
                            {
                                cacheControl:
                                    "3600",
                                upsert:
                                    true,
                                contentType:
                                    file.type
                            }
                        );


                if (uploadError) {
                    throw uploadError;
                }


                const {
                    data:
                        publicUrlData
                } =
                    supabaseClient
                        .storage
                        .from(
                            HERO_STORAGE_BUCKET
                        )
                        .getPublicUrl(
                            filePath
                        );


                const publicUrl =
                    publicUrlData?.publicUrl;


                if (!publicUrl) {

                    throw new Error(
                        "Hero görsel URL'si oluşturulamadı."
                    );
                }


                /*
                 * site_settings tablosunun yapısı
                 * farklı olabilir. Önce yaygın
                 * key/value yapısını deniyoruz.
                 */

                let saved = false;


                try {

                    const {
                        error
                    } =
                        await supabaseClient
                            .from(
                                "site_settings"
                            )
                            .upsert(
                                {
                                    key:
                                        "hero_image",
                                    value:
                                        publicUrl
                                },
                                {
                                    onConflict:
                                        "key"
                                }
                            );

                    if (!error) {
                        saved = true;
                    }

                } catch (error) {

                    console.warn(
                        "Hero key/value kaydı başarısız:",
                        error
                    );
                }


                if (!saved) {

                    try {

                        const {
                            error
                        } =
                            await supabaseClient
                                .from(
                                    "site_settings"
                                )
                                .update({
                                    hero_image_url:
                                        publicUrl
                                })
                                .eq(
                                    "id",
                                    1
                                );

                        if (!error) {
                            saved = true;
                        }

                    } catch (error) {

                        console.warn(
                            "Hero URL kaydı başarısız:",
                            error
                        );
                    }
                }


                fileInput.value = "";


                alert(
                    "Hero görseli başarıyla kaydedildi."
                );


            } catch (error) {

                console.error(
                    "Hero görsel hatası:",
                    error
                );

                alert(
                    "Hero görseli kaydedilemedi:\n\n" +
                    error.message
                );

            } finally {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Kaydet";
            }
        }
    );
}


/* ==========================================================
   MÜŞTERİ HAK YÖNETİMİ
   ========================================================== */

function krediYonetiminiBaslat() {

    const identifierInput =
        document.getElementById(
            "creditIdentifier"
        );

    const unlimitedButton =
        document.getElementById(
            "grantUnlimitedCreditsButton"
        );

    const fiveButton =
        document.getElementById(
            "addFiveCreditsButton"
        );

    const message =
        document.getElementById(
            "creditMessage"
        );


    if (
        !identifierInput ||
        (!unlimitedButton &&
         !fiveButton)
    ) {
        return;
    }


    async function krediIslemi(
        unlimited
    ) {

        const identifier =
            identifierInput.value.trim();


        if (!identifier) {

            mesajGoster(
                message,
                "Telefon numarası veya cihaz ID giriniz.",
                false
            );

            return;
        }


        try {

            /*
             * Mevcut projedeki müşteri hak
             * tablosu farklı isimde olabilir.
             *
             * İlk olarak customer_credits
             * kullanılır.
             */

            const table =
                "customer_credits";


            const {
                data,
                error
            } =
                await supabaseClient
                    .from(table)
                    .select("*")
                    .eq(
                        "identifier",
                        identifier
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            if (data) {

                const updateData =
                    unlimited
                        ? {
                            unlimited:
                                true
                        }
                        : {
                            credits:
                                Number(
                                    data.credits || 0
                                ) + 5
                        };


                const {
                    error:
                        updateError
                } =
                    await supabaseClient
                        .from(table)
                        .update(
                            updateData
                        )
                        .eq(
                            "identifier",
                            identifier
                        );


                if (updateError) {
                    throw updateError;
                }

            } else {

                const insertData =
                    unlimited
                        ? {
                            identifier:
                                identifier,
                            unlimited:
                                true,
                            credits:
                                0
                        }
                        : {
                            identifier:
                                identifier,
                            unlimited:
                                false,
                            credits:
                                5
                        };


                const {
                    error:
                        insertError
                } =
                    await supabaseClient
                        .from(table)
                        .insert([
                            insertData
                        ]);


                if (insertError) {
                    throw insertError;
                }
            }


            mesajGoster(
                message,
                unlimited
                    ? "Sınırsız kullanım hakkı tanımlandı."
                    : "+5 kullanım hakkı eklendi.",
                true
            );


            identifierInput.value =
                "";


        } catch (error) {

            console.error(
                "Kredi işlemi hatası:",
                error
            );


            mesajGoster(
                message,
                "İşlem yapılamadı: " +
                error.message,
                false
            );
        }
    }


    if (unlimitedButton) {

        unlimitedButton.addEventListener(
            "click",
            function () {
                krediIslemi(true);
            }
        );
    }


    if (fiveButton) {

        fiveButton.addEventListener(
            "click",
            function () {
                krediIslemi(false);
            }
        );
    }
}


/* ==========================================================
   SAYFA YÖNETİMİ
   ========================================================== */

async function adminPanelBaslat() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    const mainContent =
        document.querySelector(
            ".main-content"
        );


    if (
        !sidebar ||
        !mainContent
    ) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .getSession();


        if (
            error ||
            !data?.session
        ) {

            console.warn(
                "Aktif admin oturumu yok."
            );

            window.location.href =
                "login.html";

            return;
        }


    } catch (error) {

        console.error(
            "Oturum kontrol hatası:",
            error
        );

        return;
    }


    const pages =
        document.querySelectorAll(
            ".page"
        );


    const menuItems =
        document.querySelectorAll(
            ".menu-item[data-page]"
        );


    const quickButtons =
        document.querySelectorAll(
            ".quick-actions [data-page]"
        );


    function sayfaAc(
        pageId
    ) {

        if (!pageId) {
            return;
        }


        pages.forEach(
            function (page) {

                page.classList.remove(
                    "active-page"
                );
            }
        );


        const targetPage =
            document.getElementById(
                pageId
            );


        if (!targetPage) {
            return;
        }


        targetPage.classList.add(
            "active-page"
        );


        menuItems.forEach(
            function (item) {

                item.classList.remove(
                    "active"
                );


                if (
                    item.getAttribute(
                        "data-page"
                    ) === pageId
                ) {

                    item.classList.add(
                        "active"
                    );
                }
            }
        );


        if (
            pageId ===
            "dashboardPage"
        ) {

            dashboardYukle();
        }


        if (
            pageId ===
            "productsPage"
        ) {

            urunleriYukle();
        }


        if (
            pageId ===
            "imagesPage"
        ) {

            resimleriYukle();

            resimUrunleriniHazirla();
        }
    }


    menuItems.forEach(
        function (menuItem) {

            menuItem.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    sayfaAc(
                        menuItem.getAttribute(
                            "data-page"
                        )
                    );
                }
            );
        }
    );


    quickButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    sayfaAc(
                        button.getAttribute(
                            "data-page"
                        )
                    );
                }
            );
        }
    );


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                try {

                    await supabaseClient
                        .auth
                        .signOut();

                    window.location.href =
                        "login.html";

                } catch (error) {

                    console.error(
                        "Çıkış hatası:",
                        error
                    );
                }
            }
        );
    }


    /*
     * Tüm yöneticileri başlat.
     */

    urunYonetiminiBaslat();

    resimYonetiminiBaslat();

    heroYonetiminiBaslat();

    krediYonetiminiBaslat();

    await dashboardYukle();
}


/* ==========================================================
   DOM READY
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "DOM hazır."
        );


        const supabaseHazir =
            supabaseBaslat();


        if (!supabaseHazir) {
            return;
        }


        loginSayfasiniBaslat();


        const adminDashboard =
            document.querySelector(
                ".sidebar"
            ) &&
            document.querySelector(
                ".main-content"
            );


        if (adminDashboard) {

            await adminPanelBaslat();
        }
    }
);


console.log(
    "admin.js yüklendi."
);
