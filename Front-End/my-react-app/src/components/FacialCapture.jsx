import { useState, useRef } from "react";
import "./FacialCapture.css";

const POSITIONS = [
  { key: "front", label: "Face (Frontal)", emoji: "", instructions: "Regardez droit devant" },
  { key: "left", label: "Côté Gauche", emoji: "", instructions: "Regardez vers la gauche" },
  { key: "right", label: "Côté Droit", emoji: "", instructions: "Regardez vers la droite" },
  { key: "up", label: "Vers le Haut", emoji: "", instructions: "Regardez vers le haut" },
  { key: "down", label: "Vers le Bas", emoji: "", instructions: "Regardez vers le bas" },
];

export default function FacialCapture({ onPhotosCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState({});
  const [currentPosition, setCurrentPosition] = useState(0);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  async function startCamera() {
    try {
      setCameraActive(true);
      setMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 400 },
          height: { ideal: 400 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setMsg("Erreur : Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    setCameraActive(false);
  }

  function capturePhoto() {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(videoRef.current, 0, 0, 400, 400);

      // Convertir en base64
      const photoBase64 = canvasRef.current.toDataURL("image/jpeg");

      // Sauvegarder la photo
      setCapturedPhotos((prev) => ({
        ...prev,
        [POSITIONS[currentPosition].key]: photoBase64,
      }));

      setMsg(`Photo ${POSITIONS[currentPosition].label} capturée !`);

      // Passer à la position suivante
      if (currentPosition < POSITIONS.length - 1) {
        setTimeout(() => {
          setCurrentPosition(currentPosition + 1);
          setMsg(null);
        }, 1500);
      } else {
        // Toutes les photos sont capturées
        setTimeout(() => {
          stopCamera();
          setShowPreview(true);
          setMsg(null);
        }, 1500);
      }
    }
  }

  function handleSubmitPhotos() {
    if (Object.keys(capturedPhotos).length === POSITIONS.length) {
      onPhotosCapture(capturedPhotos);
      setShowPreview(false);
      setCapturedPhotos({});
      setCurrentPosition(0);
      setMsg("✓ Photos sauvegardées avec succès !");
    }
  }

  function resetCapture() {
    setCapturedPhotos({});
    setCurrentPosition(0);
    setShowPreview(false);
    setCameraActive(false);
    setMsg(null);
    stopCamera();
  }

  return (
    <div className="facial-capture-container">
      <div className="facial-capture-card">
        <h3 className="facial-capture-title">Capture Faciale</h3>
        <p className="facial-capture-subtitle">
          Prenez des photos de votre visage sous différents angles pour améliorer la reconnaissance
        </p>

        {msg && (
          <div
            className={`facial-message ${
              msg.includes("❌") ? "error" : msg.includes("✓") ? "success" : "info"
            }`}
          >
            {msg}
          </div>
        )}

        {!cameraActive && !showPreview && (
          <button className="btn-start-capture" onClick={startCamera}>
            Démarrer la Capture
          </button>
        )}

        {cameraActive && (
          <div className="capture-section">
            <div className="position-indicator">
              <div className="position-steps">
                {POSITIONS.map((pos, idx) => (
                  <div
                    key={pos.key}
                    className={`step ${
                      idx === currentPosition
                        ? "active"
                        : capturedPhotos[pos.key]
                        ? "completed"
                        : ""
                    }`}
                  >
                    <span className="step-emoji">{pos.emoji}</span>
                    <span className="step-label">{pos.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="current-instruction">
              <p className="instruction-text">
                {POSITIONS[currentPosition].instructions}
              </p>
            </div>

            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                className="video-stream"
                style={{
                  width: "100%",
                  height: "300px",
                  borderRadius: "12px",
                  border: "3px solid #000000ff",
                  objectFit: "cover",
                }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  display: "none",
                  width: "400px",
                  height: "400px",
                }}
              />
            </div>

            <div className="capture-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentPosition + (capturedPhotos[POSITIONS[currentPosition].key] ? 1 : 0)) / POSITIONS.length) * 100}%`,
                  }}
                />
              </div>
              <p className="progress-text">
                {Object.keys(capturedPhotos).length}/{POSITIONS.length} photos capturées
              </p>
            </div>

            <div className="capture-buttons">
              <button
                className="btn-capture-photo"
                onClick={capturePhoto}
                disabled={loading}
              >
                Capturer
              </button>
              <button
                className="btn-cancel-capture"
                onClick={resetCapture}
                disabled={loading}
              >
                ✕ Annuler
              </button>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="preview-section">
            <h4 className="preview-title">✓ Aperçu des Photos Capturées</h4>
            <div className="photos-grid">
              {POSITIONS.map((pos) => (
                <div key={pos.key} className="photo-preview">
                  <div className="preview-label">{pos.label}</div>
                  {capturedPhotos[pos.key] ? (
                    <img
                      src={capturedPhotos[pos.key]}
                      alt={pos.label}
                      className="preview-image"
                    />
                  ) : (
                    <div className="preview-placeholder">Pas de photo</div>
                  )}
                </div>
              ))}
            </div>
            <div className="preview-buttons">
              <button className="btn-confirm-photos" onClick={handleSubmitPhotos}>
                ✓ Valider les Photos
              </button>
              <button className="btn-retake-photos" onClick={resetCapture}>
                🔄 Reprendre les Photos
              </button>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
