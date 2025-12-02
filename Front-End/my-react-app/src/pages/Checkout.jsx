import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartFavorites } from '../context/CartFavoritesContext';
import './Checkout.css';

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart, getCartTotal } = useCartFavorites();

  const [step, setStep] = useState(1); // 1: details, 2: payment, 3: confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');

  // Shipping details state
  const [shippingDetails, setShippingDetails] = useState({
    address: '',
    city: '',
    postalCode: '',
    country: 'Tunisia'
  });

  const [orderData, setOrderData] = useState(null);

  // Address selection state
  const [addresses, setAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState('existing'); // 'new' or 'existing'
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }

    // Redirect if cart is empty
    if (cart.length === 0 && !orderData) {
      navigate('/');
    }

    // Load user's addresses
    const fetchAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const response = await fetch('http://localhost:8000/api/auth/addresses/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Addresses loaded:', data);
          setAddresses(data);
          // Set first address as default if available
          if (data.length > 0) {
            setSelectedAddressId(data[0].id);
            const addr = data[0];
            setShippingDetails({
              address: addr.street,
              city: addr.city,
              postalCode: addr.postal_code,
              country: addr.country || 'Tunisia'
            });
            // Keep in 'existing' mode since we have addresses
            setAddressMode('existing');
          } else {
            // No addresses, switch to 'new' mode
            setAddressMode('new');
            setShippingDetails({
              address: '',
              city: '',
              postalCode: '',
              country: 'Tunisia'
            });
          }
        }
      } catch (err) {
        console.error('Error loading addresses:', err);
        // If error loading addresses, default to new address mode
        setAddressMode('new');
      } finally {
        setLoadingAddresses(false);
      }
    };

    if (token) {
      fetchAddresses();
    }
  }, []);

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectAddress = (addressId) => {
    const selectedAddr = addresses.find(addr => addr.id === addressId);
    if (selectedAddr) {
      setSelectedAddressId(addressId);
      setShippingDetails({
        address: selectedAddr.street,
        city: selectedAddr.city,
        postalCode: selectedAddr.postal_code,
        country: selectedAddr.country || 'Tunisia'
      });
    }
  };

  const handleAddressMode = (mode) => {
    setAddressMode(mode);
    if (mode === 'new') {
      // Clear fields for new address
      setShippingDetails({
        address: '',
        city: '',
        postalCode: '',
        country: 'Tunisia'
      });
    } else if (addresses.length > 0) {
      // Load first address
      handleSelectAddress(addresses[0].id);
    }
  };

  const handleContinueToPayment = () => {
    // Validate shipping details
    if (!shippingDetails.address || !shippingDetails.city || !shippingDetails.postalCode) {
      setError('Veuillez remplir tous les champs d\'adresse');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');

      // Prepare order items
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        store: item.store,
        price: item.price,
        quantity: item.quantity
      }));

      // Create order via API
      const response = await fetch('http://localhost:8000/api/auth/orders/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cart_items: orderItems,
          shipping_address: shippingDetails.address,
          shipping_city: shippingDetails.city,
          shipping_postal_code: shippingDetails.postalCode,
          payment_method: paymentMethod
        })
      });

      if (response.ok) {
        const order = await response.json();
        setOrderData(order);
        clearCart();
        setStep(3);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la création de la commande');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setError('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Use order data if available (after order is created), otherwise calculate from cart
  const subtotal = orderData ? orderData.subtotal : getCartTotal();
  const shippingCost = orderData ? orderData.shipping_cost : 10.0;
  const total = orderData ? orderData.total : (subtotal + 10.0);

  if (cart.length === 0 && !orderData) {
    return (
      <div className="checkout-container">
        <div className="empty-checkout">
          <h2>Panier vide</h2>
          <p>Votre panier est vide. Veuillez ajouter des produits avant de commander.</p>
          <button onClick={() => navigate('/')} className="btn-home">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Commande</h1>
        <div className="steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <span>Adresse</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Paiement</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Confirmation</span>
          </div>
        </div>
      </div>

      <div className="checkout-content">
        {/* Step 1: Shipping Details */}
        {step === 1 && (
          <div className="checkout-step">
            <h2>Détails de livraison</h2>

            {/* Address Mode Selection */}
            {addresses.length > 0 && (
              <div className="address-mode-selector">
                <div className="mode-option">
                  <input
                    type="radio"
                    id="mode_existing"
                    value="existing"
                    checked={addressMode === 'existing'}
                    onChange={(e) => handleAddressMode(e.target.value)}
                  />
                  <label htmlFor="mode_existing">Utiliser une adresse existante</label>
                </div>
                <div className="mode-option">
                  <input
                    type="radio"
                    id="mode_new"
                    value="new"
                    checked={addressMode === 'new'}
                    onChange={(e) => handleAddressMode(e.target.value)}
                  />
                  <label htmlFor="mode_new">Entrer une nouvelle adresse</label>
                </div>
              </div>
            )}

            {/* Existing Addresses Selection */}
            {addressMode === 'existing' && addresses.length > 0 && (
              <div className="existing-addresses">
                <h3>Mes adresses</h3>
                <div className="addresses-list">
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`address-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                      onClick={() => handleSelectAddress(addr.id)}
                    >
                      <div className="address-header">
                        <input
                          type="radio"
                          checked={selectedAddressId === addr.id}
                          onChange={() => handleSelectAddress(addr.id)}
                          className="address-radio"
                        />
                        <span className="address-type">{addr.address_type === 'home' ? '🏠 Domicile' : '📍 Autre'}</span>
                      </div>
                      <div className="address-content">
                        <p className="address-street">{addr.street}</p>
                        <p className="address-city">{addr.postal_code} {addr.city}</p>
                        <p className="address-country">{addr.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Address Form */}
            {addressMode === 'new' && (
              <form className="shipping-form">
                <div className="form-group">
                  <label>Adresse *</label>
                  <input
                    type="text"
                    name="address"
                    value={shippingDetails.address}
                    onChange={handleShippingChange}
                    placeholder="Numéro et rue"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Ville *</label>
                    <input
                      type="text"
                      name="city"
                      value={shippingDetails.city}
                      onChange={handleShippingChange}
                      placeholder="Votre ville"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Code Postal *</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={shippingDetails.postalCode}
                      onChange={handleShippingChange}
                      placeholder="Code postal"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Pays</label>
                  <input
                    type="text"
                    name="country"
                    value={shippingDetails.country}
                    onChange={handleShippingChange}
                    disabled
                  />
                </div>
              </form>
            )}

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={handleContinueToPayment}
              className="btn-continue"
            >
              Continuer vers le paiement
            </button>
          </div>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <div className="checkout-step">
            <h2>Méthode de paiement</h2>
            <div className="payment-methods">
              <div className="payment-option">
                <input
                  type="radio"
                  id="payment_online"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label htmlFor="payment_online">
                  <div className="payment-label">
                    <h3>Paiement en ligne</h3>
                    <p>Carte bancaire, porte-monnaie électronique, etc.</p>
                  </div>
                </label>
              </div>

              <div className="payment-option">
                <input
                  type="radio"
                  id="payment_delivery"
                  value="on_delivery"
                  checked={paymentMethod === 'on_delivery'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label htmlFor="payment_delivery">
                  <div className="payment-label">
                    <h3>À la livraison</h3>
                    <p>Payez en espèces à la réception de votre commande</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={() => setStep(1)}
                className="btn-back"
              >
                Retour
              </button>
              <button
                onClick={handleCreateOrder}
                className="btn-confirm"
                disabled={loading}
              >
                {loading ? 'Création de la commande...' : 'Confirmer la commande'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && orderData && (
          <div className="checkout-step confirmation">
            <div className="success-icon">✓</div>
            <h2>Commande confirmée!</h2>
            <p>Numéro de commande: <strong>{orderData.order_number}</strong></p>
            <p>Un email de confirmation a été envoyé à votre adresse email.</p>

            <div className="order-summary">
              <h3>Résumé de commande</h3>
              <div className="summary-row">
                <span>Sous-total</span>
                <span>{subtotal.toFixed(2)} DT</span>
              </div>
              <div className="summary-row">
                <span>Livraison</span>
                <span>{shippingCost.toFixed(2)} DT</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{total.toFixed(2)} DT</span>
              </div>
              <div className="summary-row">
                <span>Méthode de paiement</span>
                <span>{paymentMethod === 'online' ? 'Paiement en ligne' : 'À la livraison'}</span>
              </div>
            </div>

            <div className="button-group">
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-dashboard"
              >
                Voir ma commande dans le Dashboard
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-home"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        )}

        {/* Order Summary Sidebar */}
        <aside className="checkout-summary">
          <h3>Résumé de commande</h3>
          <div className="summary-items">
            {cart.map(item => (
              <div key={`${item.id}-${item.store}`} className="summary-item">
                <div className="item-info">
                  <p className="item-name">{item.name}</p>
                  <p className="item-store">{item.store}</p>
                  <p className="item-quantity">Qty: {item.quantity}</p>
                </div>
                <div className="item-price">
                  {((item.price || 0) * (item.quantity || 0)).toFixed(2)} DT
                </div>
              </div>
            ))}
          </div>

          <div className="summary-totals">
            <div className="total-row">
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} DT</span>
            </div>
            <div className="total-row">
              <span>Livraison</span>
              <span>{shippingCost.toFixed(2)} DT</span>
            </div>
            <div className="total-row grand-total">
              <span>Total</span>
              <span>{total.toFixed(2)} DT</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
