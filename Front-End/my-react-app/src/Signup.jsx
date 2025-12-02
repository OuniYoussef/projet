import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Signup.css";
import FacialCapture from "./components/FacialCapture";
import {
  MDBBtn,
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBInput,
} from "mdb-react-ui-kit";

const API_BASE = "http://localhost:8000";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password2: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    gender: "",
    birth_date: "",
    interests: [],
  });
  const [facialPhotos, setFacialPhotos] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});

  const interestsOptions = [
    "Bébé & Enfants",
    "Beauté & Soin",
    "Jeux & Loisirs",
    "Livres & Papeterie",
    "Audio & Multimédia",
    "Sport",
    "Cadeaux & Fêtes"
  ];

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox" && name === "subscribe") {
      setForm((prev) => ({ ...prev, subscribe: checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleInterest(interest) {
    setForm((prev) => {
      const s = new Set(prev.interests);
      if (s.has(interest)) s.delete(interest);
      else s.add(interest);
      return { ...prev, interests: Array.from(s) };
    });
  }

  function handleFacialPhotosCapture(photos) {
    setFacialPhotos(photos);
    setMsg("✓ Photos faciales sauvegardées ! Elles seront utilisées pour la reconnaissance.");
  }

  function validateClient() {
    const errs = {};
    if (!form.username) errs.username = "Nom d'utilisateur requis";
    if (!form.email) errs.email = "Email requis";
    if (!form.password || form.password.length < 8)
      errs.password = "Mot de passe (≥8 caractères)";
    if (form.password !== form.password2)
      errs.password2 = "Les mots de passe doivent correspondre";
    // Photos faciales obligatoires (5 photos de différentes angles)
    if (Object.keys(facialPhotos).length < 5) {
      errs.facial_photos = "Vous devez capturer les photos faciales de toutes les positions (5 angles)";
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setErrors({});
    const clientErr = validateClient();
    if (Object.keys(clientErr).length) {
      setErrors(clientErr);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        password2: form.password2,
        phone: form.phone,
        address: form.address,
        city: form.city,
        postal_code: form.postal_code,
        gender: form.gender,
        birth_date: form.birth_date || null,
        interests: form.interests,
        facial_photos: facialPhotos, // Ajouter les photos faciales
      };

      const res = await axios.post(`${API_BASE}/api/auth/register/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      // NE PAS auto-login après l'inscription
      // L'utilisateur doit se connecter manuellement avec ses identifiants
      setMsg("✓ Inscription réussie! Veuillez vous connecter avec vos identifiants.");
      // Réinitialiser le formulaire
      setForm({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        password2: "",
        phone: "",
        address: "",
        city: "",
        postal_code: "",
        gender: "",
        birth_date: "",
        interests: [],
      });
      setFacialPhotos({});
      // Redirection vers la page de login après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      if (err?.response?.data) {
        setErrors(err.response.data);
      } else {
        setMsg("Erreur réseau ou serveur.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(135deg, #000000ff 0%, #000000ff 100%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <MDBContainer style={{ maxWidth: '1000px', width: '100%' }}>
        <MDBCard
          className="text-black"
          style={{
            borderRadius: '20px',
            boxShadow: '0 15px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}
        >
          <MDBCardBody style={{
            padding: '50px 60px',
            backgroundColor: '#ffffff'
          }}>
            <style>{`
              @media (max-width: 768px) {
                .mdb-card-body {
                  padding: 30px 25px !important;
                }
              }
              @media (max-width: 480px) {
                .mdb-card-body {
                  padding: 25px 20px !important;
                }
              }
            `}</style>
            <MDBRow>
              <MDBCol md="12" className="d-flex flex-column align-items-center">
                <h2
                  className="text-center fw-bold mb-4"
                  style={{
                    fontSize: '2.8rem',
                    color: '#000000ff',
                    marginTop: '0',
                    marginBottom: '15px'
                  }}
                >
                  Créer un compte
                </h2>
                <p style={{
                  textAlign: 'center',
                  color: '#000000ff',
                  marginBottom: '40px',
                  fontSize: '1.15rem',
                  fontWeight: '400'
                }}>
                  Rejoignez HubShop et profitez d'une expérience unique
                </p>

                {msg && (
                  <div style={{ 
                    color: msg.includes('Erreur') ? '#dc2626' : '#059669',
                    backgroundColor: msg.includes('Erreur') ? '#fee2e2' : '#d1fae5',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    width: '100%',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    {msg}
                  </div>
                )}
                
                {errors.non_field_errors && (
                  <div style={{
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    {errors.non_field_errors}
                  </div>
                )}

                {errors.facial_photos && (
                  <div style={{
                    color: '#dc2626',
                    backgroundColor: '#fee2e2',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    ⚠️ {errors.facial_photos}
                  </div>
                )}

                <form style={{ width: '100%' }} onSubmit={handleSubmit}>
                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Nom d'utilisateur *"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        style={{ fontSize: '1rem' }}
                      />
                      {errors.username && (
                        <div style={{ 
                          color: '#dc2626', 
                          fontSize: '0.875rem',
                          marginTop: '-10px',
                          marginBottom: '10px'
                        }}>
                          {errors.username}
                        </div>
                      )}
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Email *"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                      />
                      {errors.email && (
                        <div style={{ 
                          color: '#dc2626', 
                          fontSize: '0.875rem',
                          marginTop: '-10px',
                          marginBottom: '10px'
                        }}>
                          {errors.email}
                        </div>
                      )}
                    </MDBCol>
                  </MDBRow>

                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Prénom"
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                      />
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Nom"
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                      />
                    </MDBCol>
                  </MDBRow>

                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Mot de passe *"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                      />
                      {errors.password && (
                        <div style={{ 
                          color: '#dc2626', 
                          fontSize: '0.875rem',
                          marginTop: '-10px',
                          marginBottom: '10px'
                        }}>
                          {errors.password}
                        </div>
                      )}
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Confirmer mot de passe *"
                        name="password2"
                        type="password"
                        value={form.password2}
                        onChange={handleChange}
                      />
                      {errors.password2 && (
                        <div style={{ 
                          color: '#dc2626', 
                          fontSize: '0.875rem',
                          marginTop: '-10px',
                          marginBottom: '10px'
                        }}>
                          {errors.password2}
                        </div>
                      )}
                    </MDBCol>
                  </MDBRow>

                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Téléphone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Code postal"
                        name="postal_code"
                        value={form.postal_code}
                        onChange={handleChange}
                      />
                    </MDBCol>
                  </MDBRow>

                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Adresse"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                      />
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Ville"
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                      />
                    </MDBCol>
                  </MDBRow>

                  <MDBRow className="g-4">
                    <MDBCol md="6">
                      <div className="mb-0">
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          color: '#000000ff',
                          fontSize: '0.95rem'
                        }}>
                          Genre
                        </label>
                        <select
                          className="form-control"
                          name="gender"
                          value={form.gender}
                          onChange={handleChange}
                          style={{
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem'
                          }}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </div>
                    </MDBCol>

                    <MDBCol md="6">
                      <MDBInput
                        wrapperClass="mb-0"
                        label="Date de naissance"
                        name="birth_date"
                        type="date"
                        value={form.birth_date}
                        onChange={handleChange}
                      />
                    </MDBCol>
                  </MDBRow>

                  <div className="mb-4" style={{ marginTop: '30px' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '12px',
                      color: '#111827',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}>
                      Centres d'intérêt
                    </label>
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}>
                      {interestsOptions.map((opt) => (
                        <div key={opt} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`int-${opt}`}
                            checked={form.interests.includes(opt)}
                            onChange={() => toggleInterest(opt)}
                            style={{
                              cursor: 'pointer',
                              width: '18px',
                              height: '18px'
                            }}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`int-${opt}`}
                            style={{
                              marginLeft: '8px',
                              cursor: 'pointer',
                              fontSize: '0.95rem'
                            }}
                          >
                            {opt}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Composant de capture faciale */}
                  <FacialCapture onPhotosCapture={handleFacialPhotosCapture} />

                  <MDBBtn
                    type="submit"
                    className="mb-3"
                    size="lg"
                    disabled={loading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #000000ff 0%, #000000ff 100%)',
                      border: 'none',
                      padding: '12px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      borderRadius: '8px',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? "Inscription en cours..." : "S'inscrire"}
                  </MDBBtn>

                  <p style={{
                    textAlign: 'center',
                    color: '#000000ff',
                    marginTop: '20px'
                  }}>
                    Vous avez déjà un compte ?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      style={{
                        color: '#000000ff',
                        fontWeight: '600',
                        textDecoration: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        font: 'inherit'
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      Se connecter
                    </button>
                  </p>
                </form>
              </MDBCol>
            </MDBRow>
          </MDBCardBody>
        </MDBCard>
      </MDBContainer>
    </div>
  );
}