import { useState } from "react";
import axios from "axios";
import "./Contact.css";
import imageHaut from "../assets/haut.png";
import imageBas from "../assets/bas.png";

const API_BASE = "http://localhost:8000";

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateForm() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Le nom est requis";
    if (!form.email.trim()) errs.email = "L'email est requis";
    if (!form.email.includes("@")) errs.email = "Email invalide";
    if (!form.subject.trim()) errs.subject = "Le sujet est requis";
    if (!form.message.trim()) errs.message = "Le message est requis";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setErrors({});

    const errs = validateForm();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        recipient_email: "hubshoptunisie@gmail.com"
      };

      const res = await axios.post(`${API_BASE}/api/contact/`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 200 || res.status === 201) {
        setMsg("✓ Message envoyé avec succès ! Nous vous répondrons bientôt.");
        setForm({ name: "", email: "", subject: "", message: "" });
        setTimeout(() => setMsg(null), 3000);
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err);
      setMsg("✗ Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contact-page">
      <section className="contact-image-top">
        <img src={imageHaut} alt="Contact Header" />
      </section>

      <section className="contact-middle">
        <div className="contact-middle-container">
          <div className="contact-info-grid">
            <div className="info-column">
              <h3>ADRESSE PHYSIQUE</h3>
              <p>HubShop Tunisie</p>
              <p>Tunis, Tunisie</p>
              <p>Disponible du lundi au samedi</p>
              <p>9h00 à 18h00</p>
            </div>

            <div className="info-column">
              <h3>NOUS CONTACTER</h3>
              <p>hubshoptunisie@gmail.com</p>
              <div className="social-icons">
                <a href="#" className="social-icon" title="Facebook">
                  <i className="fab fa-facebook"></i>
                </a>
                <a href="#" className="social-icon" title="Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>

            <div className="info-column">
              <h3>BOUTIQUE EN LIGNE</h3>
              <p>Découvrez nos produits</p>
              <a href="#" className="link">Visiter la boutique</a>
              <h4>LIVRAISON PARTOUT EN TUNISIE</h4>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-image-bottom">
        <img src={imageBas} alt="Contact Footer" />

        <div className="contact-form-wrapper">
          <form onSubmit={handleSubmit} className="contact-form">
            {msg && (
              <div
                className={`contact-message ${msg.includes("✗") ? "error" : "success"}`}
              >
                {msg}
              </div>
            )}

            <div className="form-group">
              <label>Nom Complet</label>
              <input
                type="text"
                name="name"
                placeholder="Votre nom"
                value={form.name}
                onChange={handleChange}
                className={errors.name ? "input-error" : ""}
              />
              {errors.name && (
                <span className="error-text">{errors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Votre email"
                value={form.email}
                onChange={handleChange}
                className={errors.email ? "input-error" : ""}
              />
              {errors.email && (
                <span className="error-text">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label>Sujet</label>
              <input
                type="text"
                name="subject"
                placeholder="Sujet de votre message"
                value={form.subject}
                onChange={handleChange}
                className={errors.subject ? "input-error" : ""}
              />
              {errors.subject && (
                <span className="error-text">{errors.subject}</span>
              )}
            </div>

            <div className="form-group">
              <label>Message</label>
              <textarea
                name="message"
                placeholder="Votre message..."
                value={form.message}
                onChange={handleChange}
                className={errors.message ? "input-error" : ""}
                rows="4"
              ></textarea>
              {errors.message && (
                <span className="error-text">{errors.message}</span>
              )}
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? "Envoi en cours..." : "Envoyer"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
