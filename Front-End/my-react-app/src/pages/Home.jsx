import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../pages/Home.css";
import { useCartFavorites } from "../context/CartFavoritesContext";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
)}/api/airflow`;

// Normalize availability values across stores
const AVAILABLE_STATUSES = new Set([
  "in stock",
  "en stock",
]);

const normalizeAvailability = (value) => (value || "").toString().trim().toLowerCase();
const isAvailableStatus = (value) => {
  const normalized = normalizeAvailability(value);
  if (!normalized) return false;
  if (AVAILABLE_STATUSES.has(normalized)) return true;
  if (normalized.startsWith("sur commande")) return true; // catch variants like "sur commande 72h"
  return false;
};

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [storeCounts, setStoreCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false);
  const [hoveredStep, setHoveredStep] = useState('rechercher');
  const [searchQuery, setSearchQuery] = useState('');
  const { toggleFavorite, isFavorite, addToCart } = useCartFavorites();

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to products page with search query
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Handle popular search clicks
  const handlePopularSearch = (query) => {
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  // Image mapping for each step
  const stepImages = {
    rechercher: '/rechercheHome.png',
    comparer: '/comparer.png',
    'bon-choix': '/choix.png',
    paiement: '/payer.png',
    gestion: '/gerer.png'
  };

  const formatStoreCount = (storeKey) => {
    const key = (storeKey || "").toLowerCase();
    const value = storeCounts[key];
    return typeof value === "number" && !Number.isNaN(value) ? `${value} produits` : "— produits";
  };

  // Categories with Font Awesome icons
  const categoryIcons = {
    Visage: "fa-solid fa-face-smile",
    Beauté: "fa-solid fa-spa",
    "Soin": "fa-solid fa-droplet",
    Corps: "fa-solid fa-person",
    Capillaire: "fa-solid fa-scissors",
    Solaire: "fa-solid fa-sun",
    "Bébé & Maman": "fa-solid fa-baby",
    "Nature & Bio": "fa-solid fa-leaf",
    "Compléments alimentaires": "fa-solid fa-pills",
    Homme: "fa-solid fa-user-tie",
    Hygiène: "fa-solid fa-soap",
    Électronique: "fa-solid fa-mobile-screen",
    Informatique: "fa-solid fa-laptop",
    Maison: "fa-solid fa-house",
    Jardin: "fa-solid fa-seedling",
    Sport: "fa-solid fa-dumbbell",
    Vêtements: "fa-solid fa-shirt",
    Chaussures: "fa-solid fa-shoe-prints",
  };

  // Fetch products from backend (real products from all stores)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const stores = ['chillandlit', 'mytek', 'spacenet', 'tunisianet', 'parashop'];
        let allProducts = [];

        // Fetch featured products (limit 4) from each store
        for (const store of stores) {
          try {
            const response = await fetch(`${API_BASE}/products/store/${store}/?limit=4`);
            if (response.ok) {
              const data = await response.json();
              const storeProducts = data.products || [];

              // Transform API response to match component's expected format
              const transformedProducts = storeProducts.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category || 'Sans catégorie',
                price: p.current_price || 0,
                image: p.images_links && p.images_links.length > 0 ? p.images_links[0] : null,
                store: store.charAt(0).toUpperCase() + store.slice(1),
                prev_price: p.prev_price,
                availability: p.availability,
                product_link: p.product_link
              }));

              allProducts = [...allProducts, ...transformedProducts];
            }
          } catch (err) {
            console.error(`Error fetching products from ${store}:`, err);
          }
        }

        const availableProducts = allProducts.filter((p) => isAvailableStatus(p.availability));

        if (availableProducts.length > 0) {
          setProducts(availableProducts);

          // Extract unique categories from fetched products
          const uniqueCategories = [...new Set(availableProducts.map(p => p.category))];
          setCategories(uniqueCategories.slice(0, 12)); // Show first 12 categories
        } else {
          // Fallback to dummy products if API fails
          setProducts(getDummyProducts());
          setCategories(getDummyCategories());
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        // Fallback: Create dummy products for demo
        setProducts(getDummyProducts());
        setCategories(getDummyCategories());
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        setSearchSuggestionsLoading(true);
        const res = await fetch(
          `${API_BASE}/unique-products/search/?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const names = (data.products || []).map((p) => p.canonical_name).filter(Boolean);
        const unique = Array.from(new Set(names)).slice(0, 6);
        setSearchSuggestions(unique);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching search suggestions:", err);
        }
      } finally {
        setSearchSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
    return () => controller.abort();
  }, [searchQuery]);

  useEffect(() => {
    const fetchStoreCounts = async () => {
      try {
        const response = await fetch(`${API_BASE}/products/store-counts/`);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const data = await response.json();
        const normalizedCounts = Object.entries(data.store_counts || {}).reduce(
          (acc, [key, value]) => {
            const normalizedKey = (key || "").toLowerCase();
            if (normalizedKey) {
              acc[normalizedKey] = Number(value);
            }
            return acc;
          },
          {}
        );
        setStoreCounts(normalizedCounts);
      } catch (error) {
        console.error("Error fetching store counts:", error);
      }
    };

    fetchStoreCounts();
  }, []);

  const getDummyProducts = () => [
    {
      id: 1,
      name: "Produit Premium Beauté",
      category: "Beauté",
      price: 45.99,
      image: "https://via.placeholder.com/200?text=Beauté+Produit",
      store: "Parashop",
      availability: "In Stock",
    },
    {
      id: 2,
      name: "Soin Visage Hydratant",
      category: "Soin",
      price: 35.50,
      image: "https://via.placeholder.com/200?text=Soin+Visage",
      store: "Mytek",
      availability: "In Stock",
    },
    {
      id: 3,
      name: "Shampooing Bio Naturel",
      category: "Capillaire",
      price: 28.00,
      image: "https://via.placeholder.com/200?text=Shampooing",
      store: "Tunisianet",
      availability: "In Stock",
    },
    {
      id: 4,
      name: "Crème Solaire SPF 50",
      category: "Solaire",
      price: 32.99,
      image: "https://via.placeholder.com/200?text=Solaire",
      store: "Spacenet",
      availability: "In Stock",
    },
  ];

  const getDummyCategories = () => [
    "Beauté", "Soin", "Capillaire", "Solaire", "Bébé & Maman", "Nature & Bio",
    "Hygiène", "Électronique", "Vêtements", "Chaussures", "Sport", "Maison"
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section
        className="hero-section"
      >
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <i className="fas fa-info-circle"></i> En savoir plus sur HubShop.tn
          </div>
          <h1 className="hero-title">Votre Médiateur Intelligent d'Achat en Tunisie.</h1>

          {/* Search Bar */}
          <form className="search-container" onSubmit={handleSearch}>
            <input
              type="text"
              className="search-input"
              placeholder="pc portable"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="search-button">
              <i className="fas fa-search"></i> Rechercher
            </button>
            {searchSuggestions.length > 0 && (
              <div className="search-suggestions">
                {searchSuggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="search-suggestion-item"
                    onClick={() => {
                      setSearchQuery(s);
                      navigate(`/products?search=${encodeURIComponent(s)}`);
                    }}
                  >
                    {s}
                  </button>
                ))}
                {searchSuggestionsLoading && (
                  <div className="search-suggestion-meta">Chargement...</div>
                )}
              </div>
            )}
          </form>

          {/* Popular Searches */}
          <div className="popular-searches">
            <span>Recherches fréquentes:</span>
            <a href="#!" onClick={(e) => {
              e.preventDefault();
              handlePopularSearch('sacs à main pour femmes');
            }}>sacs à main pour femmes</a>
            <a href="#!" onClick={(e) => {
              e.preventDefault();
              handlePopularSearch('chaussures pour hommes');
            }}>chaussures pour hommes</a>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="section-header">
          <h2>Explorez les catégories</h2>
          <p>Découvrez nos produits par catégorie</p>
        </div>

        <div className="categories-wrapper">
          <button
            className="categories-arrow categories-arrow-left"
            onClick={() => {
              const grid = document.querySelector('.categories-grid');
              grid.scrollBy({ left: -300, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="categories-grid">
            {categories.map((category) => (
              <div key={category} className="category-card">
                <div className="category-icon">
                  <i className={categoryIcons[category] || "fa-solid fa-box"}></i>
                </div>
                <h3 className="category-name">{category}</h3>
                <p className="category-description">
                  {products.filter(p => p.category === category).length} produits
                </p>
                <a href="#products" className="category-link">Voir plus →</a>
              </div>
            ))}
          </div>

          <button
            className="categories-arrow categories-arrow-right"
            onClick={() => {
              const grid = document.querySelector('.categories-grid');
              grid.scrollBy({ left: 300, behavior: 'smooth' });
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section" id="products">
        <div className="section-header">
          <h2>Produits en Vedette</h2>
          <p>Les meilleures offres du moment</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Chargement des produits...</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.length > 0 ? (
              products.map((product) => {
                const hasDiscount = product.prev_price && product.prev_price > product.price;
                const discountPercent = hasDiscount
                  ? Math.round(((product.prev_price - product.price) / product.prev_price) * 100)
                  : 0;
                const available = isAvailableStatus(product.availability);

                return (
                  <div key={product.id} className="product-card">
                    <div className="product-image">
                      <img
                        src={product.image || "https://via.placeholder.com/200"}
                        alt={product.name}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/200?text=No+Image";
                        }}
                      />
                      <div className="store-badge">{product.store}</div>
                      {hasDiscount && (
                        <div className="discount-badge">-{discountPercent}%</div>
                      )}
                      {product.availability && (
                        <div className={`availability-badge ${available ? 'in-stock' : 'out-of-stock'}`}>
                          {available ? (product.availability || "Disponible") : (product.availability || "Indisponible")}
                        </div>
                      )}
                    </div>
                    <div className="product-info">
                      <h4 className="product-name">{product.name}</h4>
                      <p className="product-category">{product.category}</p>
                      <div className="price-section">
                        <span className="product-price">{product.price}DT</span>
                        {hasDiscount && (
                          <span className="original-price">{product.prev_price}DT</span>
                        )}
                      </div>
                      <div className="product-footer">
                        <button
                          className={`favorite-btn ${isFavorite(product.id, product.store) ? 'is-favorite' : ''}`}
                          onClick={() => toggleFavorite(product)}
                          title={isFavorite(product.id, product.store) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <i className={`fas fa-heart ${isFavorite(product.id, product.store) ? 'filled' : ''}`}></i>
                        </button>
                        <button
                          className="add-to-cart-btn"
                          onClick={() => addToCart(product, 1)}
                          title="Ajouter au panier"
                        >
                          <i className="fas fa-shopping-cart"></i>
                        </button>
                        <a
                          href={product.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-product-btn"
                          title="Voir le produit"
                        >
                          <i className="fas fa-external-link-alt"></i>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-products">Aucun produit disponible pour le moment</p>
            )}
          </div>
        )}
      </section>

      {/* Store Section */}
      <section className="stores-section">
        <div className="section-header">
          <h2>Nos Fournisseurs Partenaires</h2>
          <p>Produits de qualité garantie</p>
        </div>

        <div className="stores-grid">
          <div className="store-card">
            <div className="store-logo">
              <img
                src="https://www.parashop.tn/image/cache/catalog/logo-parashop-250x100-250x100.png.webp"
                alt="Parashop"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="store-icon">🛍️</div>';
                }}
              />
            </div>
            <h3>Parashop</h3>
            <p>Beauté et soins premium</p>
            <span className="product-count">{formatStoreCount("parashop")}</span>
          </div>

          <div className="store-card">
            <div className="store-logo">
              <img
                src="https://mk-media.mytek.tn/media/logo/stores/1/LOGO-MYTEK-176PX-INVERSE.png"
                alt="Mytek"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="store-icon">🏪</div>';
                }}
              />
            </div>
            <h3>Mytek</h3>
            <p>Électronique et informatique</p>
            <span className="product-count">{formatStoreCount("mytek")}</span>
          </div>

          <div className="store-card">
            <div className="store-logo">
              <img
                src="https://www.tunisianet.com.tn/img/tunisianet-logo-1611064619.jpg"
                alt="Tunisianet"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="store-icon">🏬</div>';
                }}
              />
            </div>
            <h3>Tunisianet</h3>
            <p>Variété de produits</p>
            <span className="product-count">{formatStoreCount("tunisianet")}</span>
          </div>

        <div className="store-card">
          <div className="store-logo">
            <img
              src="https://spacenet.tn/img/logo-desktop.svg"
              alt="Spacenet"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="store-icon">🎯</div>';
                }}
              />
          </div>
          <h3>Spacenet</h3>
          <p>Technologies modernes</p>
          <span className="product-count">{formatStoreCount("spacenet")}</span>
        </div>

        <div className="store-card">
          <div className="store-logo">
            <img
              src="https://chillandlit.tn/img/chilllit-logo-1622567098.jpg"
              alt="Chillandlit"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<div class="store-icon">C&L</div>';
              }}
            />
          </div>
          <h3>Chill&Lit</h3>
          <p>Maison et lifestyle</p>
          <span className="product-count">{formatStoreCount("chillandlit")}</span>
        </div>
      </div>
    </section>

      {/* How It Works Section - Alibaba Style */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          <div className="how-it-works-wrapper">
            <div className="how-it-works-left">
              <h2 className="how-it-works-title">Optimisez vos commandes en un seul et même endroit</h2>

              <div className="how-it-works-timeline">
                <div className="how-it-works-item" data-step="rechercher" data-active={hoveredStep === 'rechercher'} onMouseEnter={() => setHoveredStep('rechercher')}>
                  <div className="how-it-works-icon-wrapper">
                    <i className="fas fa-search"></i>
                  </div>
                  <div className="how-it-works-text">
                    <h3>Rechercher</h3>
                    <p className="item-title">Recherchez et filtrez parmi des millions d'offres</p>
                    <p className="item-description">Recherchez et filtrez parmi des milliers de produits et trouvez les offres qui correspondent à vos besoins.</p>
                  </div>
                </div>

                <div className="how-it-works-item" data-step="comparer" data-active={hoveredStep === 'comparer'} onMouseEnter={() => setHoveredStep('comparer')}>
                  <div className="how-it-works-icon-wrapper">
                    <i className="fas fa-balance-scale"></i>
                  </div>
                  <div className="how-it-works-text">
                    <h3>Comparer</h3>
                    <p className="item-title">Comparez les prix et caractéristiques</p>
                    <p className="item-description">Comparez les prix, les caractéristiques et les avis pour faire le meilleur choix.</p>
                  </div>
                </div>

                <div className="how-it-works-item" data-step="bon-choix" data-active={hoveredStep === 'bon-choix'} onMouseEnter={() => setHoveredStep('bon-choix')}>
                  <div className="how-it-works-icon-wrapper">
                    <i className="fas fa-thumbs-up"></i>
                  </div>
                  <div className="how-it-works-text">
                    <h3>Faites le bon choix</h3>
                    <p className="item-title">Évaluez la qualité des produits</p>
                    <p className="item-description">Évaluez la qualité des produits et les capacités des fournisseurs grâce à des évaluations vérifiées.</p>
                  </div>
                </div>

                <div className="how-it-works-item" data-step="paiement" data-active={hoveredStep === 'paiement'} onMouseEnter={() => setHoveredStep('paiement')}>
                  <div className="how-it-works-icon-wrapper">
                    <i className="fas fa-lock"></i>
                  </div>
                  <div className="how-it-works-text">
                    <h3>Réglez en toute confiance</h3>
                    <p className="item-title">Payez de manière sécurisée</p>
                    <p className="item-description">Payez votre commande de manière sécurisée avec plusieurs méthodes de paiement disponibles.</p>
                  </div>
                </div>

                <div className="how-it-works-item" data-step="gestion" data-active={hoveredStep === 'gestion'} onMouseEnter={() => setHoveredStep('gestion')}>
                  <div className="how-it-works-icon-wrapper">
                    <i className="fas fa-cogs"></i>
                  </div>
                  <div className="how-it-works-text">
                    <h3>Gérez facilement</h3>
                    <p className="item-title">Suivez vos commandes et paiements</p>
                    <p className="item-description">Vérifiez l'état de vos commandes, suivez vos paiements et contactez le support client.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="how-it-works-right">
              <div className="how-it-works-showcase">
                <img
                  className="showcase-image"
                  src={stepImages[hoveredStep]}
                  alt="How it works"
                  id="howitworksImage"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Pourquoi Nous Choisir?</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">✓</div>
            <h3>Produits Authentiques</h3>
            <p>Tous nos produits proviennent de fournisseurs vérifiés et de confiance</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>Livraison Rapide</h3>
            <p>Livraison dans les meilleurs délais sur tout le territoire tunisien</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Paiement Sécurisé</h3>
            <p>Vos transactions sont protégées par les meilleures technologies</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📞</div>
            <h3>Service Client 24/7</h3>
            <p>Notre équipe est disponible pour répondre à vos questions</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Prêt à Commencer?</h2>
          <p>Rejoignez des milliers de clients satisfaits</p>
          <Link to="/signup" className="cta-button">
            S'inscrire Maintenant
          </Link>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="section-header">
          <h2>Nos Chiffres</h2>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>50000 +</h3>
            <p>Produits</p>
          </div>

          <div className="stat-card">
            <h3>5</h3>
            <p>Partenaires</p>
          </div>

          <div className="stat-card">
            <h3>100%</h3>
            <p>Authentique</p>
          </div>

          <div className="stat-card">
            <h3>Tunisia</h3>
            <p>Couverture</p>
          </div>
        </div>
      </section>
    </div>
  );
}
