import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartFavorites } from '../context/CartFavoritesContext';
import './CartModal.css';

const CartModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateCartQuantity, clearCart, getCartTotal } =
    useCartFavorites();

  const handleQuantityChange = (productId, store, quantity) => {
    if (quantity >= 1) {
      updateCartQuantity(productId, store, quantity);
    }
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const total = getCartTotal();

  if (!isOpen) return null;

  return (
    <div className="cart-modal-overlay" onClick={onClose}>
      <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cart-modal-header">
          <h2>Mon Panier</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cart-modal-content">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <i className="fas fa-shopping-cart"></i>
              <p>Votre panier est vide</p>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={`${item.id}-${item.store}`} className="cart-item">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="cart-item-image"
                    />
                  )}
                  <div className="cart-item-info">
                    <h4>{item.name}</h4>
                    <p className="cart-item-store">
                      <i className="fas fa-store"></i> {item.store}
                    </p>
                    <p className="cart-item-price">
                      <strong>{item.price || 'N/A'} DT</strong>
                    </p>
                  </div>
                  <div className="cart-item-quantity">
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.store,
                          item.quantity - 1
                        )
                      }
                      className="qty-btn"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(
                          item.id,
                          item.store,
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="qty-input"
                    />
                    <button
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.store,
                          item.quantity + 1
                        )
                      }
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-item-subtotal">
                    <p>{((item.price || 0) * (item.quantity || 0)).toFixed(2)} DT</p>
                    <button
                      className="btn-remove"
                      onClick={() =>
                        removeFromCart(item.id, item.store)
                      }
                      title="Retirer du panier"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-modal-summary">
            <div className="summary-row">
              <span>Sous-total</span>
              <span>{total.toFixed(2)} DT</span>
            </div>
            <div className="summary-row">
              <span>Livraison</span>
              <span className="shipping">À confirmer</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{total.toFixed(2)} DT</span>
            </div>
            <button className="btn-checkout" onClick={handleCheckout}>
              Commander
            </button>
            <button
              className="btn-clear-cart"
              onClick={clearCart}
            >
              Vider le panier
            </button>
          </div>
        )}

        {cart.length === 0 && (
          <div className="cart-modal-footer">
            <button className="btn-close-modal" onClick={onClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
