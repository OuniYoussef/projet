import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../pages/Products.css";
import { useCartFavorites } from "../context/CartFavoritesContext";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
)}/api/airflow`;

export default function Products() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const blurTimer = useRef(null);
  const { toggleFavorite, isFavorite, addToCart } = useCartFavorites();

  // Sync search query with URL params
  useEffect(() => {
    const query = searchParams.get("search") || "";
    setSearchQuery(query);
  }, [searchParams]);

  // Fetch products with scoring on name/description/category/store
  useEffect(() => {
    const fetchProducts = async () => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setProducts([]);
        setHasFetched(false);
        setIsFetching(false);
        return;
      }
      try {
        setIsFetching(true);
        setError(null);
        const response = await fetch(
          `${API_BASE}/unique-products/search/?q=${encodeURIComponent(trimmed)}&limit=80`
        );
        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }
        const data = await response.json();
        const results = data.products || [];
        const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

        const transformed = results.map((p) => {
          const metadata = p.metadata_snapshot || {};
          const offers = metadata.products || [];
          let bestOffer = null;
          offers.forEach((offer) => {
            if (offer.current_price == null) return;
            if (!bestOffer || offer.current_price < bestOffer.current_price) {
              bestOffer = offer;
            }
          });

          const description = p.canonical_description || "";
          const store = bestOffer?.store_name || p.canonical_store_name || "Multi-store";

          const item = {
            id: p.id,
            name: p.canonical_name || "",
            description,
            category: p.canonical_category || "Sans categorie",
            subcategory: p.canonical_subcategory,
            sub_subcategory: p.canonical_sub_subcategory,
            price: bestOffer?.current_price ?? 0,
            prev_price: bestOffer?.prev_price,
            image:
              (p.canonical_images_links && p.canonical_images_links[0]) ||
              (bestOffer?.images_links && bestOffer.images_links[0]) ||
              null,
            store,
            availability: bestOffer?.availability,
            product_link: bestOffer?.product_link,
          };

          const haystack = {
            name: item.name.toLowerCase(),
            description: description.toLowerCase(),
            category: (item.category || "").toLowerCase(),
            subcategory: (item.subcategory || "").toLowerCase(),
            sub_subcategory: (item.sub_subcategory || "").toLowerCase(),
            store: (store || "").toLowerCase(),
          };

          let score = 0;
          terms.forEach((term) => {
            const termScore = (text, weight) =>
              text.includes(term) ? weight * (1 + text.split(term).length - 1) : 0;
            score += termScore(haystack.name, 3);
            score += termScore(haystack.description, 2);
            score += termScore(haystack.category, 1.2);
            score += termScore(haystack.subcategory, 1);
            score += termScore(haystack.sub_subcategory, 0.9);
            score += termScore(haystack.store, 0.8);
          });

          return { ...item, score };
        });

        const scored = transformed
          .filter((item) => item.score > 0 || terms.length === 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.price - b.price;
          })
          .map(({ score, ...rest }) => rest);

        setProducts(scored.length > 0 ? scored : transformed.map(({ score, ...rest }) => rest));
        setHasFetched(true);
      } catch (err) {
        console.error("Error searching products:", err);
        setError("Une erreur est survenue lors de la recherche.");
        setProducts([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProducts();
  }, [searchQuery]);

  // Suggestions while typing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        setSuggestionsLoading(true);
        const res = await fetch(
          `${API_BASE}/unique-products/search/?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        const names = (data.products || []).map((p) => p.canonical_name).filter(Boolean);
        const unique = Array.from(new Set(names)).slice(0, 6);
        setSuggestions(unique);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Suggestion fetch failed", err);
        }
      } finally {
        setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [searchQuery]);

  // Sort products based on selected option
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case "price-low":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "relevance":
      default:
        break;
    }
    return sorted;
  }, [products, sortBy]);

  const handleNewSearch = (e) => {
    e.preventDefault();
    const newQuery = searchQuery.trim();
    if (newQuery) {
      navigate(`/products?search=${encodeURIComponent(newQuery)}`);
    }
  };

  const handleSuggestionClick = useCallback(
    (value) => {
      setSearchQuery(value);
      navigate(`/products?search=${encodeURIComponent(value)}`);
      setSuggestionsOpen(false);
    },
    [navigate]
  );

  const handleCardClick = (productId) => {
    navigate(`/products/${productId}`);
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart(product);
  };

  const handleToggleFavorite = (e, product) => {
    e.stopPropagation();
    toggleFavorite(product);
  };

  return (
    <div className="products-container">
      {/* Search Bar */}
      <div className="products-search-section">
        <div className="products-search-bar-wrapper">
          <h1>{"R\u00e9sultats de recherche"}</h1>
          <form className="products-search-form" onSubmit={handleNewSearch}>
            <input
              type="text"
              name="search"
              className="products-search-input"
              placeholder="Rechercher d'autres produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              onFocus={() => {
                if (blurTimer.current) clearTimeout(blurTimer.current);
                setSuggestionsOpen(true);
              }}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setSuggestionsOpen(false), 120);
              }}
            />
            <button type="submit" className="products-search-button">
              <i className="fas fa-search"></i> Rechercher
            </button>
            {suggestionsOpen && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className="search-suggestion-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSuggestionClick(s)}
                  >
                    {s}
                  </button>
                ))}
                {suggestionsLoading && <div className="search-suggestion-meta">Chargement...</div>}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Results Info */}
      <div className="products-info">
        <div className="products-results-info">
          {searchQuery && (
            <p>
              {"R\u00e9sultats pour"} <strong>"{searchQuery}"</strong> ({sortedProducts.length}{" "}
              produits {"trouv\u00e9s"})
            </p>
          )}
          {isFetching && hasFetched && (
            <p className="search-suggestion-meta" style={{ marginTop: 4 }}>
              {"Mise \u00e0 jour des r\u00e9sultats..."}
            </p>
          )}
          {error && <p className="error-text">{error}</p>}
        </div>

        {/* Sort Options */}
        {sortedProducts.length > 0 && (
          <div className="products-sort">
            <label>Trier par:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="relevance">Pertinence</option>
              <option value="price-low">{"Prix: Bas \u00e0 Haut"}</option>
              <option value="price-high">{"Prix: Haut \u00e0 Bas"}</option>
              <option value="name">Nom</option>
            </select>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {!hasFetched && isFetching ? (
        <div className="products-loading">
          <p>Chargement des produits...</p>
        </div>
      ) : sortedProducts.length > 0 ? (
        <div className="products-grid">
          {sortedProducts.map((product) => {
            const favoriteActive = isFavorite(product.id, product.store);
            return (
              <div
                key={`${product.id}`}
                className="product-card"
                onClick={() => handleCardClick(product.id)}
              >
                <div className="product-image-container">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/200?text=No+Image";
                      }}
                    />
                  ) : (
                    <div className="product-no-image">Pas d'image</div>
                  )}
                  <div className="product-store-badge">{product.store}</div>
                </div>

                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-category">{product.category}</p>

                  <div className="product-price-section">
                    <span className="product-price">{product.price.toFixed(2)} DT</span>
                    {product.prev_price && (
                      <span className="product-prev-price">
                        {product.prev_price.toFixed(2)} DT
                      </span>
                    )}
                  </div>

                  <div className="product-actions">
                    <button
                      className="btn-add-to-cart"
                      onClick={(e) => handleAddToCart(e, product)}
                    >
                      <i className="fas fa-shopping-cart"></i> Ajouter
                    </button>
                    <button
                      className={`btn-favorite ${favoriteActive ? "active" : ""}`}
                      onClick={(e) => handleToggleFavorite(e, product)}
                    >
                      <i className={`fas fa-heart ${favoriteActive ? "fas" : "far"}`}></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="products-no-results">
          <i className="fas fa-search"></i>
          <h2>{"Aucun produit trouv\u00e9"}</h2>
          {error && <p className="error-text">{error}</p>}
          {searchQuery && (
            <p>
              {"Nous n'avons trouv\u00e9 aucun produit correspondant \u00e0 "} "{searchQuery}".
              {" Veuillez essayer une autre recherche."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
