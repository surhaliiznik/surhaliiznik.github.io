/* ==========================================================
   SUR HALI İZNİK
   ANA SİTE JAVASCRIPT
   SUPABASE ÜRÜN + RESİM SİSTEMİ
   ========================================================== */

console.log("Sur Halı site.js başlatılıyor...");


/* ==========================================================
   SABİTLER
   ========================================================== */

const WHATSAPP_NUMBER = "905396369095";

const STORAGE_BUCKET = "category-images";

const CATEGORY_COVERS_PATH = "category-covers";

const HERO_IMAGE_PATH = "assets/images/hero-ana-sayfa-magaza.png";

const KATEGORILER = [
    "Halılar",
    "Klasik Yolluklar",
    "Sisal",
    "Kaymaz",
    "Özel Kesim"
];


/* ==========================================================
   HTML GÜVENLİĞİ
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


/* ==========================================================
   FİYAT
   ========================================================== */

function fiyatFormatla(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Fiyat için bilgi alınız";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return escapeHTML(value);
    }

    return number.toLocaleString(
        "tr-TR",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    ) + " TL";
}


/* ==========================================================
   WHATSAPP
   ========================================================== */

function whatsappLinkOlustur(product) {

    const mesaj =
        `Merhaba, ${product.name || "ürün"} ürünü hakkında bilgi almak istiyorum.`;

    return (
        "https://wa.me/" +
        WHATSAPP_NUMBER +
        "?text=" +
        encodeURIComponent(mesaj)
    );
}


/* ==========================================================
   RESİM URL'Sİ
   ========================================================== */

function resimUrlHazirla(image) {

    if (!image) {
        return "";
    }

    /*
     * Öncelik:
     * category_images.image_url
     */

    if (image.image_url) {
        return image.image_url;
    }

    /*
     * image_url yoksa:
     * image_path üzerinden Supabase Storage
     * public URL oluştur.
     */

    if (
        image.image_path &&
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {

        try {

            const { data } =
                supabaseClient
                    .storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(
                        image.image_path
                    );

            if (
                data &&
                data.publicUrl
            ) {
                return data.publicUrl;
            }

        } catch (error) {

            console.warn(
                "Storage resim URL'si oluşturulamadı:",
                error
            );
        }
    }

    return "";
}


/* ==========================================================
   ÜRÜN RESMİ
   ========================================================== */

function urunResmi(
    product,
    imagesMap
) {

    const images =
        imagesMap[product.id] || [];


    /*
     * Öncelik:
     * category_images tablosundaki ilk resim
     */

    if (images.length > 0) {

        const firstImage =
            resimUrlHazirla(
                images[0]
            );

        if (firstImage) {
            return firstImage;
        }
    }


    /*
     * Alternatif:
     * products.image_url
     */

    if (product.image_url) {
        return product.image_url;
    }


    return "";
}


/* ==========================================================
   ÜRÜN KARTI
   ========================================================== */

function urunKartiOlustur(
    product,
    imagesMap
) {

    const image =
        urunResmi(
            product,
            imagesMap
        );


    const imageHTML = image

        ? `
            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(product.name || "Sur Halı ürünü") }"
                loading="lazy"
                onerror="this.style.display='none'; this.parentElement.classList.add('no-image');"
            >
          `

        : `
            <div class="product-no-image">
                <span>Sur Halı</span>
                <small>Görsel hazırlanıyor</small>
            </div>
          `;


    return `

        <article
            class="product-card"
            data-product-id="${escapeHTML(product.id)}"
        >

            <a
                href="#"
                class="product-image"
                data-product-id="${escapeHTML(product.id)}"
            >

                ${imageHTML}

            </a>


            <div class="product-info">

                <span class="product-category">
                    ${escapeHTML(product.category || "")}
                </span>


                <h3 class="product-title">
                    ${escapeHTML(product.name || "Ürün")}
                </h3>


                ${
                    product.size
                    ? `
                        <p class="product-size">
                            ${escapeHTML(product.size)}
                        </p>
                      `
                    : ""
                }


                ${
                    product.price !== null &&
                    product.price !== undefined &&
                    product.price !== ""
                    ? `
                        <div class="product-price">
                            ${fiyatFormatla(product.price)}
                        </div>
                      `
                    : `
                        <div class="product-price">
                            Bilgi için iletişime geçin
                        </div>
                      `
                }


                <a
                    href="${escapeHTML(
                        whatsappLinkOlustur(product)
                    )}"
                    class="whatsapp-button"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    WhatsApp'tan Bilgi Al
                </a>

            </div>

        </article>

    `;
}


/* ==========================================================
   ÜRÜNLERİ SUPABASE'DEN GETİR
   ========================================================== */

async function urunleriGetir() {

    console.log(
        "Supabase'den ürünler getiriliyor..."
    );


    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {

        throw new Error(
            "Supabase bağlantısı bulunamadı."
        );
    }


    /* ======================================================
       ÜRÜNLER
       ====================================================== */

    const {
        data: products,
        error: productError
    } =
        await supabaseClient
            .from("products")
            .select(`
                id,
                name,
                category,
                size,
                price,
                description,
                image_url,
                is_active,
                created_at
            `)
            .eq(
                "is_active",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (productError) {

        console.error(
            "Ürünler alınamadı:",
            productError
        );

        throw productError;
    }


    const aktifUrunler =
        products || [];


    console.log(
        aktifUrunler.length +
        " aktif ürün bulundu."
    );


    /* ======================================================
       ÜRÜN RESİMLERİ
       ====================================================== */

    const {
        data: images,
        error: imageError
    } =
        await supabaseClient
            .from("category_images")
            .select(`
                id,
                product_id,
                category,
                image_url,
                image_path,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (imageError) {

        console.warn(
            "Ürün resimleri alınamadı:",
            imageError
        );
    }


    const imagesMap = {};
    const coversMap = {};


    (images || []).forEach(
        function (image) {

            const imagePath =
                typeof image.image_path === "string"
                    ? image.image_path.replace(/^\/+/, "")
                    : "";

            const isCategoryCover =
                imagePath === CATEGORY_COVERS_PATH ||
                imagePath.startsWith(CATEGORY_COVERS_PATH + "/");

            if (isCategoryCover || !image.product_id) {

                if (image.category) {
                    if (!coversMap[image.category]) {
                        coversMap[image.category] = image;
                    }
                }
                return;
            }


            if (
                !imagesMap[image.product_id]
            ) {

                imagesMap[image.product_id] =
                    [];
            }


            imagesMap[
                image.product_id
            ].push(image);

        }
    );


    console.log(
        Object.keys(imagesMap).length +
        " ürün için resim verisi bulundu."
    );


    return {
        products: aktifUrunler,
        imagesMap: imagesMap,
        coversMap: coversMap
    };
}


/* ==========================================================
   ANA SAYFA - ÖNE ÇIKAN ÜRÜNLER
   ========================================================== */

function oneCikanUrunleriOlustur(
    products,
    imagesMap
) {

    const container =
        document.getElementById(
            "featuredProducts"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !products ||
        products.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <h2>
                    Koleksiyonlarımız hazırlanıyor
                </h2>

                <p>
                    Çok yakında ürünlerimizi
                    burada görebileceksiniz.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        products
            .map(
                function (product) {

                    return urunKartiOlustur(
                        product,
                        imagesMap
                    );

                }
            )
            .join("");


    console.log(
        "Ana sayfada " +
        products.length +
        " ürün gösterildi."
    );
}


/* ==========================================================
   KATEGORİ SLUG
   ========================================================== */

function kategoriSlugOlustur(
    category
) {

    return category
        .toLowerCase()
        .replace(
            /ğ/g,
            "g"
        )
        .replace(
            /ü/g,
            "u"
        )
        .replace(
            /ş/g,
            "s"
        )
        .replace(
            /ı/g,
            "i"
        )
        .replace(
            /ö/g,
            "o"
        )
        .replace(
            /ç/g,
            "c"
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        );
}


/* ==========================================================
   KATALOG SAYFASI
   ========================================================== */

function katalogOlustur(
    products,
    imagesMap
) {

    const container =
        document.getElementById(
            "catalogProducts"
        );


    if (!container) {
        return;
    }


    const filterButtons =
        document.querySelectorAll(
            ".category-filter"
        );


    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    const urlCategory =
        urlParams.get(
            "category"
        );


    let aktifKategori =
        urlCategory &&
        KATEGORILER.includes(
            urlCategory
        )
            ? urlCategory
            : "Halılar";


    function kategoriGoster(
        category
    ) {

        aktifKategori =
            category;


        const filtrelenmisUrunler =
            products.filter(
                function (product) {

                    return (
                        product.category ===
                        category
                    );

                }
            );


        filterButtons.forEach(
            function (button) {

                button.classList.toggle(
                    "active",
                    button.dataset.category ===
                    category
                );

            }
        );


        const title =
            document.getElementById(
                "catalogTitle"
            );


        const description =
            document.getElementById(
                "catalogDescription"
            );


        if (title) {

            title.textContent =
                category;
        }


        if (description) {

            description.textContent =
                filtrelenmisUrunler.length +
                " ürün";
        }


        if (
            filtrelenmisUrunler.length === 0
        ) {

            container.innerHTML = `

                <div class="empty-state">

                    <h2>
                        Bu kategoride henüz ürün yok
                    </h2>

                    <p>
                        Çok yakında yeni ürünler eklenecek.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            filtrelenmisUrunler
                .map(
                    function (product) {

                        return urunKartiOlustur(
                            product,
                            imagesMap
                        );

                    }
                )
                .join("");


        /*
         * URL'yi kategoriye göre güncelle.
         * Sayfa yenilenmez.
         */

        const newUrl =
            new URL(
                window.location.href
            );


        newUrl.searchParams.set(
            "category",
            category
        );


        window.history.replaceState(
            {},
            "",
            newUrl
        );


        console.log(
            category +
            " kategorisinde " +
            filtrelenmisUrunler.length +
            " ürün gösterildi."
        );
    }


    filterButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const category =
                        button.dataset.category;


                    if (
                        KATEGORILER.includes(
                            category
                        )
                    ) {

                        kategoriGoster(
                            category
                        );
                    }

                }
            );

        }
    );


    kategoriGoster(
        aktifKategori
    );
}


/* ==========================================================
   MOBİL MENÜ
   ========================================================== */

function mobilMenuHazirla() {

    const menuButton =
        document.getElementById(
            "mobileMenuButton"
        );


    const navigation =
        document.getElementById(
            "mainNavigation"
        );


    /*
     * Mevcut HTML'de farklı isim
     * kullanılmışsa alternatifleri dene.
     */

    const alternativeButton =
        document.querySelector(
            ".mobile-menu-button"
        );


    const alternativeNavigation =
        document.querySelector(
            ".site-nav"
        );


    const finalButton =
        menuButton ||
        alternativeButton;


    const finalNavigation =
        navigation ||
        alternativeNavigation;


    if (
        !finalButton ||
        !finalNavigation
    ) {
        return;
    }


    finalButton.addEventListener(
        "click",
        function () {

            finalNavigation.classList.toggle(
                "mobile-open"
            );

        }
    );


    finalNavigation
        .querySelectorAll("a")
        .forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        finalNavigation.classList.remove(
                            "mobile-open"
                        );

                    }
                );

            }
        );
}


/* ==========================================================
   KATEGORİ MENÜSÜ
   ========================================================== */

function kategoriMenusuOlustur(coversMap) {

    const menu =
        document.getElementById(
            "categoryMenu"
        );


    if (!menu) {
        return;
    }


    menu.innerHTML = "";


    KATEGORILER.forEach(
        function (category) {

            const slug =
                kategoriSlugOlustur(
                    category
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                "halilar.html?category=" +
                encodeURIComponent(
                    category
                );


            link.textContent =
                category;


            link.dataset.slug =
                slug;


            const cover = coversMap && coversMap[category];
            const coverUrl = cover ? resimUrlHazirla(cover) : null;

            if (coverUrl) {
                const img = document.createElement('img');
                img.src = coverUrl;
                img.alt = category + ' kapak';
                img.style = 'width:100%;height:60px;object-fit:cover;border-radius:6px;margin-bottom:6px;';
                link.prepend(img);
            }

            menu.appendChild(
                link
            );

        }
    );
}


/* ==========================================================
   ANA SAYFA KATEGORİ KAPAKLARI
   ========================================================== */

function kategoriKapaklariniUygula(coversMap) {

    document
        .querySelectorAll(".category-card[data-category]")
        .forEach(
            function (card) {

                const category = card.dataset.category;
                const cover = coversMap && coversMap[category];
                const coverUrl = cover ? resimUrlHazirla(cover) : "";
                const coverElement = card.querySelector(".category-cover");
                const image = coverElement && coverElement.querySelector("img");

                if (coverUrl && image) {
                    image.src = coverUrl;
                    image.alt = category + " kapak";
                    coverElement.classList.add("has-image");
                } else if (coverElement && image) {
                    image.removeAttribute("src");
                    coverElement.classList.remove("has-image");
                }
            }
        );
}


function heroGorseliniUygula() {

    const heroMedia = document.querySelector("[data-hero-media]");

    if (heroMedia) {
        heroMedia.style.backgroundImage = `url("${HERO_IMAGE_PATH}")`;
    }
}


/* ==========================================================
   ÜRÜN KARTLARINDAKİ DETAY LİNKLERİ
   ========================================================== */

function urunDetayBaglantilariniHazirla() {

    document
        .querySelectorAll(
            ".product-image[data-product-id]"
        )
        .forEach(
            function (element) {

                element.addEventListener(
                    "click",
                    function (event) {

                        /*
                         * Şimdilik ürün detay sayfası
                         * oluşturulmadığı için link davranışını
                         * engelliyoruz.
                         */

                        event.preventDefault();

                    }
                );

            }
        );
}


/* ==========================================================
   SİTEYİ BAŞLAT
   ========================================================== */

async function siteyiBaslat() {

    console.log(
        "Sur Halı ana sitesi başlatılıyor..."
    );


    const featuredContainer =
        document.getElementById(
            "featuredProducts"
        );


    const catalogContainer =
        document.getElementById(
            "catalogProducts"
        );


    try {

        /*
         * Menüleri hazırla
         */

        // kategoriMenusuOlustur(); -> move after fetching covers
        mobilMenuHazirla();
        heroGorseliniUygula();


        /*
         * Ana sayfadaki yükleniyor alanı
         */

        if (featuredContainer) {

            featuredContainer.innerHTML = `

                <div class="loading-state">
                    Ürünler yükleniyor...
                </div>

            `;
        }


        /*
         * Katalogdaki yükleniyor alanı
         */

        if (catalogContainer) {

            catalogContainer.innerHTML = `

                <div class="loading-state">
                    Ürünler yükleniyor...
                </div>

            `;
        }


        /*
         * Supabase'den verileri getir
         */

        const {
            products,
            imagesMap,
            coversMap
        } =
            await urunleriGetir();


        /* ==================================================
         * KATEGORİ MENÜSÜ
         */
        kategoriMenusuOlustur(coversMap);
        kategoriKapaklariniUygula(coversMap);

        /* ==================================================
         * ANA SAYFA
         */

        if (featuredContainer) {

            oneCikanUrunleriOlustur(
                products,
                imagesMap
            );
        }


        /*
         * KATALOG SAYFASI
         */

        if (catalogContainer) {

            katalogOlustur(
                products,
                imagesMap
            );
        }


        /*
         * Ürün kartı linkleri
         */

        urunDetayBaglantilariniHazirla();


        console.log(
            "Sur Halı ana sitesi başarıyla hazır."
        );


    } catch (error) {

        console.error(
            "Site başlatma hatası:",
            error
        );


        if (featuredContainer) {

            featuredContainer.innerHTML = `

                <div class="error-state">

                    <h2>
                        Ürünler şu anda yüklenemiyor.
                    </h2>

                    <p>
                        Lütfen daha sonra tekrar deneyin.
                    </p>

                </div>

            `;
        }


        if (catalogContainer) {

            catalogContainer.innerHTML = `

                <div class="error-state">

                    <h2>
                        Ürünler şu anda yüklenemiyor.
                    </h2>

                    <p>
                        Lütfen daha sonra tekrar deneyin.
                    </p>

                </div>

            `;
        }
    }
}


/* ==========================================================
   DOM HAZIR
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        siteyiBaslat();

    }
);
