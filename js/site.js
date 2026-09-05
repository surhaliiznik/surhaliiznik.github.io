```javascript
/* ==========================================================
   SUR HALI İZNİK
   ANA SITE JAVASCRIPT
   TAM VE TEMİZ SÜRÜM
   ========================================================== */

"use strict";

console.log("🚀 Sur Halı site.js başlatılıyor...");


/* ==========================================================
   1. SUPABASE
   ========================================================== */

const SUR_SUPABASE_URL =
    "https://lhltolrtgnfkbwfkpaex.supabase.co";

const SUR_SUPABASE_KEY =
    "sb_publishable_xdWMVRunpVSeiMw2vfGWyw_l6dTnBsn";

window.surClient = null;


function initializeSupabase() {

    try {

        if (!window.supabase) {

            console.error(
                "❌ Supabase CDN yüklenmemiş."
            );

            return false;
        }

        window.surClient =
            window.supabase.createClient(
                SUR_SUPABASE_URL,
                SUR_SUPABASE_KEY
            );

        console.log(
            "✅ Supabase bağlantısı hazır."
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Supabase oluşturulamadı:",
            error
        );

        window.surClient = null;

        return false;
    }
}


/* ==========================================================
   2. YARDIMCI FONKSİYONLAR
   ========================================================== */

function escapeHtml(value) {

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


function setImageSafely(
    img,
    url,
    fallback = "assets/images/logo.jpeg"
) {

    if (!img) {
        return;
    }

    if (!url) {

        img.src =
            fallback;

        return;
    }

    img.onerror = function () {

        if (
            this.dataset.fallbackApplied === "1"
        ) {
            return;
        }

        this.dataset.fallbackApplied =
            "1";

        this.src =
            fallback;
    };

    img.src =
        url;
}


/* ==========================================================
   3. SITE AYARLARI
   ========================================================== */

async function loadSiteSettings() {

    if (!window.surClient) {
        return;
    }

    try {

        const {
            data,
            error
        } = await window.surClient
            .from("site_settings")
            .select("*")
            .limit(1);


        if (error) {

            console.warn(
                "⚠️ site_settings okunamadı:",
                error
            );

            return;
        }


        const settings =
            data?.[0];


        if (!settings) {
            return;
        }


        /* LOGO */

        document
            .querySelectorAll("[data-site-logo]")
            .forEach(img => {

                if (settings.logo_url) {

                    setImageSafely(
                        img,
                        settings.logo_url
                    );
                }

            });


        /* SITE ADI */

        document
            .querySelectorAll("[data-site-name]")
            .forEach(element => {

                if (settings.site_name) {

                    element.textContent =
                        settings.site_name;
                }

            });


        /* HERO BAŞLIK */

        const heroTitle =
            document.querySelector(
                "[data-hero-title]"
            );


        if (
            heroTitle &&
            settings.hero_title
        ) {

            heroTitle.textContent =
                settings.hero_title;
        }


        /* HERO AÇIKLAMA */

        const heroDescription =
            document.querySelector(
                "[data-hero-description]"
            );


        if (
            heroDescription &&
            settings.hero_description
        ) {

            heroDescription.textContent =
                settings.hero_description;
        }


        console.log(
            "✅ Site ayarları yüklendi."
        );

    } catch (error) {

        console.error(
            "❌ loadSiteSettings:",
            error
        );
    }
}


/* ==========================================================
   4. HERO
   ========================================================== */

async function loadHeroBackground() {

    const heroSection =
        document.querySelector(
            ".hero-section"
        );

    const heroMedia =
        document.querySelector(
            "[data-hero-media]"
        );


    if (!heroSection) {
        return;
    }


    let heroUrl =
        "assets/images/hero-bg.jpg";


    if (window.surClient) {

        try {

            const {
                data,
                error
            } = await window.surClient
                .from("site_settings")
                .select("hero_bg_url")
                .limit(1);


            if (
                !error &&
                data?.[0]?.hero_bg_url
            ) {

                heroUrl =
                    data[0].hero_bg_url;
            }

        } catch (error) {

            console.warn(
                "⚠️ Hero resmi alınamadı:",
                error
            );
        }
    }


    if (!heroUrl) {
        return;
    }


    heroSection.style.backgroundImage =
        `url("${heroUrl}")`;

    heroSection.style.backgroundSize =
        "cover";

    heroSection.style.backgroundPosition =
        "center";

    heroSection.style.backgroundRepeat =
        "no-repeat";


    if (heroMedia) {

        heroMedia.style.backgroundImage =
            `url("${heroUrl}")`;

        heroMedia.style.backgroundSize =
            "cover";

        heroMedia.style.backgroundPosition =
            "center";

        heroMedia.style.backgroundRepeat =
            "no-repeat";
    }


    console.log(
        "✅ Hero yüklendi."
    );
}


/* ==========================================================
   5. KATEGORİ KAPAKLARI
   ========================================================== */

async function loadCategoryCovers() {

    const images =
        document.querySelectorAll(
            "[data-category-image]"
        );


    if (!images.length) {
        return;
    }


    if (!window.surClient) {

        console.error(
            "❌ Kategori resimleri için Supabase yok."
        );

        return;
    }


    try {

        const {
            data,
            error
        } = await window.surClient
            .from("category_images")
            .select(
                "category,image_url,created_at,product_id"
            )
            .is(
                "product_id",
                null
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "❌ category_images okunamadı:",
                error
            );

            return;
        }


        if (!data?.length) {

            console.warn(
                "⚠️ Kategori kapak kaydı bulunamadı."
            );

            return;
        }


        const normalizeCategory =
            value =>
                String(value || "")
                    .trim()
                    .toLocaleLowerCase(
                        "tr-TR"
                    );


        const latestCovers = {};


        data.forEach(item => {

            if (
                !item.category ||
                !item.image_url
            ) {
                return;
            }


            const key =
                normalizeCategory(
                    item.category
                );


            if (!latestCovers[key]) {

                latestCovers[key] =
                    item.image_url;
            }

        });


        images.forEach(img => {

            const category =
                img.getAttribute(
                    "data-category-image"
                );


            const key =
                normalizeCategory(
                    category
                );


            const imageUrl =
                latestCovers[key];


            if (!imageUrl) {

                console.warn(
                    "⚠️ Kategori resmi bulunamadı:",
                    category
                );

                return;
            }


            setImageSafely(
                img,
                imageUrl
            );


            img.style.display =
                "block";


            const cover =
                img.closest(
                    ".category-cover"
                );


            if (cover) {

                cover.classList.add(
                    "has-image"
                );
            }


            console.log(
                "✅ Kategori resmi:",
                category
            );

        });

    } catch (error) {

        console.error(
            "❌ loadCategoryCovers:",
            error
        );
    }
}


/* ==========================================================
   6. ÜRÜN KARTI
   ========================================================== */

function createProductCard(product) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "product-card";


    const imageUrl =
        product.image_url ||
        "assets/images/logo.jpeg";


    const productName =
        product.name ||
        product.title ||
        "Ürün";


    const price =
        product.price !== null &&
        product.price !== undefined &&
        product.price !== ""
            ? `${product.price} TL`
            : "";


    const category =
        product.category ||
        "";


    card.innerHTML = `

        <div
            class="product-image"
            role="button"
            tabindex="0"
            aria-label="${escapeHtml(productName)} detaylarını görüntüle"
        >

            <img
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(productName)}"
                loading="lazy"
            >

        </div>


        <div class="product-info">

            <h3
                class="product-name-clickable"
                role="button"
                tabindex="0"
            >
                ${escapeHtml(productName)}
            </h3>


            ${
                price
                    ? `
                        <div class="product-price">
                            ${escapeHtml(price)}
                        </div>
                      `
                    : ""
            }


            ${
                category
                    ? `
                        <div class="product-category">
                            ${escapeHtml(category)}
                        </div>
                      `
                    : ""
            }

        </div>
    `;


    /* ======================================================
       RESİM HATA KONTROLÜ
       ====================================================== */

    const img =
        card.querySelector("img");


    if (img) {

        img.onerror =
            function () {

                if (
                    this.dataset.fallbackApplied ===
                    "1"
                ) {
                    return;
                }


                this.dataset.fallbackApplied =
                    "1";


                this.src =
                    "assets/images/logo.jpeg";
            };
    }


    /* ======================================================
       ÜRÜN DETAYI
       ====================================================== */

    function openDetails() {

        openProductDetail(
            product
        );
    }


    const imageBox =
        card.querySelector(
            ".product-image"
        );


    const nameElement =
        card.querySelector(
            ".product-name-clickable"
        );


    if (imageBox) {

        imageBox.addEventListener(
            "click",
            openDetails
        );


        imageBox.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    openDetails();
                }

            }
        );
    }


    if (nameElement) {

        nameElement.addEventListener(
            "click",
            openDetails
        );


        nameElement.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    openDetails();
                }

            }
        );
    }


    return card;
}


/* ==========================================================
   7. ÜRÜN DETAY PENCERESİ
   ========================================================== */

function openProductDetail(product) {

    /*
     * Önceden açık bir detay varsa kaldır.
     */

    const oldModal =
        document.getElementById(
            "surProductDetailModal"
        );


    if (oldModal) {

        oldModal.remove();
    }


    const imageUrl =
        product.image_url ||
        "assets/images/logo.jpeg";


    const productName =
        product.name ||
        product.title ||
        "Ürün";


    const price =
        product.price !== null &&
        product.price !== undefined &&
        product.price !== ""
            ? `${product.price} TL`
            : "";


    const category =
        product.category ||
        "";


    /*
     * Admin panelindeki alanın adı:
     * description
     */

    const description =
        product.description ||
        "";


    /*
     * Ürün ölçüsü varsa göster.
     */

    const size =
        product.size ||
        "";


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "surProductDetailModal";


    modal.className =
        "sur-product-detail-modal";


    modal.innerHTML = `

        <div
            class="sur-product-detail-overlay"
            data-product-close
        ></div>


        <div
            class="sur-product-detail-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="surProductDetailTitle"
        >

            <button
                type="button"
                class="sur-product-detail-close"
                aria-label="Kapat"
                data-product-close
            >
                &times;
            </button>


            <div class="sur-product-detail-content">


                <div class="sur-product-detail-image">

                    <img
                        src="${escapeHtml(imageUrl)}"
                        alt="${escapeHtml(productName)}"
                    >

                </div>


                <div class="sur-product-detail-info">


                    ${
                        category
                            ? `
                                <div class="sur-product-detail-category">
                                    ${escapeHtml(category)}
                                </div>
                              `
                            : ""
                    }


                    <h2 id="surProductDetailTitle">
                        ${escapeHtml(productName)}
                    </h2>


                    ${
                        price
                            ? `
                                <div class="sur-product-detail-price">
                                    ${escapeHtml(price)}
                                </div>
                              `
                            : ""
                    }


                    ${
                        size
                            ? `
                                <div class="sur-product-detail-size">
                                    <strong>Ölçü:</strong>
                                    ${escapeHtml(size)}
                                </div>
                              `
                            : ""
                    }


                    ${
                        description
                            ? `
                                <div class="sur-product-detail-description-title">
                                    Ürün Açıklaması
                                </div>

                                <div class="sur-product-detail-description">
                                    ${escapeHtml(description)}
                                </div>
                              `
                            : `
                                <div class="sur-product-detail-description-title">
                                    Ürün Açıklaması
                                </div>

                                <div class="sur-product-detail-description empty">
                                    Bu ürün için henüz açıklama eklenmemiş.
                                </div>
                              `
                    }


                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    injectProductDetailStyles();


    requestAnimationFrame(
        function () {

            modal.classList.add(
                "is-open"
            );

        }
    );


    /*
     * Kapatma butonları.
     */

    modal
        .querySelectorAll(
            "[data-product-close]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                closeProductDetail
            );

        });


    /*
     * ESC.
     */

    document.addEventListener(
        "keydown",
        handleProductDetailEscape
    );


    /*
     * Sayfanın arkada kaymasını engelle.
     */

    document.body.style.overflow =
        "hidden";
}


/* ==========================================================
   8. ÜRÜN DETAY KAPATMA
   ========================================================== */

function closeProductDetail() {

    const modal =
        document.getElementById(
            "surProductDetailModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "is-open"
    );


    setTimeout(
        function () {

            if (
                modal &&
                modal.parentNode
            ) {

                modal.remove();
            }

        },
        200
    );


    document.body.style.overflow =
        "";


    document.removeEventListener(
        "keydown",
        handleProductDetailEscape
    );
}


function handleProductDetailEscape(
    event
) {

    if (
        event.key === "Escape"
    ) {

        closeProductDetail();
    }
}


/* ==========================================================
   9. ÜRÜN DETAY VE ÜRÜN RESİM STİLLERİ
   ========================================================== */

function injectProductDetailStyles() {

    if (
        document.getElementById(
            "surProductDetailStyles"
        )
    ) {

        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "surProductDetailStyles";


    style.textContent = `

        /* ==================================================
           ÜRÜN KARTI
           ================================================== */

        .product-image {

            width: 100%;
            height: 240px;

            overflow: hidden;

            cursor: pointer;

            position: relative;

            display: flex;
            align-items: center;
            justify-content: center;

            background: #f7f7f7;

        }


        .product-image img {

            width: 100%;
            height: 100%;

            object-fit: contain;

            display: block;

            transition:
                transform 0.25s ease;

        }


        .product-image:hover img {

            transform:
                scale(1.03);

        }


        .product-name-clickable {

            cursor: pointer;

            transition:
                opacity 0.2s ease;

        }


        .product-name-clickable:hover {

            opacity: 0.7;

        }


        /* ==================================================
           ÜRÜN DETAY MODALI
           ================================================== */

        .sur-product-detail-modal {

            position: fixed;

            inset: 0;

            z-index: 1000000;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 20px;

            opacity: 0;

            visibility: hidden;

            transition:
                opacity 0.2s ease,
                visibility 0.2s ease;

        }


        .sur-product-detail-modal.is-open {

            opacity: 1;

            visibility: visible;

        }


        .sur-product-detail-overlay {

            position: absolute;

            inset: 0;

            background:
                rgba(0, 0, 0, 0.72);

            cursor: pointer;

        }


        .sur-product-detail-box {

            position: relative;

            z-index: 2;

            width:
                min(950px, 100%);

            max-height: 90vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius: 16px;

            box-shadow:
                0 20px 60px
                rgba(0, 0, 0, 0.30);

            transform:
                translateY(15px);

            transition:
                transform 0.2s ease;

        }


        .sur-product-detail-modal.is-open
        .sur-product-detail-box {

            transform:
                translateY(0);

        }


        .sur-product-detail-close {

            position: absolute;

            top: 12px;
            right: 15px;

            z-index: 5;

            width: 40px;
            height: 40px;

            border: none;

            border-radius: 50%;

            background:
                rgba(0, 0, 0, 0.65);

            color: #ffffff;

            font-size: 28px;

            line-height: 1;

            cursor: pointer;

        }


        .sur-product-detail-close:hover {

            background:
                rgba(0, 0, 0, 0.85);

        }


        .sur-product-detail-content {

            display: grid;

            grid-template-columns:
                minmax(300px, 1fr)
                minmax(300px, 1fr);

            gap: 30px;

            padding: 30px;

        }


        .sur-product-detail-image {

            width: 100%;

            min-height: 420px;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
                #f5f5f5;

            border-radius: 12px;

            overflow: hidden;

        }


        .sur-product-detail-image img {

            width: 100%;

            height: 100%;

            max-height: 600px;

            object-fit: contain;

            display: block;

        }


        .sur-product-detail-info {

            padding:
                20px 10px;

        }


        .sur-product-detail-category {

            font-size: 14px;

            color: #777;

            margin-bottom: 8px;

        }


        .sur-product-detail-info h2 {

            margin:
                0 0 15px;

            font-size: 30px;

            line-height: 1.2;

        }


        .sur-product-detail-price {

            font-size: 24px;

            font-weight: 700;

            margin-bottom: 15px;

        }


        .sur-product-detail-size {

            margin-bottom: 20px;

            font-size: 16px;

        }


        .sur-product-detail-description-title {

            font-size: 18px;

            font-weight: 700;

            margin-bottom: 10px;

            padding-bottom: 8px;

            border-bottom:
                1px solid #ddd;

        }


        .sur-product-detail-description {

            font-size: 16px;

            line-height: 1.7;

            white-space: pre-wrap;

            color: #333;

        }


        .sur-product-detail-description.empty {

            color: #777;

        }


        /* ==================================================
           MOBİL
           ================================================== */

        @media (max-width: 700px) {

            .product-image {

                height: 200px;

            }


            .sur-product-detail-modal {

                padding: 10px;

            }


            .sur-product-detail-box {

                max-height: 94vh;

                border-radius: 12px;

            }


            .sur-product-detail-content {

                grid-template-columns: 1fr;

                gap: 15px;

                padding: 20px;

            }


            .sur-product-detail-image {

                min-height: 280px;

                max-height: 350px;

            }


            .sur-product-detail-info {

                padding: 5px;

            }


            .sur-product-detail-info h2 {

                font-size: 24px;

            }


            .sur-product-detail-price {

                font-size: 21px;

            }

        }

    `;


    document.head.appendChild(
        style
    );
}


/* ==========================================================
   10. ÖNE ÇIKAN ÜRÜNLER
   ========================================================== */

async function loadFeaturedProducts() {

    const container =
        document.querySelector(
            "#featuredProducts"
        );


    if (!container) {
        return;
    }


    if (!window.surClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await window.surClient
            .from("products")
            .select("*")
            .eq(
                "is_featured",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "❌ Öne çıkan ürünler alınamadı:",
                error
            );

            return;
        }


        container.innerHTML =
            "";


        if (!data?.length) {

            container.innerHTML = `

                <div class="empty-products">

                    <p>
                        Henüz öne çıkan ürün bulunmuyor.
                    </p>

                </div>

            `;

            return;
        }


        data.forEach(product => {

            container.appendChild(
                createProductCard(
                    product
                )
            );

        });


        console.log(
            `✅ ${data.length} öne çıkan ürün yüklendi.`
        );


    } catch (error) {

        console.error(
            "❌ loadFeaturedProducts:",
            error
        );
    }
}


/* ==========================================================
   11. KATALOG ÜRÜNLERİ
   ========================================================== */

async function loadCatalogProducts(
    category
) {

    const container =
        document.querySelector(
            "#catalogProducts"
        );


    if (!container) {
        return;
    }


    if (!category) {

        container.innerHTML = `

            <div class="catalog-error">

                <p>
                    Kategori seçilmedi.
                </p>

            </div>

        `;

        return;
    }


    if (!window.surClient) {

        container.innerHTML = `

            <div class="catalog-error">

                <p>
                    Ürünler şu anda yüklenemiyor.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML = `

        <div class="catalog-loading">

            <p>
                Ürünler yükleniyor...
            </p>

        </div>

    `;


    try {

        const {
            data,
            error
        } = await window.surClient
            .from("products")
            .select("*")
            .eq(
                "category",
                category
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                `❌ ${category} ürünleri alınamadı:`,
                error
            );


            container.innerHTML = `

                <div class="catalog-error">

                    <p>
                        Ürünler yüklenirken hata oluştu.
                    </p>

                    <small>
                        ${escapeHtml(
                            error.message ||
                            "Supabase hatası"
                        )}
                    </small>

                </div>

            `;

            return;
        }


        container.innerHTML =
            "";


        if (!data?.length) {

            container.innerHTML = `

                <div class="empty-products">

                    <p>
                        Bu kategoride henüz ürün bulunmuyor.
                    </p>

                </div>

            `;

            return;
        }


        data.forEach(product => {

            container.appendChild(
                createProductCard(
                    product
                )
            );

        });


        console.log(
            `✅ ${category}: ${data.length} ürün`
        );


    } catch (error) {

        console.error(
            "❌ loadCatalogProducts:",
            error
        );


        container.innerHTML = `

            <div class="catalog-error">

                <p>
                    Ürünler yüklenirken
                    beklenmeyen hata oluştu.
                </p>

            </div>

        `;
    }
}


/* ==========================================================
   12. KATALOG FİLTRELERİ
   ========================================================== */

function setupCatalogFilters() {

    const filters =
        document.querySelectorAll(
            ".category-filter"
        );


    if (!filters.length) {
        return;
    }


    const title =
        document.querySelector(
            "#catalogTitle"
        );


    const description =
        document.querySelector(
            "#catalogDescription"
        );


    const descriptions = {

        "Halılar":
            "Koleksiyonumuzdaki halıları keşfedin.",

        "Klasik Yolluklar":
            "Klasik yolluk koleksiyonumuzu keşfedin.",

        "Sisal":
            "Sisal halı koleksiyonumuzu keşfedin.",

        "Kaymaz":
            "Kaymaz tabanlı ürünlerimizi keşfedin.",

        "Özel Kesim":
            "Özel ölçü ve kesim ürünlerimizi keşfedin."

    };


    const params =
        new URLSearchParams(
            window.location.search
        );


    const requestedCategory =
        (
            params.get("category") ||
            ""
        ).trim();


    let activeFilter =
        null;


    /*
     * URL'deki kategori.
     */

    if (requestedCategory) {

        filters.forEach(filter => {

            const filterCategory =
                (
                    filter.dataset.category ||
                    ""
                ).trim();


            if (
                filterCategory
                    .toLocaleLowerCase("tr-TR") ===
                requestedCategory
                    .toLocaleLowerCase("tr-TR")
            ) {

                activeFilter =
                    filter;
            }

        });
    }


    /*
     * Geçersiz URL ise ilk kategori.
     */

    if (!activeFilter) {

        activeFilter =
            filters[0];
    }


    function activateFilter(
        filter,
        updateUrl = true
    ) {

        if (!filter) {
            return;
        }


        filters.forEach(item => {

            item.classList.remove(
                "active"
            );


            item.setAttribute(
                "aria-selected",
                "false"
            );

        });


        filter.classList.add(
            "active"
        );


        filter.setAttribute(
            "aria-selected",
            "true"
        );


        const category =
            filter.dataset.category;


        if (title) {

            title.textContent =
                category;
        }


        if (description) {

            description.textContent =
                descriptions[category] ||
                "Koleksiyonumuzdaki ürünleri keşfedin.";
        }


        if (updateUrl) {

            try {

                const newUrl =
                    `${window.location.pathname}?category=${encodeURIComponent(category)}`;


                window.history.replaceState(
                    {},
                    "",
                    newUrl
                );

            } catch (error) {

                console.warn(
                    "⚠️ URL güncellenemedi:",
                    error
                );
            }
        }


        loadCatalogProducts(
            category
        );
    }


    filters.forEach(filter => {

        filter.addEventListener(
            "click",
            function () {

                activateFilter(
                    this,
                    true
                );

            }
        );

    });


    activateFilter(
        activeFilter,
        false
    );


    console.log(
        "✅ Katalog sistemi hazır."
    );
}


/* ==========================================================
   13. ASİSTAN ÜRÜNLERİ
   ========================================================== */

let assistantProducts = [];


async function loadAssistantProducts() {

    if (!window.surClient) {
        return;
    }


    try {

        const {
            data,
            error
        } = await window.surClient
            .from("products")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(100);


        if (error) {

            console.warn(
                "⚠️ Asistan ürünleri alınamadı:",
                error
            );

            return;
        }


        assistantProducts =
            data || [];


        window.surAssistantProducts =
            assistantProducts;


        console.log(
            `✅ Asistan için ${assistantProducts.length} ürün hazır.`
        );


    } catch (error) {

        console.warn(
            "⚠️ loadAssistantProducts:",
            error
        );
    }
}


/* ==========================================================
   14. KATEGORİ ALGILAMA
   ========================================================== */

function detectCategoryIntent(
    message
) {

    const text =
        String(message || "")
            .toLocaleLowerCase(
                "tr-TR"
            );


    if (
        text.includes("sisal")
    ) {

        return "Sisal";
    }


    if (
        text.includes("kaymaz")
    ) {

        return "Kaymaz";
    }


    if (
        text.includes("özel ölçü") ||
        text.includes("özel olcu") ||
        text.includes("özel kesim") ||
        text.includes("özel kes")
    ) {

        return "Özel Kesim";
    }


    if (
        text.includes("klasik yolluk")
    ) {

        return "Klasik Yolluklar";
    }


    if (
        text.includes("yolluk")
    ) {

        return "Klasik Yolluklar";
    }


    if (
        text.includes("halı") ||
        text.includes("hali") ||
        text.includes("fiyat")
    ) {

        return "Halılar";
    }


    return null;
}


/* ==========================================================
   15. ASİSTAN ÜRÜN ARAMA
   ========================================================== */

function findAssistantProducts(
    message
) {

    const text =
        String(message || "")
            .toLocaleLowerCase(
                "tr-TR"
            );


    const category =
        detectCategoryIntent(
            message
        );


    const tokens =
        text
            .replace(
                /[^a-zçğıöşü0-9\s-]/gi,
                " "
            )
            .split(/\s+/)
            .filter(
                token =>
                    token.length > 2
            );


    return assistantProducts
        .map(product => {

            const searchable = [

                product.name,

                product.title,

                product.category,

                product.description,

                product.size

            ]
                .filter(Boolean)
                .join(" ")
                .toLocaleLowerCase(
                    "tr-TR"
                );


            let score =
                category &&
                product.category ===
                category
                    ? 5
                    : 0;


            tokens.forEach(token => {

                if (
                    searchable.includes(
                        token
                    )
                ) {

                    score++;
                }

            });


            return {
                product,
                score
            };

        })
        .filter(
            item =>
                item.score > 0
        )
        .sort(
            (a, b) =>
                b.score - a.score
        )
        .slice(
            0,
            3
        )
        .map(
            item =>
                item.product
        );
}


/* ==========================================================
   16. AI ASİSTAN
   ========================================================== */

async function askGroqAI(
    message
) {

    if (!message) {
        return "";
    }


    if (!window.surClient) {

        throw new Error(
            "Supabase bağlantısı kurulamadı."
        );
    }


    const products =
        findAssistantProducts(
            message
        );


    const productContext =
        products.map(product => ({

            id:
                product.id,

            name:
                product.name ||
                product.title ||
                "",

            title:
                product.title ||
                product.name ||
                "",

            category:
                product.category ||
                "",

            price:
                product.price ??
                "",

            size:
                product.size ||
                "",

            description:
                product.description ||
                "",

            image_url:
                product.image_url ||
                ""

        }));


    const payload = {

        message:
            String(message).trim(),

        products:
            productContext

    };


    console.log(
        "🤖 AI mesajı gönderiliyor..."
    );


    let result;


    try {

        result =
            await window.surClient.functions.invoke(
                "groq-chat",
                {
                    body: payload
                }
            );

    } catch (error) {

        console.error(
            "❌ groq-chat bağlantı hatası:",
            error
        );


        throw new Error(
            "Asistana ulaşılamadı. Lütfen tekrar deneyin."
        );
    }


    const {
        data,
        error
    } = result || {};


    if (error) {

        console.error(
            "❌ groq-chat hata:",
            error
        );


        throw new Error(
            error.message ||
            "Asistan şu anda cevap veremiyor."
        );
    }


    const answer =

        data?.answer ||

        data?.message ||

        data?.response ||

        data?.content ||

        data?.text;


    if (!answer) {

        console.error(
            "❌ AI boş cevap döndürdü:",
            data
        );


        throw new Error(
            "Asistandan boş cevap geldi."
        );
    }


    return String(
        answer
    );
}


/* ==========================================================
   17. ASİSTAN MESAJ GÖSTERME
   ========================================================== */

function addAssistantMessage(
    text,
    type = "bot"
) {

    const messages =
        document.querySelector(
            "#aiChatMessages"
        );


    if (!messages) {
        return;
    }


    const div =
        document.createElement(
            "div"
        );


    div.className =
        type === "user"
            ? "ai-msg ai-msg-user"
            : "ai-msg ai-msg-bot";


    div.style.padding =
        "8px 12px";


    div.style.borderRadius =
        "8px";


    div.style.marginBottom =
        "8px";


    div.style.whiteSpace =
        "pre-wrap";


    if (type === "user") {

        div.style.background =
            "#2c3e50";

        div.style.color =
            "#fff";

    } else {

        div.style.background =
            "#e9ecef";

        div.style.color =
            "#222";
    }


    div.textContent =
        text;


    messages.appendChild(
        div
    );


    messages.scrollTop =
        messages.scrollHeight;


    return div;
}


/* ==========================================================
   18. ASİSTAN CHAT
   ========================================================== */

function setupAIChat() {

    const input =
        document.querySelector(
            "#aiChatInput"
        );


    const sendButton =
        document.querySelector(
            "#aiChatSend"
        );


    const messages =
        document.querySelector(
            "#aiChatMessages"
        );


    if (
        !input ||
        !sendButton ||
        !messages
    ) {

        console.log(
            "ℹ️ AI sohbet alanı bu sayfada yok."
        );

        return;
    }


    if (
        sendButton.dataset.chatReady ===
        "1"
    ) {

        return;
    }


    sendButton.dataset.chatReady =
        "1";


    let sending =
        false;


    async function sendMessage() {

        if (sending) {
            return;
        }


        const message =
            input.value.trim();


        if (!message) {
            return;
        }


        sending = true;


        input.value =
            "";


        addAssistantMessage(
            message,
            "user"
        );


        const loading =
            addAssistantMessage(
                "Yazıyor...",
                "bot"
            );


        sendButton.disabled =
            true;


        sendButton.style.opacity =
            "0.6";


        try {

            const answer =
                await askGroqAI(
                    message
                );


            if (loading) {

                loading.remove();
            }


            addAssistantMessage(
                answer,
                "bot"
            );


        } catch (error) {

            console.error(
                "❌ Asistan mesaj hatası:",
                error
            );


            if (loading) {

                loading.remove();
            }


            addAssistantMessage(
                error.message ||
                "Bir hata oluştu. Lütfen tekrar deneyin.",
                "bot"
            );


        } finally {

            sending =
                false;


            sendButton.disabled =
                false;


            sendButton.style.opacity =
                "1";


            input.focus();
        }
    }


    sendButton.addEventListener(
        "click",
        sendMessage
    );


    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                sendMessage();
            }

        }
    );


    /*
     * RESİM YÜKLEME BUTONU
     */

    const uploadButton =
        document.querySelector(
            "#chat-upload-btn"
        );


    const fileInput =
        document.querySelector(
            "#chat-file-input"
        );


    if (
        uploadButton &&
        fileInput
    ) {

        uploadButton.addEventListener(
            "click",
            function () {

                fileInput.click();

            }
        );


        fileInput.addEventListener(
            "change",
            function () {

                const file =
                    this.files?.[0];


                if (!file) {
                    return;
                }


                addAssistantMessage(
                    "📷 Görsel seçildi. Görsel analizi bağlantısı hazır olduğunda burada işlenecek.",
                    "bot"
                );


                this.value =
                    "";
            }
        );
    }


    console.log(
        "✅ Sur Halı Asistanı hazır."
    );
}


/* ==========================================================
   19. TRY-ON KREDİ
   ========================================================== */

function getTryOnDeviceId() {

    let deviceId =
        localStorage.getItem(
            "tryOnDeviceId"
        );


    if (!deviceId) {

        deviceId =
            "device-" +
            (
                window.crypto &&
                crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`
            );


        localStorage.setItem(
            "tryOnDeviceId",
            deviceId
        );
    }


    return deviceId;
}


function getTryOnCredits() {

    const value =
        localStorage.getItem(
            "tryOnCredits"
        );


    if (
        value ===
        "unlimited"
    ) {

        return Infinity;
    }


    return Math.max(
        0,
        Number.parseInt(
            value,
            10
        ) || 0
    );
}


function consumeTryOnCredit() {

    const credits =
        getTryOnCredits();


    if (
        credits !==
        Infinity
    ) {

        localStorage.setItem(
            "tryOnCredits",
            String(
                Math.max(
                    0,
                    credits - 1
                )
            )
        );
    }
}


async function syncTryOnCredits() {

    const stored =
        localStorage.getItem(
            "tryOnCredits"
        );


    if (
        stored !== "unlimited" &&
        Number.isNaN(
            Number.parseInt(
                stored,
                10
            )
        )
    ) {

        localStorage.setItem(
            "tryOnCredits",
            "2"
        );
    }


    if (!window.surClient) {
        return;
    }


    try {

        const deviceId =
            getTryOnDeviceId();


        const {
            data,
            error
        } = await window.surClient
            .from("user_credits")
            .select(
                "identifier,credits,is_unlimited,updated_at"
            )
            .eq(
                "identifier",
                deviceId
            )
            .maybeSingle();


        if (
            error ||
            !data
        ) {

            return;
        }


        if (
            data.is_unlimited ===
            true
        ) {

            localStorage.setItem(
                "tryOnCredits",
                "unlimited"
            );

            return;
        }


        const syncKey =
            `tryOnCreditsSynced:${deviceId}`;


        if (
            data.updated_at !==
            localStorage.getItem(
                syncKey
            )
        ) {

            const current =
                Number.parseInt(
                    localStorage.getItem(
                        "tryOnCredits"
                    ),
                    10
                ) || 0;


            localStorage.setItem(
                "tryOnCredits",
                String(
                    current +
                    (
                        Number(
                            data.credits
                        ) || 0
                    )
                )
            );


            localStorage.setItem(
                syncKey,
                data.updated_at ||
                String(
                    Date.now()
                )
            );
        }


    } catch (error) {

        console.warn(
            "⚠️ Kredi senkronizasyonu:",
            error
        );
    }
}


/* ==========================================================
   20. VIRTUAL TRY-ON
   ========================================================== */

async function invokeVirtualTryOn(
    product,
    roomImage
) {

    if (!window.surClient) {

        throw new Error(
            "Supabase bağlantısı hazır değil."
        );
    }


    if (
        !product?.image_url
    ) {

        throw new Error(
            "Ürün görseli bulunamadı."
        );
    }


    if (!roomImage) {

        throw new Error(
            "Oda görseli bulunamadı."
        );
    }


    const payload = {

        room_image:
            roomImage,

        product_image:
            product.image_url,

        product_id:
            product.id || null

    };


    console.log(
        "🤖 Virtual Try-On başlatılıyor..."
    );


    const {
        data,
        error
    } = await window.surClient.functions.invoke(
        "virtual-try-on",
        {
            body: payload
        }
    );


    if (error) {

        console.error(
            "❌ Virtual Try-On:",
            error
        );


        throw new Error(
            error.message ||
            "Sanal giydirme başarısız."
        );
    }


    if (
        !data?.output_url
    ) {

        console.error(
            "❌ Virtual Try-On cevap:",
            data
        );


        throw new Error(
            "Sanal giydirme sonucu alınamadı."
        );
    }


    return data.output_url;
}


/* ==========================================================
   21. ODA ANALİZİ
   ========================================================== */

async function analyzeRoom(
    imageFile
) {

    if (!imageFile) {

        throw new Error(
            "Analiz için oda görseli gerekli."
        );
    }


    if (!window.surClient) {

        throw new Error(
            "Supabase bağlantısı hazır değil."
        );
    }


    /*
     * Dosyayı Base64'e çevir.
     */

    const imageData =
        await new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    () =>
                        resolve(
                            reader.result
                        );


                reader.onerror =
                    () =>
                        reject(
                            new Error(
                                "Görsel okunamadı."
                            )
                        );


                reader.readAsDataURL(
                    imageFile
                );
            }
        );


    const {
        data,
        error
    } = await window.surClient.functions.invoke(
        "analyze-room",
        {
            body: {
                image:
                    imageData
            }
        }
    );


    if (error) {

        console.error(
            "❌ Oda analizi:",
            error
        );


        throw new Error(
            error.message ||
            "Oda analiz edilemedi."
        );
    }


    return data;
}


/* ==========================================================
   22. GLOBAL FONKSİYONLAR
   ========================================================== */

window.loadSiteSettings =
    loadSiteSettings;


window.loadHeroBackground =
    loadHeroBackground;


window.loadCategoryCovers =
    loadCategoryCovers;


window.loadFeaturedProducts =
    loadFeaturedProducts;


window.loadCatalogProducts =
    loadCatalogProducts;


window.setupCatalogFilters =
    setupCatalogFilters;


window.loadAssistantProducts =
    loadAssistantProducts;


window.askGroqAI =
    askGroqAI;


window.setupAIChat =
    setupAIChat;


window.invokeVirtualTryOn =
    invokeVirtualTryOn;


window.analyzeRoom =
    analyzeRoom;


window.getTryOnCredits =
    getTryOnCredits;


window.consumeTryOnCredit =
    consumeTryOnCredit;


window.syncTryOnCredits =
    syncTryOnCredits;


window.openProductDetail =
    openProductDetail;


window.closeProductDetail =
    closeProductDetail;


/* ==========================================================
   23. ANA BAŞLATMA
   ========================================================== */

async function initializeSurHaliSite() {

    console.log(
        "🔄 Sur Halı sistemi başlatılıyor..."
    );


    /*
     * Supabase
     */

    const supabaseReady =
        initializeSupabase();


    /*
     * Supabase hazırsa verileri yükle.
     */

    if (supabaseReady) {

        await Promise.allSettled([

            loadSiteSettings(),

            loadHeroBackground(),

            loadCategoryCovers(),

            loadFeaturedProducts(),

            loadAssistantProducts(),

            syncTryOnCredits()

        ]);
    }


    /*
     * Katalog.
     *
     * Sadece .category-filter kullanır.
     * Ana sayfadaki kategori kartlarına dokunmaz.
     */

    setupCatalogFilters();


    /*
     * AI.
     */

    setupAIChat();


    /*
     * Ürün detay stillerini hazırla.
     */

    injectProductDetailStyles();


    console.log(
        "=========================================="
    );


    console.log(
        "✅ SUR HALI SİTE BAŞLATMA TAMAMLANDI"
    );


    console.log(
        "=========================================="
    );
}


/* ==========================================================
   24. DOM READY
   ========================================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSurHaliSite
    );

} else {

    initializeSurHaliSite();
}
```
