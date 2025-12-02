import React from 'react';
import { useCartFavorites } from '../context/CartFavoritesContext';
import './FavoritesModal.css';

const FavoritesModal = ({ isOpen, onClose }) => {
  const { favorites, removeFromFavorites, addToCart } = useCartFavorites();

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    // Optionally show a toast notification
  };

  if (!isOpen) return null;

  return (
    <div className="favorites-modal-overlay" onClick={onClose}>
      <div className="favorites-modal" onClick={(e) => e.stopPropagation()}>
        <div className="favorites-modal-header">
          <h2>Mes Favoris</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="favorites-modal-content">
          {favorites.length === 0 ? (
            <div className="empty-favorites">
              <i className="fas fa-heart-broken"></i>
              <p>Vous n'avez pas encore de favoris</p>
            </div>
          ) : (
            <div className="favorites-list">
              {favorites.map((product) => (
                <div key={`${product.id}-${product.store}`} className="favorite-item">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="favorite-item-image"
                    />
                  )}
                  <div className="favorite-item-info">
                    <h4>{product.name}</h4>
                    <p className="favorite-item-store">
                      <i className="fas fa-store"></i> {product.store}
                    </p>
                    <p className="favorite-item-price">
                      <strong>{product.price || 'N/A'} DT</strong>
                    </p>
                    {product.prev_price && (
                      <p className="favorite-item-prev-price">
                        Avant: <s>{product.prev_price} DT</s>
                      </p>
                    )}
                  </div>
                  <div className="favorite-item-actions">
                    <button
                      className="btn-add-to-cart"
                      onClick={() => handleAddToCart(product)}
                      title="Ajouter au panier"
                    >
                      <i className="fas fa-shopping-cart"></i>
                    </button>
                    <button
                      className="btn-remove-favorite"
                      onClick={() =>
                        removeFromFavorites(product.id, product.store)
                      }
                      title="Retirer des favoris"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="favorites-modal-footer">
          <p className="favorites-count">
            {favorites.length} produit{favorites.length !== 1 ? 's' : ''} en favoris
          </p>
          <button className="btn-close-modal" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavoritesModal;
