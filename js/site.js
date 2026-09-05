/* ==========================================================
   SUR HALI İZNİK - ANA SITE JAVASCRIPT
   TEMİZ / TEK SUPABASE CLIENT / OTOMATİK BAŞLATMA
   ========================================================== */

console.log("🚀 Sur Halı site.js başlatılıyor...");


/* ==========================================================
   1. SUPABASE AYARLARI
   ========================================================== */

const SUR_SUPABASE_URL =
    "https://lhltolrtgnfkbwfkpaex.supabase.co";

/*
 * window.SUPABASE_URL = window.SUPABASE_URL ||
    "https://lhltolrtgnfkbwfkpaex.supabase.co";
 * window.SUPABASE_ANON_KEY =
    "sb_publishable_xdWMVRunvPSeiMw2vfGWyw_l6dTnBsn"
 *
 * service_role KEY KULLANMA.
 */
const SUR_SUPABASE_KEY =
    "sb_publishable_xdWMVRunvPSeiMw2vfGWyw_l6dTnBsn";


/* ==========================================================
   2. TEK SUPABASE CLIENT
   ========================================================== */

window.surClient = null;

function initializeSupabase() {

    try {

        if (!window.supabase) {
            console.error(
                "❌ Supabase CDN yüklenmemiş."
            );
            return false;
        }

        if (!SUR_SUPABASE_URL || !SUR_SUPABASE_KEY) {
            console.error(
                "❌ Supabase URL veya KEY eksik."
            );
            return false;
        }

        window.surClient = window.supabase.createClient(
            SUR_SUPABASE_URL,
            SUR_SUPABASE_KEY
        );

        console.log("✅ Supabase bağlantısı hazır.");

        return true;

    } catch (error) {

        console.error(
            "❌ Supabase client oluşturulamadı:",
            error
        );

        window.surClient = null;

        return false;
    }
}


/* ==========================================================
   3. GÜVENLİ RESİM YÜKLEME
   ========================================================== */

function setImageSafely(img, url, fallback = "assets/images/logo.jpeg") {

    if (!img) {
        return;
    }

    if (!url) {
        img.src = fallback;
        return;
    }

    img.onerror = function () {

        if (this.dataset.fallbackApplied === "1") {
            return;
        }

        this.dataset.fallbackApplied = "1";
        this.src = fallback;
    };

    img.src = url;
}


/* ==========================================================
   4. SITE AYARLARI
   ========================================================== */

async function loadSiteSettings() {

    if (!window.surClient) {
        console.warn(
            "⚠️ loadSiteSettings: Supabase hazır değil."
        );
        return;
    }

    try {

        const { data, error } = await window.surClient
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

        const settings = data?.[0];

        if (!settings) {
            console.log(
                "ℹ️ site_settings tablosunda kayıt bulunamadı."
            );
            return;
        }

        /*
         * Site adı
         */

        document.querySelectorAll(
            "[data-site-name]"
        ).forEach(element => {

            if (settings.site_name) {
                element.textContent =
                    settings.site_name;
            }

        });


        /*
         * Logo
         */

        document.querySelectorAll(
            "[data-site-logo]"
        ).forEach(img => {

            if (settings.logo_url) {

                setImageSafely(
                    img,
                    settings.logo_url
                );

            }

        });


        /*
         * Hero başlık
         */

        const heroTitle =
            document.querySelector(
                "[data-hero-title]"
            );

        if (heroTitle && settings.hero_title) {
            heroTitle.textContent =
                settings.hero_title;
        }


        /*
         * Hero açıklama
         */

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
            "❌ loadSiteSettings hatası:",
            error
        );
    }
}


/* ==========================================================
   5. HERO ARKA PLAN
   ========================================================== */

async function loadHeroBackground() {

    const heroSection =
        document.querySelector(".hero-section");

    const heroMedia =
        document.querySelector("[data-hero-media]");

    if (!heroSection) {
        console.log(
            "ℹ️ Hero bölümü bu sayfada yok."
        );
        return;
    }

    /*
     * Varsayılan resim.
     */

    let heroUrl =
        "assets/images/hero-bg.jpg";


    /*
     * Supabase'den yönetilen hero resmi.
     */

    if (window.surClient) {

        try {

            const { data, error } =
                await window.surClient
                    .from("site_settings")
                    .select("hero_bg_url")
                    .limit(1);

            if (error) {

                console.warn(
                    "⚠️ Hero Supabase'den okunamadı:",
                    error
                );

            } else if (
                data?.[0]?.hero_bg_url
            ) {

                heroUrl =
                    data[0].hero_bg_url;
            }

        } catch (error) {

            console.warn(
                "⚠️ Hero yükleme hatası:",
                error
            );
        }
    }


    /*
     * Hero uygula.
     */

    if (heroUrl) {

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
        }

        console.log(
            "✅ Hero resmi yüklendi:",
            heroUrl
        );
    }
}


/* ==========================================================
   6. KATEGORİ KAPAK RESİMLERİ
   ========================================================== */

async function loadCategoryCovers() {

    const categoryImages =
        document.querySelectorAll(
            "[data-category-cover]"
        );

    if (!categoryImages.length) {

        console.log(
            "ℹ️ Kategori kapak alanı bulunamadı."
        );

        return;
    }


    if (!window.surClient) {

        console.error(
            "❌ Kategori kapakları için Supabase bağlantısı yok."
        );

        return;
    }


    try {

        const { data: covers, error } =
            await window.surClient
                .from("category_images")
                .select(
                    "category,image_url,created_at"
                )
                .is("product_id", null)
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


        if (!covers?.length) {

            console.warn(
                "⚠️ category_images tablosunda kapak resmi bulunamadı."
            );

            return;
        }


        /*
         * Her kategori için en yeni resmi al.
         */

        const latestCovers = {};

        covers.forEach(cover => {

            if (
                !cover.category ||
                !cover.image_url
            ) {
                return;
            }

            if (
                !latestCovers[cover.category]
            ) {

                latestCovers[cover.category] =
                    cover.image_url;
            }

        });


        /*
         * Sayfadaki kategori kartlarını doldur.
         */

        categoryImages.forEach(img => {

            const category =
                img.dataset.categoryCover;

            if (!category) {
                return;
            }


            const imageUrl =
                latestCovers[category];


            if (!imageUrl) {

                console.warn(
                    `⚠️ "${category}" kategorisi için kapak bulunamadı.`
                );

                return;
            }


            setImageSafely(img, imageUrl);


            const container =
                img.closest(".category-cover");

            if (container) {
                container.classList.add(
                    "has-image"
                );
            }

        });


        console.log(
            "✅ Kategori kapakları yüklendi."
        );

    } catch (error) {

        console.error(
            "❌ loadCategoryCovers hatası:",
            error
        );
    }
}


/* ==========================================================
   7. ÖNE ÇIKAN ÜRÜNLER
   ========================================================== */

async function loadFeaturedProducts() {

    const container =
        document.querySelector(
            "#featuredProducts"
        );

    if (!container) {

        console.log(
            "ℹ️ Öne çıkan ürün alanı bu sayfada yok."
        );

        return;
    }


    if (!window.surClient) {

        console.error(
            "❌ Öne çıkan ürünler için Supabase yok."
        );

        return;
    }


    try {

        const { data: products, error } =
            await window.surClient
                .from("products")
                .select("*")
                .eq("is_featured", true)
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


        container.innerHTML = "";


        if (!products?.length) {

            container.innerHTML = `
                <div class="empty-products">
                    <p>Henüz öne çıkan ürün bulunmuyor.</p>
                </div>
            `;

            return;
        }


        products.forEach(product => {

            container.appendChild(
                createProductCard(product)
            );

        });


        console.log(
            `✅ ${products.length} öne çıkan ürün yüklendi.`
        );

    } catch (error) {

        console.error(
            "❌ loadFeaturedProducts hatası:",
            error
        );
    }
}


/* ==========================================================
   8. ÜRÜN KARTI
   ========================================================== */

function createProductCard(product) {

    const card =
        document.createElement("article");

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


    card.innerHTML = `
        <div class="product-image">
            <img
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(productName)}"
                loading="lazy"
            >
        </div>

        <div class="product-info">

            <h3>
                ${escapeHtml(productName)}
            </h3>

            ${
                price
                    ? `<div class="product-price">
                           ${escapeHtml(price)}
                       </div>`
                    : ""
            }

            ${
                product.category
                    ? `<div class="product-category">
                           ${escapeHtml(product.category)}
                       </div>`
                    : ""
            }

        </div>
    `;


    const img =
        card.querySelector("img");

    if (img) {

        img.onerror = function () {

            if (
                this.dataset.fallbackApplied === "1"
            ) {
                return;
            }

            this.dataset.fallbackApplied =
                "1";

            this.src =
                "assets/images/logo.jpeg";
        };
    }


    return card;
}


/* ==========================================================
   9. KATALOG ÜRÜNLERİ
   ========================================================== */

async function loadCatalogProducts(category) {

    const container =
        document.querySelector(
            "#catalogProducts"
        );

    if (!container) {
        return;
    }


    if (!window.surClient) {

        container.innerHTML = `
            <div class="catalog-error">
                <p>Ürünler şu anda yüklenemiyor.</p>
                <small>Supabase bağlantısı kurulamadı.</small>
            </div>
        `;

        console.error(
            "❌ Katalog için Supabase yok."
        );

        return;
    }


    if (!category) {

        container.innerHTML = `
            <div class="catalog-error">
                <p>Kategori seçilmedi.</p>
            </div>
        `;

        return;
    }


    try {

        container.innerHTML = `
            <div class="catalog-loading">
                <p>Ürünler yükleniyor...</p>
            </div>
        `;


        const { data: products, error } =
            await window.surClient
                .from("products")
                .select("*")
                .eq("category", category)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                `❌ "${category}" ürünleri alınamadı:`,
                error
            );


            container.innerHTML = `
                <div class="catalog-error">
                    <p>Ürünler yüklenirken bir hata oluştu.</p>
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


        container.innerHTML = "";


        if (!products?.length) {

            container.innerHTML = `
                <div class="empty-products">
                    <p>
                        Bu kategoride henüz ürün bulunmuyor.
                    </p>
                </div>
            `;

            console.log(
                `ℹ️ "${category}" kategorisinde ürün yok.`
            );

            return;
        }


        products.forEach(product => {

            container.appendChild(
                createProductCard(product)
            );

        });


        console.log(
            `✅ "${category}" kategorisinden ${products.length} ürün yüklendi.`
        );

    } catch (error) {

        console.error(
            "❌ loadCatalogProducts hatası:",
            error
        );


        container.innerHTML = `
            <div class="catalog-error">
                <p>Ürünler yüklenirken beklenmeyen bir hata oluştu.</p>
            </div>
        `;
    }
}


/* ==========================================================
   10. KATALOG FİLTRELERİ
   ========================================================== */

function setupCatalogFilters() {

    const filters =
        document.querySelectorAll(
            "[data-category]"
        );

    const title =
        document.querySelector(
            "#catalogTitle"
        );

    const description =
        document.querySelector(
            "#catalogDescription"
        );


    if (!filters.length) {

        console.log(
            "ℹ️ Katalog filtreleri bu sayfada yok."
        );

        return;
    }


    /*
     * URL'deki kategori.
     *
     * Örnek:
     * halilar.html?category=Sisal
     */

    const params =
        new URLSearchParams(
            window.location.search
        );


    const requestedCategory =
        params.get("category");


    /*
     * Önce URL'deki kategori,
     * yoksa ilk filtre.
     */

    let activeFilter = null;


    if (requestedCategory) {

        filters.forEach(filter => {

            if (
                filter.dataset.category ===
                requestedCategory
            ) {

                activeFilter = filter;
            }

        });
    }


    if (!activeFilter) {
        activeFilter = filters[0];
    }


    function activateFilter(filter) {

        if (!filter) {
            return;
        }


        filters.forEach(item => {

            item.classList.remove(
                "active"
            );

        });


        filter.classList.add(
            "active"
        );


        const category =
            filter.dataset.category;


        /*
         * BAŞLIK
         */

        if (title) {
            title.textContent =
                category;
        }


        /*
         * AÇIKLAMA
         */

        if (description) {

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


            description.textContent =
                descriptions[category] ||
                "Koleksiyonumuzdaki ürünleri keşfedin.";
        }


        /*
         * URL'yi güncelle.
         */

        const newUrl =
            `${window.location.pathname}?category=${encodeURIComponent(category)}`;


        try {

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


        /*
         * Ürünleri getir.
         */

        loadCatalogProducts(
            category
        );
    }


    /*
     * Tıklamalar
     */

    filters.forEach(filter => {

        filter.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                activateFilter(this);
            }
        );

    });


    /*
     * Sayfa ilk açıldığında
     * doğru kategoriyi yükle.
     */

    activateFilter(
        activeFilter
    );


    console.log(
        "✅ Katalog sistemi hazır."
    );
}


/* ==========================================================
   11. ASİSTAN ÜRÜNLERİ
   ========================================================== */

async function loadAssistantProducts() {

    if (!window.surClient) {
        return;
    }


    try {

        const { data, error } =
            await window.surClient
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


        window.surAssistantProducts =
            data || [];


        console.log(
            `✅ Asistan için ${window.surAssistantProducts.length} ürün hazır.`
        );

    } catch (error) {

        console.warn(
            "⚠️ loadAssistantProducts hatası:",
            error
        );
    }
}


/* ==========================================================
   12. TRY-ON KREDİ SENKRONİZASYONU
   ========================================================== */

async function syncTryOnCredits() {

    /*
     * Bu fonksiyon daha önce kullandığın
     * user_credits sisteminin çökmesini engellemek
     * için güvenli şekilde çalışır.
     */

    if (!window.surClient) {
        return;
    }


    try {

        const {
            data: {
                session
            }
        } =
            await window.surClient.auth.getSession();


        if (!session?.user) {

            console.log(
                "ℹ️ Giriş yapılmadığı için kredi senkronizasyonu atlandı."
            );

            return;
        }


        const userId =
            session.user.id;


        const {
            data,
            error
        } =
            await window.surClient
                .from("user_credits")
                .select("*")
                .eq(
                    "user_id",
                    userId
                )
                .maybeSingle();


        if (error) {

            console.warn(
                "⚠️ user_credits okunamadı:",
                error
            );

            return;
        }


        window.surUserCredits =
            data || null;


        console.log(
            "✅ Kullanıcı kredi bilgisi hazır."
        );

    } catch (error) {

        console.warn(
            "⚠️ syncTryOnCredits hatası:",
            error
        );
    }
}


/* ==========================================================
   13. VIRTUAL TRY-ON
   ========================================================== */

async function invokeVirtualTryOn(
    roomImage,
    carpetImage
) {

    /*
     * Buradaki fonksiyon, mevcut sistemin
     * çağırabileceği global fonksiyondur.
     *
     * Replicate API anahtarını frontend'e koymuyoruz.
     */

    console.warn(
        "⚠️ invokeVirtualTryOn çağrıldı."
    );

    if (!roomImage || !carpetImage) {

        throw new Error(
            "Oda ve halı görselleri gerekli."
        );
    }


    /*
     * Mevcut backend / Edge Function sistemin varsa
     * buraya bağlanabilir.
     *
     * Frontend'e Replicate secret koyma.
     */

    throw new Error(
        "Virtual Try-On backend bağlantısı henüz tanımlı değil."
    );
}


/* ==========================================================
   14. ODA ANALİZİ
   ========================================================== */

async function analyzeRoom(imageFile) {

    if (!imageFile) {

        throw new Error(
            "Analiz için bir oda görseli gerekli."
        );
    }


    /*
     * Burada da gizli API anahtarını
     * frontend'de kullanmıyoruz.
     *
     * Mevcut backend fonksiyonuna bağlanacak.
     */

    console.warn(
        "⚠️ analyzeRoom çağrıldı."
    );


    throw new Error(
        "Oda analiz backend bağlantısı tanımlı değil."
    );
}


/* ==========================================================
   15. GROQ AI
   ========================================================== */

async function askGroqAI(message) {

    if (!message) {
        return "";
    }


    /*
     * GÜVENLİK:
     *
     * Groq API KEY frontend JS içinde bulunmamalıdır.
     *
     * Eski kodda bulunan GROQ API key'i
     * frontend'den kaldır.
     *
     * Burada backend / Edge Function kullanılmalı.
     */

    console.warn(
        "⚠️ askGroqAI çağrıldı."
    );


    throw new Error(
        "AI bağlantısı için güvenli backend/Edge Function gerekli."
    );
}


/* ==========================================================
   16. HTML ESCAPE
   ========================================================== */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* ==========================================================
   17. GLOBAL FONKSİYONLAR
   ========================================================== */

window.loadCategoryCovers =
    loadCategoryCovers;

window.loadHeroBackground =
    loadHeroBackground;

window.loadFeaturedProducts =
    loadFeaturedProducts;

window.loadCatalogProducts =
    loadCatalogProducts;

window.setupCatalogFilters =
    setupCatalogFilters;

window.loadAssistantProducts =
    loadAssistantProducts;

window.syncTryOnCredits =
    syncTryOnCredits;

window.invokeVirtualTryOn =
    invokeVirtualTryOn;

window.analyzeRoom =
    analyzeRoom;

window.askGroqAI =
    askGroqAI;


/* ==========================================================
   18. ANA BAŞLATMA
   ========================================================== */

async function initializeSurHaliSite() {

    console.log(
        "🔄 Sur Halı site sistemi başlatılıyor..."
    );


    /*
     * Önce Supabase.
     */

    initializeSupabase();


    /*
     * Supabase hazırsa verileri yükle.
     */

    if (window.surClient) {

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
     * Katalog sistemi.
     *
     * Supabase'den bağımsız olarak başlasın.
     */

    setupCatalogFilters();


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
   19. DOM HAZIR OLDUĞUNDA ÇALIŞTIR
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
