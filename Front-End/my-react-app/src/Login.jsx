import { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";
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

export default function Login() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // État du formulaire de connexion
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // État du mode de connexion
  const [loginMode, setLoginMode] = useState("email"); // "email" ou "face"
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [useFaceRecognition, setUseFaceRecognition] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateClient() {
    const errs = {};
    if (!form.email) errs.email = "Email requis";
    if (!form.password) errs.password = "Mot de passe requis";
    return errs;
  }

  // Connexion par email/mot de passe
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
        email: form.email,
        password: form.password,
      };

      const res = await axios.post(`${API_BASE}/api/auth/login/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const { tokens } = res.data || {};
      if (tokens) {
        localStorage.setItem("access_token", tokens.access);
        localStorage.setItem("refresh_token", tokens.refresh);

        // Vérifier si l'utilisateur est un driver
        try {
          const driverRes = await axios.get(`${API_BASE}/api/auth/driver/dashboard/`, {
            headers: { "Authorization": `Bearer ${tokens.access}` }
          });

          if (driverRes.data && driverRes.data.driver) {
            // C'est un driver, rediriger vers driver-dashboard
            setMsg("✓ Connexion réussie (Driver)...");
            setTimeout(() => {
              navigate('/driver-dashboard');
            }, 1500);
            return;
          }
        } catch (err) {
          // Pas un driver, continuer vers le dashboard client
        }
      }

      // Par défaut, rediriger vers le dashboard client
      setMsg("✓ Connexion réussie...");
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      if (err?.response?.data) {
        setErrors(err.response.data);
        setMsg("Identifiants incorrects");
      } else {
        setMsg("Erreur réseau ou serveur.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Gérer la caméra pour la reconnaissance faciale
  async function startCamera() {
    try {
      setCameraActive(true);
      setMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setMsg("Erreur : Impossible d'accéder à la caméra");
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraActive(false);
    setFaceDetected(false);
  }

  // Capturer une photo pour la reconnaissance faciale
  async function captureFace() {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(videoRef.current, 0, 0, 400, 400);
      setFaceDetected(true);
      setMsg("✓ Visage détecté ! Traitement en cours...");

      // Convertir en base64
      const photoBase64 = canvasRef.current.toDataURL("image/jpeg");

      // Envoyer la photo pour matching facial au backend
      setLoading(true);
      try {
        const res = await axios.post(
          `${API_BASE}/api/auth/facial-login/`,
          { photo: photoBase64 },
          { headers: { "Content-Type": "application/json" } }
        );

        const { tokens } = res.data || {};
        if (tokens) {
          localStorage.setItem("access_token", tokens.access);
          localStorage.setItem("refresh_token", tokens.refresh);

          // Vérifier si l'utilisateur est un driver
          try {
            const driverRes = await axios.get(`${API_BASE}/api/auth/driver/dashboard/`, {
              headers: { "Authorization": `Bearer ${tokens.access}` }
            });

            if (driverRes.data && driverRes.data.driver) {
              // C'est un driver, rediriger vers driver-dashboard
              setMsg("✓ Connexion par reconnaissance faciale réussie (Driver)!");
              stopCamera();
              setTimeout(() => {
                navigate('/driver-dashboard');
              }, 1500);
              return;
            }
          } catch (err) {
            // Pas un driver, continuer vers le dashboard client
          }

          // Par défaut, rediriger vers le dashboard client
          setMsg("✓ Connexion par reconnaissance faciale réussie !");
          stopCamera();
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }
      } catch (err) {
        setMsg("❌ Visage non reconnu. Veuillez réessayer ou utiliser email/mot de passe.");
        setFaceDetected(false);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <MDBContainer style={{ maxWidth: "500px", width: "100%" }}>
          <MDBRow className="login-row">
            {/* Colonne Formulaire */}
            <MDBCol md="12" className="form-column">
              <MDBCard className="login-card">
                <MDBCardBody className="login-card-body">
                  <h2 className="login-title">Se Connecter</h2>

                  {/* Bouton Switch pour toggle entre login normal et reconnaissance faciale */}
                  <div className="switch-container">
                    <span className="switch-label">
                      {useFaceRecognition ? "Reconnaissance Faciale" : "Login Normal"}
                    </span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={useFaceRecognition}
                        onChange={() => {
                          setUseFaceRecognition(!useFaceRecognition);
                          setLoginMode(useFaceRecognition ? "email" : "face");
                          stopCamera();
                          setMsg(null);
                          setErrors({});
                        }}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  {msg && (
                    <div
                      style={{
                        color: msg.includes("Erreur")
                          ? "#dc2626"
                          : msg.includes("réussie") || msg.includes("✓")
                          ? "#059669"
                          : "#f59e0b",
                        backgroundColor: msg.includes("Erreur")
                          ? "#fee2e2"
                          : msg.includes("réussie") || msg.includes("✓")
                          ? "#d1fae5"
                          : "#fef3c7",
                        padding: "12px 20px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        width: "100%",
                        textAlign: "center",
                        fontWeight: "500",
                        borderLeft: `4px solid ${
                          msg.includes("Erreur")
                            ? "#dc2626"
                            : msg.includes("réussie") || msg.includes("✓")
                            ? "#059669"
                            : "#f59e0b"
                        }`,
                      }}
                    >
                      {msg}
                    </div>
                  )}

                  {/* Mode Connexion par Email */}
                  {!useFaceRecognition && (
                    <form style={{ width: "100%" }} onSubmit={handleSubmit}>
                      <div className="form-group-login">
                        <label>Email *</label>
                        <MDBInput
                          wrapperClass="mb-0"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="Entrez votre email"
                        />
                        {errors.email && (
                          <div className="error-message">{errors.email}</div>
                        )}
                      </div>

                      <div className="form-group-login">
                        <label>Mot de passe *</label>
                        <MDBInput
                          wrapperClass="mb-0"
                          name="password"
                          type="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Entrez votre mot de passe"
                        />
                        {errors.password && (
                          <div className="error-message">
                            {errors.password}
                          </div>
                        )}
                      </div>

                      <div className="forgot-password">
                        <a href="#forgot">Mot de passe oublié ?</a>
                      </div>

                      <MDBBtn
                        type="submit"
                        className="submit-btn"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? "Connexion en cours..." : "Se Connecter"}
                      </MDBBtn>
                    </form>
                  )}

                  {/* Mode Reconnaissance Faciale */}
                  {useFaceRecognition && (
                    <div className="face-recognition-mode">
                      {!cameraActive ? (
                        <div className="face-intro">
                          <div className="face-icon">🔐</div>
                          <p className="face-description">
                            Utilisez la reconnaissance faciale pour une
                            connexion rapide et sécurisée
                          </p>
                          <button
                            type="button"
                            className="btn-start-camera"
                            onClick={startCamera}
                          >
                            Démarrer la Caméra
                          </button>
                        </div>
                      ) : (
                        <div className="face-capture">
                          <video
                            ref={videoRef}
                            autoPlay
                            className="video-stream"
                            style={{
                              width: "100%",
                              height: "400px",
                              borderRadius: "12px",
                              marginBottom: "15px",
                            }}
                          />
                          <canvas
                            ref={canvasRef}
                            style={{
                              display: "none",
                              width: "400px",
                              height: "400px",
                            }}
                            width="400"
                            height="400"
                          />
                          <div className="capture-buttons">
                            <button
                              type="button"
                              className="btn-capture"
                              onClick={captureFace}
                              disabled={loading}
                            >
                              📸 Capturer
                            </button>
                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={stopCamera}
                              disabled={loading}
                            >
                              ✕ Annuler
                            </button>
                          </div>
                          {faceDetected && (
                            <p className="face-detected-text">
                              ✓ Visage détecté avec succès
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="signup-link">
                    Vous n'avez pas de compte ?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/signup")}
                      className="signup-btn-link"
                    >
                      S'inscrire
                    </button>
                  </p>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          </MDBRow>
        </MDBContainer>
      </div>
    </div>
  );
}
