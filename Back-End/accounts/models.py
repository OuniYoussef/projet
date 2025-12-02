from django.db import models
from django.contrib.auth.models import User

class Product(models.Model):
    """
    Modèle Product pour stocker les données des produits scrappés
    Synchronisé avec la structure de la table Airflow
    """
    category = models.CharField(max_length=255, blank=True, null=True)
    subcategory = models.CharField(max_length=255, blank=True, null=True)
    sub_subcategory = models.CharField(max_length=255, blank=True, null=True)
    store_name = models.CharField(max_length=50)
    product_link = models.TextField()
    name = models.CharField(max_length=255)
    availability = models.CharField(max_length=50, blank=True, null=True)
    current_price = models.FloatField(blank=True, null=True)
    prev_price = models.FloatField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    images_links = models.JSONField(default=list, blank=True)
    product_reference = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'products'
        ordering = ['-id']
        indexes = [
            models.Index(fields=['store_name']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.name} - {self.store_name}"


class Profile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=30, blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    # interests: liste simple (ex: ["Mode", "Technologie"])
    interests = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Profile {self.user.username}"


class Address(models.Model):
    """
    Stocke les adresses de l'utilisateur
    """
    ADDRESS_TYPE_CHOICES = [
        ('home', 'Domicile'),
        ('work', 'Travail'),
        ('other', 'Autre'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_addresses')
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE_CHOICES, default='home')
    street = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, default='Tunisia')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.get_address_type_display()} - {self.user.username}"


class FacialPhoto(models.Model):
    """
    Stocke les photos faciales de l'utilisateur pour la reconnaissance faciale
    """
    POSITION_CHOICES = [
        ('front', 'Face (Frontal)'),
        ('left', 'Côté Gauche'),
        ('right', 'Côté Droit'),
        ('up', 'Vers le Haut'),
        ('down', 'Vers le Bas'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='facial_photos')
    position = models.CharField(max_length=20, choices=POSITION_CHOICES)
    photo = models.ImageField(upload_to='facial_photos/%Y/%m/%d/')
    photo_base64 = models.TextField(blank=True, help_text="Base64 encoded image for easy transmission")
    # Face embedding (128-dimensional vector from FaceNet model)
    face_embedding = models.TextField(blank=True, help_text="Face embedding stored as JSON string")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_primary = models.BooleanField(default=False, help_text="Photo principale pour la reconnaissance")

    class Meta:
        unique_together = ('user', 'position')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Facial Photo - {self.user.username} ({self.position})"


class Order(models.Model):
    """
    Modèle Order pour stocker les commandes des utilisateurs
    """
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('confirmed', 'Confirmée'),
        ('processing', 'En cours de traitement'),
        ('shipped', 'Expédiée'),
        ('accepted', 'Acceptée par le livreur'),
        ('in_transit', 'En transit'),
        ('delivered', 'Livrée'),
        ('received', 'Reçue'),
        ('disputed', 'Litigeuse'),
        ('cancelled', 'Annulée'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('online', 'Paiement en ligne'),
        ('on_delivery', 'À la livraison'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='online')
    payment_status = models.CharField(max_length=20, default='pending')  # pending, paid, failed

    # Shipping address
    shipping_address = models.TextField()
    shipping_city = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=20)
    shipping_country = models.CharField(max_length=100, default='Tunisia')

    # Order details
    subtotal = models.FloatField(default=0)
    shipping_cost = models.FloatField(default=0)
    total = models.FloatField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order_number} - {self.user.username}"


class OrderItem(models.Model):
    """
    Modèle OrderItem pour stocker les articles d'une commande
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_id = models.IntegerField()
    product_name = models.CharField(max_length=255)
    store_name = models.CharField(max_length=50)
    price = models.FloatField()
    quantity = models.IntegerField(default=1)
    subtotal = models.FloatField()

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class Driver(models.Model):
    """
    Modèle Driver pour gérer les livreurs
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    phone = models.CharField(max_length=30)
    vehicle_type = models.CharField(max_length=100, blank=True)  # ex: Voiture, Moto, Vélo
    vehicle_plate = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Driver {self.user.get_full_name() or self.user.username}"


class OrderAssignment(models.Model):
    """
    Modèle pour assigner les commandes aux livreurs
    """
    ASSIGNMENT_STATUS_CHOICES = [
        ('assigned', 'Assignée'),
        ('accepted', 'Acceptée'),
        ('rejected', 'Refusée'),
        ('completed', 'Complétée'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='assignments')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='assignments')
    status = models.CharField(max_length=20, choices=ASSIGNMENT_STATUS_CHOICES, default='assigned')
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    scheduled_delivery_date = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ('order', 'driver')
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Order #{self.order.order_number} -> {self.driver.user.username}"


class DriverAvailability(models.Model):
    """
    Modèle pour gérer la disponibilité des livreurs
    working_days structure:
    {
      "Monday": {"available": true, "start_time": "08:00", "end_time": "18:00"},
      "Tuesday": {"available": true, "start_time": "09:00", "end_time": "17:00"},
      ...
    }
    """
    driver = models.OneToOneField(Driver, on_delete=models.CASCADE, related_name='availability')
    is_available = models.BooleanField(default=True)
    working_days = models.JSONField(default=dict, blank=True)  # Per-day schedule with times
    max_deliveries_per_day = models.IntegerField(default=10)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Availability - {self.driver.user.get_full_name() or self.driver.user.username}"


class DeliveryDay(models.Model):
    """
    Modèle pour représenter une journée de livraison
    """
    PERFORMANCE_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Bon'),
        ('normal', 'Normal'),
        ('poor', 'Mauvais'),
    ]

    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='delivery_days')
    delivery_date = models.DateField()
    num_deliveries = models.IntegerField(default=0)
    total_earnings = models.FloatField(default=0)
    performance_rating = models.CharField(max_length=20, choices=PERFORMANCE_CHOICES, default='normal')
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('driver', 'delivery_date')
        ordering = ['-delivery_date']

    def __str__(self):
        return f"{self.driver.user.username} - {self.delivery_date}"


class DeliveryRoute(models.Model):
    """
    Modèle pour représenter une route de livraison
    """
    delivery_day = models.ForeignKey(DeliveryDay, on_delete=models.CASCADE, related_name='routes')
    order_assignment = models.ForeignKey(OrderAssignment, on_delete=models.CASCADE, null=True, blank=True)
    route_order = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'En attente'),
            ('in_transit', 'En transit'),
            ('delivered', 'Livrée'),
            ('failed', 'Échouée'),
        ],
        default='pending'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['delivery_day', 'route_order']

    def __str__(self):
        return f"Route {self.route_order} - {self.delivery_day.delivery_date}"


class Notification(models.Model):
    """
    Modèle pour gérer les notifications pour les clients et les livreurs
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('order_confirmed', 'Commande confirmée'),
        ('order_assigned', 'Commande assignée au livreur'),
        ('order_accepted', 'Commande acceptée par le livreur'),
        ('order_rejected', 'Commande refusée par le livreur'),
        ('order_in_transit', 'Commande en transit'),
        ('order_delivered', 'Commande livrée'),
        ('delivery_confirmed', 'Livraison confirmée par le client'),
        ('delivery_rejected', 'Livraison refusée par le client'),
        ('order_cancelled', 'Commande annulée'),
    ]

    # Recipient of notification
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')

    # Notification details
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    message = models.TextField()

    # Related objects
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='driver_notifications', null=True, blank=True)
    order_assignment = models.ForeignKey(OrderAssignment, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)

    # Notification status
    is_read = models.BooleanField(default=False)
    action_taken = models.CharField(max_length=50, null=True, blank=True)  # e.g., 'confirmed', 'rejected'

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"Notification #{self.id} - {self.notification_type} ({self.user.username})"


class Invoice(models.Model):
    """
    Modèle pour générer des factures automatiquement quand un livreur accepte une commande
    """
    INVOICE_STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('issued', 'Émise'),
        ('paid', 'Payée'),
        ('cancelled', 'Annulée'),
    ]

    # Relations
    order_assignment = models.OneToOneField(OrderAssignment, on_delete=models.CASCADE, related_name='invoice')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='invoices')

    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=INVOICE_STATUS_CHOICES, default='issued')

    # Customer info (from order)
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=30, blank=True)
    customer_address = models.TextField()

    # Seller info (driver/delivery company)
    seller_name = models.CharField(max_length=255)
    seller_email = models.EmailField()
    seller_phone = models.CharField(max_length=30, blank=True)
    seller_address = models.TextField(blank=True)

    # Financial details
    subtotal = models.FloatField(default=0)
    shipping_cost = models.FloatField(default=0)
    tax = models.FloatField(default=0)
    total = models.FloatField(default=0)

    # Timestamps
    issued_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # PDF file
    pdf_file = models.FileField(upload_to='invoices/%Y/%m/%d/', null=True, blank=True)

    class Meta:
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['driver']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Invoice #{self.invoice_number} - Order #{self.order.order_number}"