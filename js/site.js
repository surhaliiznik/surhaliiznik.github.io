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

    // YERİNE SADECE BUNU YAZIN:
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('is_active', true)
  .order('created_at', { ascending: false });

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

    const featuredProducts =
        (products || []).filter(function (product) {
            return product.is_featured === true;
        });

    const featuredSection = container.closest(".featured-section");

    if (featuredProducts.length === 0) {
        if (featuredSection) {
            featuredSection.hidden = true;
        }
        return;
    }

    if (featuredSection) {
        featuredSection.hidden = false;
    }


    if (
        !products ||
        products.length === 0
    ) {

        if (products && products.length > 0) {
  container.innerHTML = products.map(product => {
    const imageUrl = (product.image_url && product.image_url.trim() !== '') 
      ? product.image_url 
      : 'https://via.placeholder.com/400x300?text=Sur+Hali';

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image">
          <img src="${imageUrl}" alt="${product.name || 'Halı Ürünü'}" loading="lazy">
          ${product.badge_text ? `<span class="badge">${product.badge_text}</span>` : ''}
        </div>
        <div class="product-info">
          <h3>${product.name || 'İsimsiz Ürün'}</h3>
          <p class="category">${product.category || ''}</p>
          <p class="price">${product.price ? product.price + ' TL' : 'Fiyat Sorunuz'}</p>
          <button class="add-to-cart-btn">Sepete Ekle</button>
        </div>
      </div>
    `;
  }).join('');
} else {
  container.innerHTML = `
    <div class="empty-state">
      <h2>Koleksiyonlarımız hazırlanıyor</h2>
      <p>Çok yakında ürünlerimizi burada görebileceksiniz.</p>
    </div>
  `;
}

        `;

        return;
    }


    container.innerHTML =
        featuredProducts
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
        featuredProducts.length +
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

    const modal = document.getElementById("productDetailModal");
    const products = window.surHaliProducts || {};

    function detayModaliniOlustur() {
        if (modal) return modal;
        const element = document.createElement("div");
        element.id = "productDetailModal";
        element.className = "product-detail-modal";
        element.innerHTML = '<div class="product-detail-dialog" role="dialog" aria-modal="true"><button type="button" class="product-detail-close" aria-label="Kapat">&times;</button><div class="product-detail-body"></div></div>';
        document.body.appendChild(element);
        element.querySelector(".product-detail-close").addEventListener("click", function () { element.classList.remove("is-open"); });
        element.addEventListener("click", function (event) { if (event.target === element) element.classList.remove("is-open"); });
        return element;
    }

    function jsonValue(value, fallback) {
        if (Array.isArray(value) || (value && typeof value === "object")) return value;
        if (typeof value === "string") { try { return JSON.parse(value); } catch (error) { return fallback; } }
        return fallback;
    }

    function urunDetayiniAc(product) {
        const detailModal = detayModaliniOlustur();
        const body = detailModal.querySelector(".product-detail-body");
        const features = jsonValue(product.features, {});
        const sizes = jsonValue(product.sizes, []);
        const sizeOptions = Array.isArray(sizes) ? sizes : [];
        const initialSize = sizeOptions[0] || { size: product.size || "Standart", price: product.price || 0 };
        const featureLabels = { point: "İlme / Point", thickness: "Kalınlık", weight: "Ağırlık", material: "Malzeme", color: "Renk", robot: "Robot Süpürge Uyumu" };
        const featureHtml = Object.keys(featureLabels).filter(function (key) { return features[key] !== undefined && features[key] !== ""; }).map(function (key) { const value = key === "robot" ? (features[key] === true || features[key] === "true" ? "Uygun" : "Uygun değil") : features[key]; return `<li>✓ ${escapeHTML(featureLabels[key])}: ${escapeHTML(value)}</li>`; }).join("");
        const optionsHtml = sizeOptions.map(function (item, index) { return `<option value="${index}">${escapeHTML(item.size || item.label || "Ebat")} - ${fiyatFormatla(item.price)}</option>`; }).join("");
        body.innerHTML = `<div class="product-detail-media"><img src="${escapeHTML(urunResmi(product, window.surHaliImages || {}))}" alt="${escapeHTML(product.name || "Ürün")}">${product.is_featured_badge && product.badge_text ? `<span class="product-badge">${escapeHTML(product.badge_text)}</span>` : ""}</div><div class="product-detail-copy"><span class="product-detail-category">${escapeHTML(product.category || "")}</span><h2>${escapeHTML(product.name || "Ürün")}</h2><div class="product-rating">★★★★★ <span>Değerlendirme</span></div><div class="product-detail-price" data-detail-price>${fiyatFormatla(initialSize.price)}</div><ul class="product-features">${featureHtml}</ul><label class="product-option-label">Ebat<select class="product-size-select">${optionsHtml || `<option value="0">${escapeHTML(initialSize.size)}</option>`}</select></label><div class="product-quantity"><button type="button" data-quantity="decrease">−</button><span data-quantity-value>1</span><button type="button" data-quantity="increase">+</button></div><button type="button" class="primary-button add-to-cart-button">Sepete Ekle</button><p class="cart-message" aria-live="polite"></p></div>`;
        let quantity = 1;
        const select = body.querySelector(".product-size-select");
        const price = body.querySelector("[data-detail-price]");
        const quantityValue = body.querySelector("[data-quantity-value]");
        select.addEventListener("change", function () { const selected = sizeOptions[Number(select.value)] || initialSize; price.textContent = fiyatFormatla(selected.price); });
        body.querySelector('[data-quantity="decrease"]').addEventListener("click", function () { quantity = Math.max(1, quantity - 1); quantityValue.textContent = quantity; });
        body.querySelector('[data-quantity="increase"]').addEventListener("click", function () { quantity += 1; quantityValue.textContent = quantity; });
        body.querySelector(".add-to-cart-button").addEventListener("click", function (event) { event.stopPropagation(); const selected = sizeOptions[Number(select.value)] || initialSize; const cart = JSON.parse(localStorage.getItem("surHaliCart") || "[]"); cart.push({ productId: product.id, name: product.name, size: selected.size || selected.label, price: selected.price, quantity: quantity }); localStorage.setItem("surHaliCart", JSON.stringify(cart)); body.querySelector(".cart-message").textContent = "Ürün seçtiğiniz ebat ve fiyatla sepete eklendi."; });
        detailModal.classList.add("is-open");
    }

    document
        .querySelectorAll(
            ".product-card[data-product-id]"
        )
        .forEach(
            function (element) {

                element.addEventListener(
                    "click",
                    function (event) {

                        if (event.target.closest(".whatsapp-button")) {
                            return;
                        }
                        event.preventDefault();
                        const product = products[element.dataset.productId];
                        if (product) urunDetayiniAc(product);
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

        window.surHaliProducts = {};
        products.forEach(function (product) {
            window.surHaliProducts[product.id] = product;
        });
        window.surHaliImages = imagesMap;


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
