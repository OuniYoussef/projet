import React, { useState } from 'react';
import './DeliveryConfirmationModal.css';

export default function DeliveryConfirmationModal({ isOpen, orderNumber, onConfirm, onReject, onClose }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      alert('Veuillez expliquer pourquoi la livraison n\'a pas été reçue');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(reason);
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="delivery-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="delivery-modal">
        <div className="modal-header">
          <h2>Confirmer la livraison</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="order-info">
            <p className="info-label">Commande N°:</p>
            <p className="info-value">{orderNumber}</p>
          </div>

          <div className="confirmation-question">
            <p>Avez-vous reçu votre colis en bon état?</p>
          </div>

          <div className="tabs">
            <button className="tab-btn active" id="tab-confirm">
              ✓ J'ai reçu ma commande
            </button>
            <button className="tab-btn" id="tab-reject">
              ✕ Je n'ai pas reçu ma commande
            </button>
          </div>

          {/* Confirm Tab */}
          <div className="tab-content active" id="content-confirm">
            <div className="confirmation-message">
              <div className="success-icon">✓</div>
              <h3>Livraison confirmée</h3>
              <p>Nous avons enregistré la réception de votre commande.</p>
              <p className="thank-you">Merci de votre confiance!</p>
            </div>
          </div>

          {/* Reject Tab */}
          <div className="tab-content" id="content-reject">
            <div className="reason-container">
              <label htmlFor="rejection-reason">Expliquez ce qui s'est passé:</label>
              <textarea
                id="rejection-reason"
                className="reason-textarea"
                placeholder="Ex: Le colis ne s'est pas présenté, le colis était endommagé, le colis contenait un article manquant..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="4"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-reject-modal"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            className="btn-confirm-modal"
            onClick={() => {
              const tab = document.querySelector('.tab-btn.active');
              if (tab.id === 'tab-confirm') {
                handleConfirm();
              } else {
                handleReject();
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </>
  );
}
