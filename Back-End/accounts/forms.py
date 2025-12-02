from django import forms
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from .models import Driver


class DriverAdminForm(forms.ModelForm):
    """
    Form personnalisé pour la création et l'édition de livreurs via l'admin Django
    Gère la création automatique d'un utilisateur Django et l'envoi des identifiants
    """
    first_name = forms.CharField(max_length=150, required=True, label="Prénom")
    last_name = forms.CharField(max_length=150, required=True, label="Nom")
    email = forms.EmailField(required=True, label="Email")
    password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
        label="Mot de passe",
        help_text="Laissez vide pour générer automatiquement. Sera envoyé par email au livreur."
    )

    class Meta:
        model = Driver
        fields = ('phone', 'vehicle_type', 'vehicle_plate', 'is_active')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Si on modifie un livreur existant, afficher les détails de l'utilisateur
        if self.instance.pk:
            self.fields['first_name'].initial = self.instance.user.first_name
            self.fields['last_name'].initial = self.instance.user.last_name
            self.fields['email'].initial = self.instance.user.email
            # Rendre le mot de passe non requis en édition
            self.fields['password'].required = False
        else:
            # En création, le mot de passe est optionnel (génération automatique)
            self.fields['password'].required = False

    def save(self, commit=True):
        driver = super().save(commit=False)

        first_name = self.cleaned_data.get('first_name')
        last_name = self.cleaned_data.get('last_name')
        email = self.cleaned_data.get('email')
        password = self.cleaned_data.get('password')

        # Générer un mot de passe si non fourni
        if not password:
            password = get_random_string(length=12)

        # Créer ou mettre à jour l'utilisateur Django
        is_new_driver = not self.instance.pk

        if self.instance.pk:
            # Modification d'un livreur existant
            user = driver.user
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            # Uniquement changer le mot de passe s'il est fourni
            if self.cleaned_data.get('password'):
                user.set_password(password)
            user.save()
        else:
            # Création d'un nouveau livreur
            # Utiliser l'email comme username (pour la connexion avec @)
            username = email
            # S'assurer que le username est unique
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                # Insérer le numéro avant le @
                base, domain = email.split('@')
                username = f"{base}{counter}@{domain}"
                counter += 1

            # Créer l'utilisateur
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            driver.user = user

            # Stocker les infos pour l'envoi d'email dans l'admin
            self._driver_password = password
            self._driver_username = user.username
            self._driver_email = email
            self._driver_full_name = f"{first_name} {last_name}"
            self._is_new_driver = True

        if commit:
            driver.save()

        return driver
