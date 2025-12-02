from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_driver_credentials_email(driver_email, username, password, driver_name):
    """
    Envoie les identifiants d'accès au livreur par email

    Returns:
        tuple: (success: bool, message: str)
    """
    subject = "Vos identifiants de connexion - Hub Shop"

    message = f"""
Bonjour {driver_name},

Bienvenue dans l'application de livraison Hub Shop!

Vos identifiants de connexion sont:
Username: {username}
Mot de passe: {password}

Vous pouvez maintenant vous connecter à votre tableau de bord pour voir les commandes assignées et les accepter ou refuser.

Lien de connexion: http://localhost:5173/login

Veuillez ne pas partager ces identifiants avec d'autres personnes.

Cordialement,
Équipe Hub Shop
    """

    try:
        # Essayer d'envoyer l'email
        result = send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [driver_email],
            fail_silently=False,
        )

        # Log de succès
        log_message = f"Email envoyé au livreur {driver_name} ({driver_email})"
        logger.info(log_message)

        return True, "Email envoyé avec succès"

    except Exception as e:
        error_message = f"Erreur lors de l'envoi de l'email au {driver_name} ({driver_email}): {str(e)}"
        logger.error(error_message)

        # Retourner l'erreur mais pas fail_silently
        return False, error_message
