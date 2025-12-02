import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "./Header.css";
import logo from "../assets/logo.png";
import FavoritesModal from "./FavoritesModal";
import CartModal from "./CartModal";
import NotificationCenter from "./NotificationCenter";
import { useCartFavorites } from "../context/CartFavoritesContext";

export default function Header() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const { favorites, cart } = useCartFavorites();

  // Vérifier si l'utilisateur est connecté
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
    };

    checkAuth();
    // Écouter les changements dans localStorage
    window.addEventListener('storage', checkAuth);

    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Fonction de déconnexion
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setIsAuthenticated(false);
    navigate('/');
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 60px',
      background: '#111827',
      width: '100%',
      boxSizing: 'border-box',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/">
          <img src={logo} alt="HubShop Logo" style={{ height: '80px', width: 'auto' }} />
        </Link>
      </div>

      {/* Navigation Links */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        margin: '0 30px'
      }}>
        <div style={{
          display: 'flex',
          gap: '45px',
          listStyle: 'none',
          margin: 0,
          padding: 0
        }}>
          <Link
            to="/"
            className="nav-link-hover"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#facc15'}
            onMouseLeave={(e) => e.target.style.color = '#ffffff'}
          >Accueil</Link>

          <Link
            to="/about"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#facc15'}
            onMouseLeave={(e) => e.target.style.color = '#ffffff'}
          >À propos</Link>

          <a
            href="/shop"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#facc15'}
            onMouseLeave={(e) => e.target.style.color = '#ffffff'}
          >Boutique</a>

          <a
            href="/contact"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              transition: 'color 0.3s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#facc15'}
            onMouseLeave={(e) => e.target.style.color = '#ffffff'}
          >Contact</a>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {!isAuthenticated ? (
          <>
            {/* Boutons si NON connecté */}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'transparent',
                border: '2px solid #ffffff',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#facc15';
                e.target.style.borderColor = '#facc15';
                e.target.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#ffffff';
                e.target.style.color = '#ffffff';
              }}
            >
              Se connecter
            </button>

            <button
              onClick={() => navigate('/signup')}
              style={{
                background: 'transparent',
                border: '2px solid #ffffff',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#facc15';
                e.target.style.borderColor = '#facc15';
                e.target.style.color = '#111827';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = '#ffffff';
                e.target.style.color = '#ffffff';
              }}
            >
              S'inscrire
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* Icône Personne - Profil */}
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Mon Profil"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#facc15';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <i className="fas fa-user"></i>
            </button>

            {/* Notification Center */}
            <div style={{ position: 'relative' }}>
              <NotificationCenter />
            </div>

            {/* Icône Panier */}
            <button
              onClick={() => setShowCart(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              title="Mon Panier"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#facc15';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <i className="fas fa-shopping-cart"></i>
              {cart.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {cart.length}
                </span>
              )}
            </button>

            {/* Icône Cœur - Favoris */}
            <button
              onClick={() => setShowFavorites(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              title="Mes Favoris"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#facc15';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <i className="fas fa-heart"></i>
              {favorites.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Icône Déconnexion */}
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Se déconnecter"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.transform = 'scale(1.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <FavoritesModal isOpen={showFavorites} onClose={() => setShowFavorites(false)} />
      <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />
    </header>
  );
}
