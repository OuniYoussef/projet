import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { useNotification } from '../context/NotificationContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { addNotification, fetchNotifications } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    city: '',
    postalCode: '',
    interests: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedInfo, setEditedInfo] = useState(userInfo);
  const [newInterest, setNewInterest] = useState('');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address_type: 'home',
    street: '',
    city: '',
    postal_code: '',
    country: 'Tunisia'
  });
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editingProfileAddress, setEditingProfileAddress] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    newPasswordConfirm: ''
  });

  // Récupérer les données de l'utilisateur
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        console.log('Token found:', !!token);
        if (!token) {
          navigate('/login');
          return;
        }

        // Récupérer les infos utilisateur
        const userResponse = await fetch('http://localhost:8000/api/auth/user/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('User API Response status:', userResponse.status);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data received:', userData);
          const userObj = {
            firstName: userData.first_name || userData.username || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            birthDate: userData.birth_date || '',
            address: userData.address || '',
            city: userData.city || '',
            postalCode: userData.postal_code || '',
            interests: userData.interests || []
          };
          console.log('User object after mapping:', userObj);
          setUserInfo(userObj);
          setEditedInfo(userObj);
        } else if (userResponse.status === 401) {
          console.log('Unauthorized - clearing token');
          localStorage.removeItem('access_token');
          navigate('/login');
        } else {
          console.log('User API error:', userResponse.status);
          const errorData = await userResponse.text();
          console.log('Error response:', errorData);
        }

        // Récupérer les commandes depuis l'API backend
        try {
          const ordersResponse = await fetch('http://localhost:8000/api/auth/orders/', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('Orders loaded:', ordersData);
            setOrders(ordersData);
          } else {
            console.log('Orders API error:', ordersResponse.status);
          }
        } catch (err) {
          console.error('Orders API error:', err);
        }

        // Récupérer les adresses
        try {
          const addressesResponse = await fetch('http://localhost:8000/api/auth/addresses/', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (addressesResponse.ok) {
            const addressesData = await addressesResponse.json();
            setAddresses(addressesData);
          }
        } catch (err) {
          console.log('Addresses API error:', err);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Erreur lors du chargement des données');
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: editedInfo.firstName,
          last_name: editedInfo.lastName,
          email: editedInfo.email,
          phone: editedInfo.phone,
          birth_date: editedInfo.birthDate,
          address: editedInfo.address,
          city: editedInfo.city,
          postal_code: editedInfo.postalCode,
          interests: editedInfo.interests
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        const userObj = {
          firstName: updatedData.first_name || '',
          lastName: updatedData.last_name || '',
          email: updatedData.email || '',
          phone: updatedData.phone || '',
          birthDate: updatedData.birth_date || '',
          address: updatedData.address || '',
          city: updatedData.city || '',
          postalCode: updatedData.postal_code || '',
          interests: updatedData.interests || []
        };
        setUserInfo(userObj);
        setEditedInfo(userObj);
        setIsEditing(false);
        alert('Profil mis à jour avec succès!');
      } else {
        alert('Erreur lors de la mise à jour du profil');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !editedInfo.interests.includes(newInterest)) {
      setEditedInfo(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setEditedInfo(prev => ({
      ...prev,
      interests: prev.interests.filter(interest => interest !== interestToRemove)
    }));
  };

  const handleAddAddress = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/addresses/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAddress)
      });

      if (response.ok) {
        const createdAddress = await response.json();
        setAddresses([...addresses, createdAddress]);
        setNewAddress({
          address_type: 'home',
          street: '',
          city: '',
          postal_code: '',
          country: 'Tunisia'
        });
        setShowAddAddressForm(false);
        alert('Adresse ajoutée avec succès!');
      } else {
        alert('Erreur lors de l\'ajout de l\'adresse');
      }
    } catch (err) {
      console.error('Error adding address:', err);
      alert('Erreur lors de l\'ajout de l\'adresse');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette adresse?')) {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/auth/addresses/${addressId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok || response.status === 204) {
          setAddresses(addresses.filter(addr => addr.id !== addressId));
          alert('Adresse supprimée!');
        } else {
          alert('Erreur lors de la suppression');
        }
      } catch (err) {
        console.error('Error deleting address:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address.id);
    setEditingAddress({ ...address });
  };

  const handleSaveEditedAddress = async () => {
    if (!editingAddress || !editingAddressId) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/auth/addresses/${editingAddressId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address_type: editingAddress.address_type,
          street: editingAddress.street,
          city: editingAddress.city,
          postal_code: editingAddress.postal_code,
          country: editingAddress.country
        })
      });

      if (response.ok) {
        const updatedAddress = await response.json();
        setAddresses(addresses.map(addr => addr.id === editingAddressId ? updatedAddress : addr));
        setEditingAddressId(null);
        setEditingAddress(null);
        alert('Adresse mise à jour avec succès!');
      } else {
        alert('Erreur lors de la mise à jour de l\'adresse');
      }
    } catch (err) {
      console.error('Error updating address:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleCancelEditAddress = () => {
    setEditingAddressId(null);
    setEditingAddress(null);
  };

  const handleEditProfileAddress = () => {
    setEditingProfileAddress(true);
  };

  const handleSaveProfileAddress = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          email: userInfo.email,
          phone: userInfo.phone,
          birth_date: userInfo.birthDate,
          address: userInfo.address,
          city: userInfo.city,
          postal_code: userInfo.postalCode,
          interests: userInfo.interests
        })
      });

      if (response.ok) {
        setEditingProfileAddress(false);
        alert('Adresse principale mise à jour avec succès!');
      } else {
        alert('Erreur lors de la mise à jour de l\'adresse');
      }
    } catch (err) {
      console.error('Error updating profile address:', err);
      alert('Erreur lors de la mise à jour');
    }
  };

  const handleCancelProfileAddress = () => {
    setEditingProfileAddress(false);
  };

  const handleDeleteProfileAddress = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre adresse principale?')) {
      setUserInfo(prev => ({
        ...prev,
        address: '',
        city: '',
        postalCode: ''
      }));
      setEditedInfo(prev => ({
        ...prev,
        address: '',
        city: '',
        postalCode: ''
      }));
      handleSaveProfileAddress();
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async () => {
    try {
      // Validation
      if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.newPasswordConfirm) {
        alert('Tous les champs sont requis');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
        alert('Les nouveaux mots de passe ne correspondent pas');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        alert('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/change-password/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: passwordForm.oldPassword,
          new_password: passwordForm.newPassword,
          new_password_confirm: passwordForm.newPasswordConfirm
        })
      });

      if (response.ok) {
        alert('Mot de passe changé avec succès!');
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          newPasswordConfirm: ''
        });
        setShowChangePasswordForm(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      alert('Erreur lors du changement de mot de passe');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '1.5rem', color: '#667eea' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ef4444' }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Mon Profil</h1>
        <p>Gérez vos informations personnelles et vos préférences</p>
      </div>

      <div className="dashboard-content">
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <nav className="dashboard-nav">
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <i className="fas fa-user"></i> Mon Profil
            </button>
            <button
              className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <i className="fas fa-shopping-bag"></i> Mes Commandes
            </button>
            <button
              className={`nav-item ${activeTab === 'addresses' ? 'active' : ''}`}
              onClick={() => setActiveTab('addresses')}
            >
              <i className="fas fa-map-marker-alt"></i> Mes Adresses
            </button>
            <button
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <i className="fas fa-cog"></i> Paramètres
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* TAB: Profile */}
          {activeTab === 'profile' && (
            <div className="tab-content profile-tab">
              <div className="section-header">
                <h2>Informations Personnelles</h2>
                <button
                  className={`edit-btn ${isEditing ? 'cancel' : ''}`}
                  onClick={() => isEditing ? (setIsEditing(false), setEditedInfo(userInfo)) : setIsEditing(true)}
                >
                  {isEditing ? 'Annuler' : 'Modifier'}
                </button>
              </div>

              <div className="profile-info">
                {isEditing ? (
                  <form className="edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Prénom</label>
                        <input
                          type="text"
                          name="firstName"
                          value={editedInfo.firstName}
                          onChange={handleInputChange}
                          placeholder="Votre prénom"
                        />
                      </div>
                      <div className="form-group">
                        <label>Nom</label>
                        <input
                          type="text"
                          name="lastName"
                          value={editedInfo.lastName}
                          onChange={handleInputChange}
                          placeholder="Votre nom"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={editedInfo.email}
                          onChange={handleInputChange}
                          placeholder="votre.email@example.com"
                        />
                      </div>
                      <div className="form-group">
                        <label>Téléphone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={editedInfo.phone}
                          onChange={handleInputChange}
                          placeholder="+216 XX XXX XXXX"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Date de naissance</label>
                      <input
                        type="date"
                        name="birthDate"
                        value={editedInfo.birthDate}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Adresse Principale</label>
                      <input
                        type="text"
                        name="address"
                        value={editedInfo.address}
                        onChange={handleInputChange}
                        placeholder="Votre adresse"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Ville</label>
                        <input
                          type="text"
                          name="city"
                          value={editedInfo.city}
                          onChange={handleInputChange}
                          placeholder="Votre ville"
                        />
                      </div>
                      <div className="form-group">
                        <label>Code Postal</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={editedInfo.postalCode}
                          onChange={handleInputChange}
                          placeholder="Votre code postal"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Intérêts</label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Ajouter un intérêt"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                        />
                        <button
                          type="button"
                          onClick={handleAddInterest}
                          style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          Ajouter
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {editedInfo.interests.map((interest, index) => (
                          <span
                            key={index}
                            style={{
                              background: '#667eea',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            {interest}
                            <button
                              type="button"
                              onClick={() => handleRemoveInterest(interest)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: 0
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="save-btn"
                      onClick={handleSaveProfile}
                    >
                      Enregistrer les modifications
                    </button>
                  </form>
                ) : (
                  <div className="profile-display">
                    <div className="info-item">
                      <label>Prénom</label>
                      <p>{userInfo.firstName}</p>
                    </div>
                    <div className="info-item">
                      <label>Nom</label>
                      <p>{userInfo.lastName}</p>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <p>{userInfo.email}</p>
                    </div>
                    <div className="info-item">
                      <label>Téléphone</label>
                      <p>{userInfo.phone}</p>
                    </div>
                    <div className="info-item">
                      <label>Date de naissance</label>
                      <p>{userInfo.birthDate ? new Date(userInfo.birthDate).toLocaleDateString('fr-FR') : '-'}</p>
                    </div>
                    <div className="info-item">
                      <label>Adresse Principale</label>
                      <p>{userInfo.address || '-'}</p>
                    </div>
                    <div className="info-item">
                      <label>Ville</label>
                      <p>{userInfo.city || '-'}</p>
                    </div>
                    <div className="info-item">
                      <label>Code Postal</label>
                      <p>{userInfo.postalCode || '-'}</p>
                    </div>
                    <div className="info-item">
                      <label>Intérêts</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {userInfo.interests && userInfo.interests.length > 0 ? (
                          userInfo.interests.map((interest, index) => (
                            <span
                              key={index}
                              style={{
                                background: '#667eea',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '0.85rem'
                              }}
                            >
                              {interest}
                            </span>
                          ))
                        ) : (
                          <p>-</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Orders */}
          {activeTab === 'orders' && (
            <div className="tab-content orders-tab">
              <div className="section-header">
                <h2>Mes Commandes</h2>
              </div>

              <div className="orders-list">
                {orders && orders.length > 0 ? (
                  orders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-header">
                        <h3>{order.order_number}</h3>
                        <span className={`status ${order.status.toLowerCase().replace(' ', '-')}`}>
                          {order.status === 'pending' ? 'En attente' :
                           order.status === 'confirmed' ? 'Confirmée' :
                           order.status === 'processing' ? 'En cours' :
                           order.status === 'shipped' ? 'Expédiée' :
                           order.status === 'delivered' ? 'Livrée' :
                           order.status === 'cancelled' ? 'Annulée' : order.status}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="detail-item">
                          <span className="label">Date:</span>
                          <span className="value">{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Articles:</span>
                          <span className="value">{order.items && order.items.length > 0 ? order.items.length : 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Total:</span>
                          <span className="value total">{order.total} DT</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Paiement:</span>
                          <span className="value">{order.payment_method === 'online' ? 'En ligne' : 'À la livraison'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <i style={{ fontSize: '3rem', marginBottom: '10px', display: 'block' }} className="fas fa-inbox"></i>
                    <p>Aucune commande pour le moment</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Commencez à magasiner pour passer votre première commande</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Addresses */}
          {activeTab === 'addresses' && (
            <div className="tab-content addresses-tab">
              <div className="section-header">
                <h2>Mes Adresses</h2>
                <button
                  className="add-btn"
                  onClick={() => setShowAddAddressForm(!showAddAddressForm)}
                >
                  <i className="fas fa-plus"></i> {showAddAddressForm ? 'Annuler' : 'Ajouter une adresse'}
                </button>
              </div>

              {showAddAddressForm && (
                <div style={{
                  background: '#f9f9f9',
                  padding: '20px',
                  borderRadius: '10px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ marginTop: 0 }}>Nouvelle Adresse</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Type</label>
                      <select
                        value={newAddress.address_type}
                        onChange={(e) => setNewAddress({...newAddress, address_type: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="home">Domicile</option>
                        <option value="work">Travail</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Pays</label>
                      <input
                        type="text"
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({...newAddress, country: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Rue</label>
                    <input
                      type="text"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                      placeholder="Votre rue"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Ville</label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                        placeholder="Votre ville"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Code Postal</label>
                      <input
                        type="text"
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({...newAddress, postal_code: e.target.value})}
                        placeholder="Votre code postal"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddAddress}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Enregistrer l'adresse
                  </button>
                </div>
              )}

              <div className="addresses-list">
                {/* Profile main address */}
                {userInfo.address && (
                  <div className={`address-card primary ${editingProfileAddress ? 'editing' : ''}`}>
                    {editingProfileAddress ? (
                      <div style={{ padding: '20px' }}>
                        <h3 style={{ marginTop: 0 }}>Modifier l'adresse principale</h3>
                        <div style={{ marginBottom: '15px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Rue</label>
                          <input
                            type="text"
                            value={userInfo.address}
                            onChange={(e) => setUserInfo({...userInfo, address: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '1rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Ville</label>
                            <input
                              type="text"
                              value={userInfo.city}
                              onChange={(e) => setUserInfo({...userInfo, city: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Code Postal</label>
                            <input
                              type="text"
                              value={userInfo.postalCode}
                              onChange={(e) => setUserInfo({...userInfo, postalCode: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={handleSaveProfileAddress}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={handleCancelProfileAddress}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="address-header">
                          <h3>Adresse Principale</h3>
                          <span className="default-badge">Profil</span>
                        </div>
                        <div className="address-content">
                          <p>{userInfo.address}</p>
                          <p>{userInfo.postalCode} {userInfo.city}</p>
                          <p style={{ fontSize: '0.85rem', color: '#999' }}>Tunisie</p>
                        </div>
                        <div className="address-actions">
                          <button
                            className="edit-address-btn"
                            onClick={handleEditProfileAddress}
                          >
                            Modifier
                          </button>
                          <button
                            className="delete-address-btn"
                            onClick={handleDeleteProfileAddress}
                          >
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Saved addresses */}
                {addresses && addresses.length > 0 ? (
                  addresses.map(address => (
                    <div key={address.id} className={`address-card ${editingAddressId === address.id ? 'editing' : ''}`}>
                      {editingAddressId === address.id ? (
                        <div style={{ padding: '20px' }}>
                          <h3 style={{ marginTop: 0 }}>Modifier l'adresse</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Type</label>
                              <select
                                value={editingAddress.address_type}
                                onChange={(e) => setEditingAddress({...editingAddress, address_type: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '1rem'
                                }}
                              >
                                <option value="home">Domicile</option>
                                <option value="work">Travail</option>
                                <option value="other">Autre</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Pays</label>
                              <input
                                type="text"
                                value={editingAddress.country}
                                onChange={(e) => setEditingAddress({...editingAddress, country: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '1rem',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Rue</label>
                            <input
                              type="text"
                              value={editingAddress.street}
                              onChange={(e) => setEditingAddress({...editingAddress, street: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Ville</label>
                              <input
                                type="text"
                                value={editingAddress.city}
                                onChange={(e) => setEditingAddress({...editingAddress, city: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '1rem',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Code Postal</label>
                              <input
                                type="text"
                                value={editingAddress.postal_code}
                                onChange={(e) => setEditingAddress({...editingAddress, postal_code: e.target.value})}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  border: '1px solid #ddd',
                                  borderRadius: '6px',
                                  fontSize: '1rem',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={handleSaveEditedAddress}
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={handleCancelEditAddress}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="address-header">
                            <h3>{address.address_type === 'home' ? 'Domicile' : address.address_type === 'work' ? 'Travail' : 'Autre'}</h3>
                            {address.is_default && <span className="default-badge">Par défaut</span>}
                          </div>
                          <div className="address-content">
                            <p>{address.street}</p>
                            <p>{address.postal_code} {address.city}</p>
                            <p style={{ fontSize: '0.85rem', color: '#999' }}>{address.country}</p>
                          </div>
                          <div className="address-actions">
                            <button
                              className="edit-address-btn"
                              onClick={() => handleEditAddress(address)}
                            >
                              Modifier
                            </button>
                            <button
                              className="delete-address-btn"
                              onClick={() => handleDeleteAddress(address.id)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  addresses.length === 0 && !userInfo.address && (
                    <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Aucune adresse enregistrée</p>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <div className="tab-content settings-tab">
              <div className="section-header">
                <h2>Paramètres du Compte</h2>
              </div>

              <div className="settings-container">
                <div className="settings-section">
                  <h3>Sécurité</h3>
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Mot de passe</h4>
                      <p>Changez votre mot de passe régulièrement pour sécuriser votre compte</p>
                    </div>
                    <button
                      className="setting-btn"
                      onClick={() => setShowChangePasswordForm(!showChangePasswordForm)}
                    >
                      {showChangePasswordForm ? 'Annuler' : 'Changer le mot de passe'}
                    </button>
                  </div>

                  {showChangePasswordForm && (
                    <div className="password-change-form">
                      <div className="form-group">
                        <label>Ancien mot de passe</label>
                        <input
                          type="password"
                          name="oldPassword"
                          value={passwordForm.oldPassword}
                          onChange={handlePasswordChange}
                          placeholder="Entrez votre ancien mot de passe"
                        />
                      </div>
                      <div className="form-group">
                        <label>Nouveau mot de passe</label>
                        <input
                          type="password"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Entrez votre nouveau mot de passe (minimum 8 caractères)"
                        />
                      </div>
                      <div className="form-group">
                        <label>Confirmer le nouveau mot de passe</label>
                        <input
                          type="password"
                          name="newPasswordConfirm"
                          value={passwordForm.newPasswordConfirm}
                          onChange={handlePasswordChange}
                          placeholder="Confirmez votre nouveau mot de passe"
                        />
                      </div>
                      <div className="form-actions">
                        <button
                          className="btn-save"
                          onClick={handleChangePassword}
                        >
                          Enregistrer
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => {
                            setShowChangePasswordForm(false);
                            setPasswordForm({
                              oldPassword: '',
                              newPassword: '',
                              newPasswordConfirm: ''
                            });
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Authentification à deux facteurs</h4>
                      <p>Renforcez la sécurité de votre compte</p>
                    </div>
                    <button className="setting-btn">Configurer</button>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Notifications</h3>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Notifications par email</h4>
                      <p>Recevez des mises à jour sur vos commandes</p>
                    </div>
                    <input type="checkbox" defaultChecked className="toggle-checkbox" />
                  </div>

                  <div className="toggle-item">
                    <div className="toggle-info">
                      <h4>Newsletter</h4>
                      <p>Recevez nos offres exclusives et nouveautés</p>
                    </div>
                    <input type="checkbox" className="toggle-checkbox" />
                  </div>
                </div>

                <div className="settings-section danger-zone">
                  <h3>Zone Dangereuse</h3>
                  <button className="delete-account-btn">Supprimer mon compte</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
