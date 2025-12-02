import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import "../pages/Products.css";
import { useCartFavorites } from "../context/CartFavoritesContext";

const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(
  /\/$/,
  ""
)}/api/airflow`;

const currency = (value) => {
  if (value == null || isNaN(Number(value))) return "N/A";
  return `${Number(value).toFixed(2)} DT`;
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite } = useCartFavorites();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [cartPulse, setCartPulse] = useState({});
  const [favoritePulse, setFavoritePulse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE}/unique-products/${id}/`);
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const data = await response.json();
        setProduct(data.product);
      } catch (err) {
        console.error("Error fetching product detail:", err);
        setError("Impossible de charger ce produit.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const { images, offers } = useMemo(() => {
    const safeProduct = product || {};
    const safeImages = Array.isArray(safeProduct.canonical_images_links)
      ? safeProduct.canonical_images_links
      : [];
    const offersRaw = Array.isArray(safeProduct?.metadata_snapshot?.products)
      ? safeProduct.metadata_snapshot.products
      : [];

    const mappedOffers = offersRaw.map((offer) => {
      const imgs = Array.isArray(offer.images_links) ? offer.images_links : [];
      return {
        ...offer,
        displayImage: imgs[0] || (safeImages.length > 0 ? safeImages[0] : null),
      };
    });

    return { images: safeImages, offers: mappedOffers };
  }, [product]);

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id]);

  const handlePrevImage = () => {
    if (!images.length) return;
    setActiveImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = () => {
    if (!images.length) return;
    setActiveImage((prev) => (prev + 1) % images.length);
  };

  const triggerPulse = (id, setter) => {
    setter((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setter((prev) => ({ ...prev, [id]: false })), 450);
  };

  if (loading) {
    return (
      <div className="products-container">
        <p>Chargement du produit... (id: {id})</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="products-container">
        <p>{error || "Produit introuvable."}</p>
        <button className="btn-add-to-cart" onClick={() => navigate(-1)}>
          Retour
        </button>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
          Debug ID: {id}
          {"\n"}Product object: {JSON.stringify(product, null, 2)}
        </pre>
      </div>
    );
  }

  const bestOffer = offers.reduce((best, offer) => {
    if (offer.current_price == null) return best;
    if (!best || offer.current_price < best.current_price) {
      return offer;
    }
    return best;
  }, null);

  const bestAvailability = (bestOffer?.availability || "").toLowerCase();
  const bestAvailabilityClass = bestAvailability.includes("stock") ? "available" : "unavailable";
  const bestAvailabilityText = bestOffer?.availability || "Disponibilite inconnue";
  const hasImages = images.length > 0;
  const displayImage = hasImages
    ? images[Math.min(activeImage, images.length - 1)]
    : "https://via.placeholder.com/600?text=No+Image";

  return (
    <div className="products-container product-detail">
      <div className="product-detail-breadcrumb">
        <Link to="/products">Produits</Link> / <span>{product.canonical_name}</span>
      </div>

      <div className="product-detail-hero">
        <div className="product-gallery-card">
          <div className="product-image-stage">
            <img
              src={displayImage}
              alt={product.canonical_name}
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/600?text=No+Image";
              }}
            />
            {hasImages && images.length > 1 && (
              <>
                <button
                  className="image-nav prev"
                  onClick={handlePrevImage}
                  aria-label="Image precedente"
                >
                  {"<"}
                </button>
                <button
                  className="image-nav next"
                  onClick={handleNextImage}
                  aria-label="Image suivante"
                >
                  {">"}
                </button>
              </>
            )}
            {bestOffer && (
              <div className="price-chip">
                <span>{currency(bestOffer.current_price)}</span>
                {bestOffer.store_name && <small>{bestOffer.store_name}</small>}
              </div>
            )}
          </div>
          <div className="image-dots">
            {(hasImages ? images : [displayImage]).map((_, idx) => (
              <button
                key={idx}
                className={`dot ${idx === activeImage ? "active" : ""}`}
                onClick={() => setActiveImage(idx)}
                aria-label={`Afficher l'image ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="product-detail-info">
          <h1>{product.canonical_name}</h1>
          <p className="product-category">
            {product.canonical_category || "Sans categorie"}
            {product.canonical_subcategory ? ` > ${product.canonical_subcategory}` : ""}
            {product.canonical_sub_subcategory ? ` > ${product.canonical_sub_subcategory}` : ""}
          </p>

          {bestOffer ? (
            <div className="product-price-section">
              <span className="product-price">{currency(bestOffer.current_price)}</span>
              {bestOffer.prev_price && (
                <span className="product-prev-price">{currency(bestOffer.prev_price)}</span>
              )}
              <div className={`offer-availability ${bestAvailabilityClass}`}>
                {bestAvailabilityText}
              </div>
            </div>
          ) : (
            <div className="product-price-section">
              <span className="product-price">Prix non disponible</span>
            </div>
          )}

          <p className="product-description">
            {product.canonical_description || "Pas de description disponible."}
          </p>

          {bestOffer && bestOffer.product_link && (
            <a
              href={bestOffer.product_link}
              target="_blank"
              rel="noopener noreferrer"
              className="view-product-btn primary icon-only"
              aria-label={`Voir sur ${bestOffer.store_name || "le magasin"}`}
            >
              <img src="/eye.png" alt="Voir l'offre" className="view-icon" />
            </a>
          )}
        </div>
      </div>

      <div className="product-detail-offers full-bleed">
        <div className="product-detail-offers-inner">
          <div className="offers-header">
            <h2>Offres par magasin</h2>
            <p>Comparez rapidement les prix et disponibilites pour ce produit.</p>
          </div>
        </div>
        <div className="product-detail-offers-inner">
          <div className="offers-grid wide">
            {offers.map((offer, idx) => {
              const offerId = offer.product_id || `${product.id}-${idx}`;
              const availabilityText = offer.availability || "Disponibilite inconnue";
              const availabilityClass = availabilityText.toLowerCase().includes("stock")
                ? "available"
                : "unavailable";
              const favoritePayload = {
                id: offerId,
                name: offer.name || product.canonical_name,
                price: offer.current_price || 0,
                prev_price: offer.prev_price,
                image: offer.displayImage,
                store: offer.store_name || product.canonical_store_name || "Inconnu",
                product_link: offer.product_link,
              };
              const favoriteActive = isFavorite(favoritePayload.id, favoritePayload.store);
              return (
                <div key={offerId} className="product-card offer-card">
                  <div className="product-image-container">
                    {offer.displayImage ? (
                      <img
                        src={offer.displayImage}
                        alt={offer.name || product.canonical_name}
                        className="product-image"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/200?text=No+Image";
                        }}
                      />
                    ) : (
                      <div className="product-no-image">Pas d'image</div>
                    )}
                    <div className="product-store-badge">
                      {offer.store_name || product.canonical_store_name || "Inconnu"}
                    </div>
                  </div>

                  <div className="product-info">
                    <h3 className="product-name">{offer.name || product.canonical_name}</h3>
                    <p className="product-category">
                      {offer.category || product.canonical_category || "Sans categorie"}{" "}
                      {offer.subcategory ? `> ${offer.subcategory}` : ""}
                      {offer.sub_subcategory ? ` > ${offer.sub_subcategory}` : ""}
                    </p>
                    <div className="product-price-section">
                      <span className="product-price">{currency(offer.current_price)}</span>
                      {offer.prev_price && (
                        <span className="product-prev-price">{currency(offer.prev_price)}</span>
                      )}
                    </div>
                    <div className={`offer-availability ${availabilityClass}`}>
                      {availabilityText}
                    </div>

                    <div className="product-actions">
                      <button
                        className={`btn-add-to-cart ${cartPulse[offerId] ? "pulse" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(favoritePayload);
                          triggerPulse(offerId, setCartPulse);
                        }}
                      >
                        <i className="fas fa-shopping-cart"></i> Ajouter
                      </button>
                      <button
                        className={`btn-favorite ${favoriteActive ? "active" : ""} ${
                          favoritePulse[offerId] ? "spark" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(favoritePayload);
                          triggerPulse(offerId, setFavoritePulse);
                        }}
                      >
                        <i className={`fas fa-heart ${favoriteActive ? "fas" : "far"}`}></i>
                      </button>
                      {offer.product_link && (
                        <a
                          href={offer.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-product-btn elevated icon-only"
                          aria-label="Voir l'offre"
                        >
                          <img src="/eye.png" alt="Voir l'offre" className="view-icon" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {offers.length === 0 && <p>Aucune offre detaillee trouvee.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
