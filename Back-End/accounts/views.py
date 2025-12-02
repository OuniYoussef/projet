from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from .serializers import RegisterSerializer, ProfileSerializer, AddressSerializer, OrderSerializer, OrderItemSerializer, DriverSerializer, OrderAssignmentSerializer, DriverAvailabilitySerializer, InvoiceSerializer, NotificationSerializer
from .models import FacialPhoto, Address, Order, OrderItem, Driver, OrderAssignment, DeliveryDay, DriverAvailability, DeliveryRoute, Invoice, Notification
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.http import FileResponse
from django.core.paginator import Paginator
import json
from datetime import datetime, timedelta
import random
import string

@api_view(['POST'])
@permission_classes([AllowAny])
def LoginView(request):
    """
    Endpoint pour la connexion par email et mot de passe
    Accepte: email, password
    Retourne: tokens (access, refresh), user info
    """
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return Response(
            {"error": "Email et mot de passe requis"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Trouver l'utilisateur par email
        user = User.objects.get(email=email)

        # Authentifier avec le username
        user = authenticate(username=user.username, password=password)

        if user is None:
            return Response(
                {"error": "Identifiants incorrects"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Générer les tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)

    except User.DoesNotExist:
        return Response(
            {"error": "Identifiants incorrects"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        print(f"Erreur lors de la connexion: {str(e)}")
        return Response(
            {"error": "Erreur lors de la connexion"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def RegisterView(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name
            },
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def UserView(request):
    """
    Endpoint pour récupérer et mettre à jour les informations de l'utilisateur connecté
    GET: Récupère les informations
    PUT: Met à jour les informations (first_name, last_name, email, phone, birth_date)
    """
    user = request.user
    profile = user.profile if hasattr(user, 'profile') else None

    if request.method == 'GET':
        user_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

        if profile:
            profile_data = ProfileSerializer(profile).data
            user_data.update(profile_data)

        return Response(user_data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        try:
            # Mettre à jour les informations de l'utilisateur
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            if 'email' in request.data:
                user.email = request.data['email']

            user.save()

            # Mettre à jour le profil si disponible
            if profile:
                if 'phone' in request.data:
                    profile.phone = request.data['phone']
                if 'birth_date' in request.data:
                    profile.birth_date = request.data['birth_date']
                if 'address' in request.data:
                    profile.address = request.data['address']
                if 'city' in request.data:
                    profile.city = request.data['city']
                if 'postal_code' in request.data:
                    profile.postal_code = request.data['postal_code']
                if 'interests' in request.data:
                    profile.interests = request.data['interests']
                profile.save()

            user_data = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }

            if profile:
                profile_data = ProfileSerializer(profile).data
                user_data.update(profile_data)

            return Response(user_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la mise à jour: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


# Facial recognition functions disabled - face_recognition library removed from requirements
# These functions are kept for reference but not used in the current implementation


# FacialLoginView - DISABLED
# Facial recognition endpoint removed - face_recognition library removed from requirements
# To re-enable this feature:
# 1. Restore face_recognition==1.3.0 and dependencies (numpy, scipy, scikit-image) in requirements.txt
# 2. Un-comment the facial recognition functions above
# 3. Restore this endpoint implementation


@api_view(['POST'])
@permission_classes([AllowAny])
def ContactView(request):
    """
    Endpoint pour envoyer un message de contact
    Reçoit : name, email, subject, message
    Envoie un email à hubshoptunisie@gmail.com
    """
    name = request.data.get('name')
    email = request.data.get('email')
    subject = request.data.get('subject')
    message = request.data.get('message')

    # Validation
    if not all([name, email, subject, message]):
        return Response(
            {"error": "Tous les champs sont requis"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Email à envoyer
        recipient_email = "hubshoptunisie@gmail.com"

        # Contenu de l'email
        full_message = f"""
Nouveau message de contact depuis HubShop:

NOM: {name}
EMAIL: {email}
SUJET: {subject}

MESSAGE:
{message}
        """

        # Envoyer l'email avec Reply-To vers l'email de l'utilisateur
        from django.core.mail import EmailMessage

        msg = EmailMessage(
            subject=f"[HubShop Contact] {subject}",
            body=full_message,
            from_email=settings.DEFAULT_FROM_EMAIL or "noreply@hubshop.com",
            to=[recipient_email],
            reply_to=[email],  # L'utilisateur peut répondre directement
        )
        msg.send(fail_silently=False)

        return Response(
            {"success": "Message envoyé avec succès"},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Erreur lors de l'envoi du message: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return Response(
            {"error": f"Erreur lors de l'envoi: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def products_api(request):
    """
    API endpoint to fetch products
    Returns sample products for demonstration
    Supports optional query parameters:
    - limit: number of products to return (default: 20)
    - store: filter by store name (parashop, mytek, tunisianet, spacenet)
    - category: filter by category
    - search: search in product name
    """
    try:
        # Sample products from scrapers
        all_products = [
            {
                "id": 1,
                "name": "SVR Set Ampoule Intensive Lifting",
                "category": "Beauté",
                "subcategory": "Beauté",
                "current_price": 89.99,
                "store_name": "parashop",
                "images_links": ["https://via.placeholder.com/300?text=SVR+Ampoule"],
                "product_link": "https://www.parashop.tn"
            },
            {
                "id": 2,
                "name": "Crème Hydratante Premium",
                "category": "Soin",
                "subcategory": "Soin",
                "current_price": 45.50,
                "store_name": "parashop",
                "images_links": ["https://via.placeholder.com/300?text=Creme+Hydratante"],
                "product_link": "https://www.parashop.tn"
            },
            {
                "id": 3,
                "name": "Samsung Galaxy A15",
                "category": "Électronique",
                "subcategory": "Électronique",
                "current_price": 799.99,
                "store_name": "mytek",
                "images_links": ["https://via.placeholder.com/300?text=Samsung+Galaxy"],
                "product_link": "https://www.mytek.tn"
            },
            {
                "id": 4,
                "name": "Shampooing Bio Naturel",
                "category": "Capillaire",
                "subcategory": "Capillaire",
                "current_price": 28.00,
                "store_name": "tunisianet",
                "images_links": ["https://via.placeholder.com/300?text=Shampooing+Bio"],
                "product_link": "https://www.tunisianet.tn"
            },
            {
                "id": 5,
                "name": "Crème Solaire SPF 50",
                "category": "Solaire",
                "subcategory": "Solaire",
                "current_price": 32.99,
                "store_name": "spacenet",
                "images_links": ["https://via.placeholder.com/300?text=Solaire+SPF50"],
                "product_link": "https://www.spacenet.tn"
            },
        ]

        # Get query parameters
        limit = int(request.GET.get('limit', 20))
        store = request.GET.get('store', None)
        category = request.GET.get('category', None)
        search = request.GET.get('search', None)

        # Ensure limit is reasonable
        limit = min(max(limit, 1), 500)

        # Filter products
        filtered = all_products

        if store:
            filtered = [p for p in filtered if p['store_name'].lower() == store.lower()]

        if category:
            filtered = [p for p in filtered if p['category'].lower() == category.lower()]

        if search:
            search_lower = search.lower()
            filtered = [p for p in filtered if search_lower in p['name'].lower()]

        # Apply limit
        filtered = filtered[:limit]

        return Response({
            'count': len(filtered),
            'results': filtered
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"Erreur lors de la récupération des produits: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': 'Erreur lors de la récupération des produits'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def AddressListCreateView(request):
    """
    GET: Récupère toutes les adresses de l'utilisateur
    POST: Crée une nouvelle adresse pour l'utilisateur
    """
    user = request.user

    if request.method == 'GET':
        addresses = Address.objects.filter(user=user)
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        try:
            data = request.data.copy()
            data['user'] = user.id
            serializer = AddressSerializer(data=data)
            if serializer.is_valid():
                serializer.save(user=user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la création de l'adresse: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def AddressDetailView(request, address_id):
    """
    GET: Récupère une adresse spécifique
    PUT: Met à jour une adresse
    DELETE: Supprime une adresse
    """
    user = request.user

    try:
        address = Address.objects.get(id=address_id, user=user)
    except Address.DoesNotExist:
        return Response(
            {"error": "Adresse non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = AddressSerializer(address)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        serializer = AddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        address.delete()
        return Response(
            {"success": "Adresse supprimée"},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ChangePasswordView(request):
    """
    Endpoint pour changer le mot de passe
    Reçoit: old_password, new_password, new_password_confirm
    """
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    new_password_confirm = request.data.get('new_password_confirm')

    # Validation
    if not old_password or not new_password or not new_password_confirm:
        return Response(
            {"error": "Tous les champs sont requis"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier l'ancien mot de passe
    if not user.check_password(old_password):
        return Response(
            {"error": "Ancien mot de passe incorrect"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier que les nouveaux mots de passe correspondent
    if new_password != new_password_confirm:
        return Response(
            {"error": "Les nouveaux mots de passe ne correspondent pas"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Vérifier la longueur du mot de passe
    if len(new_password) < 8:
        return Response(
            {"error": "Le mot de passe doit contenir au moins 8 caractères"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Changer le mot de passe
    try:
        user.set_password(new_password)
        user.save()
        return Response(
            {"success": "Mot de passe changé avec succès"},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": f"Erreur lors du changement de mot de passe: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def OrderListCreateView(request):
    """
    GET: Récupère toutes les commandes de l'utilisateur
    POST: Crée une nouvelle commande
    """
    user = request.user

    if request.method == 'GET':
        orders = Order.objects.filter(user=user)
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        try:
            # Récupérer les données
            cart_items = request.data.get('cart_items', [])
            shipping_address = request.data.get('shipping_address')
            shipping_city = request.data.get('shipping_city')
            shipping_postal_code = request.data.get('shipping_postal_code')
            payment_method = request.data.get('payment_method', 'online')

            if not cart_items or not shipping_address or not shipping_city or not shipping_postal_code:
                return Response(
                    {"error": "Données de commande incomplètes"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Calculer le total
            subtotal = sum(item['price'] * item['quantity'] for item in cart_items)
            shipping_cost = 10.0  # Frais de livraison fixes
            total = subtotal + shipping_cost

            # Générer un numéro de commande unique
            order_number = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"

            # Créer la commande
            order = Order.objects.create(
                user=user,
                order_number=order_number,
                payment_method=payment_method,
                shipping_address=shipping_address,
                shipping_city=shipping_city,
                shipping_postal_code=shipping_postal_code,
                subtotal=subtotal,
                shipping_cost=shipping_cost,
                total=total
            )

            # Créer les articles de commande
            for item in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product_id=item['id'],
                    product_name=item['name'],
                    store_name=item['store'],
                    price=item['price'],
                    quantity=item['quantity'],
                    subtotal=item['price'] * item['quantity']
                )

            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la création de la commande: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def OrderDetailView(request, order_id):
    """
    GET: Récupère une commande spécifique
    PUT: Met à jour le statut d'une commande (admin/backend only)
    """
    user = request.user

    try:
        order = Order.objects.get(id=order_id, user=user)
    except Order.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        # Update order status/payment status
        if 'status' in request.data:
            order.status = request.data['status']
        if 'payment_status' in request.data:
            order.payment_status = request.data['payment_status']

        order.save()
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==================== DRIVER VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def DriverDashboardView(request):
    """
    Dashboard pour les livreurs
    Affiche le profil du livreur et ses commandes assignées
    """
    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get assigned orders
    assignments = OrderAssignment.objects.filter(driver=driver).select_related('order')

    return Response({
        'driver': DriverSerializer(driver).data,
        'assignments': OrderAssignmentSerializer(assignments, many=True).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def DriverAssignedOrdersView(request):
    """
    Récupère les commandes assignées au livreur avec filtrage par statut
    """
    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    # Filter by assignment status if provided
    assignment_status = request.query_params.get('status', None)
    assignments = OrderAssignment.objects.filter(driver=driver).select_related('order')

    if assignment_status:
        assignments = assignments.filter(status=assignment_status)

    serializer = OrderAssignmentSerializer(assignments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def DriverAcceptOrderView(request, assignment_id):
    """
    Le livreur accepte une commande
    """
    from django.utils import timezone

    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = OrderAssignment.objects.get(id=assignment_id, driver=driver, status='assigned')
    except OrderAssignment.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée ou déjà traitée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Update assignment status
    assignment.status = 'accepted'
    assignment.accepted_at = timezone.now()
    assignment.save()

    # Update order status if needed
    if assignment.order.status == 'pending':
        assignment.order.status = 'confirmed'
        assignment.order.save()

    serializer = OrderAssignmentSerializer(assignment)
    return Response({
        'message': 'Commande acceptée avec succès',
        'assignment': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def DriverRejectOrderView(request, assignment_id):
    """
    Le livreur refuse une commande
    """
    from django.utils import timezone

    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = OrderAssignment.objects.get(id=assignment_id, driver=driver, status='assigned')
    except OrderAssignment.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée ou déjà traitée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get rejection reason from request
    rejection_reason = request.data.get('reason', 'Non spécifiée')

    # Update assignment status
    assignment.status = 'rejected'
    assignment.rejected_at = timezone.now()
    assignment.rejection_reason = rejection_reason
    assignment.save()

    serializer = OrderAssignmentSerializer(assignment)
    return Response({
        'message': 'Commande refusée',
        'assignment': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def AdminAssignOrderToDriverView(request):
    """
    Admin assigne une commande à un livreur
    Requiert: order_id, driver_id
    """
    # Check if user is admin/staff (simple check, ideally use permission classes)
    if not request.user.is_staff:
        return Response(
            {"error": "Vous n'avez pas les permissions pour assigner des commandes"},
            status=status.HTTP_403_FORBIDDEN
        )

    order_id = request.data.get('order_id')
    driver_id = request.data.get('driver_id')

    if not order_id or not driver_id:
        return Response(
            {"error": "order_id et driver_id sont requis"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        driver = Driver.objects.get(id=driver_id)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Livreur non trouvé"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if assignment already exists
    from .models import OrderAssignment
    existing = OrderAssignment.objects.filter(order=order, driver=driver).first()
    if existing:
        return Response(
            {"error": "Cette commande est déjà assignée à ce livreur"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create assignment
    assignment = OrderAssignment.objects.create(
        order=order,
        driver=driver,
        status='assigned'
    )

    serializer = OrderAssignmentSerializer(assignment)
    return Response({
        'message': 'Commande assignée avec succès',
        'assignment': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def AdminGetDriversView(request):
    """
    Admin récupère la liste de tous les livreurs (pour assigner des commandes)
    """
    if not request.user.is_staff:
        return Response(
            {"error": "Vous n'avez pas les permissions"},
            status=status.HTTP_403_FORBIDDEN
        )

    drivers = Driver.objects.filter(is_active=True)
    serializer = DriverSerializer(drivers, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def DriverCompleteOrderView(request, assignment_id):
    """
    Le livreur marque une commande comme livrée/complétée
    """
    from django.utils import timezone

    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        assignment = OrderAssignment.objects.get(id=assignment_id, driver=driver, status='accepted')
    except OrderAssignment.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée ou non acceptée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Update assignment status
    assignment.status = 'completed'
    assignment.completed_at = timezone.now()
    assignment.save()

    # Update order status
    if assignment.order.status != 'delivered':
        assignment.order.status = 'delivered'
        assignment.order.save()

    serializer = OrderAssignmentSerializer(assignment)
    return Response({
        'message': 'Commande marquée comme livrée',
        'assignment': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ConfirmDeliveryView(request, order_id):
    """
    L'utilisateur confirme ou rejette la réception de sa commande
    Requiert: confirmed (bool), status (string: 'received' ou 'disputed')
    """
    user = request.user

    try:
        order = Order.objects.get(id=order_id, user=user)
    except Order.DoesNotExist:
        return Response(
            {"error": "Commande non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        confirmed = request.data.get('confirmed', False)
        new_status = request.data.get('status', 'received')

        if not confirmed and new_status == 'disputed':
            # L'utilisateur a signalé un problème
            order.status = 'disputed'
        elif confirmed and new_status == 'received':
            # L'utilisateur a confirmé la réception
            order.status = 'received'
        else:
            return Response(
                {"error": "Statut invalide"},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.save()

        serializer = OrderSerializer(order)
        return Response({
            'message': 'Statut de livraison confirmé',
            'order': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": f"Erreur lors de la confirmation: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ==================== DELIVERY DASHBOARD API ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_delivery_calendar(request):
    """
    Récupère le calendrier des livraisons pour un livreur
    Paramètres: year, month (optionnels pour filtrer)
    Inclut les assignements avec leurs statuts pour la coloration du calendrier
    """
    try:
        # Vérifier que l'utilisateur est un livreur
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Utilisateur n'est pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    year = request.query_params.get('year')
    month = request.query_params.get('month')

    queryset = DeliveryDay.objects.filter(driver=driver)

    if year and month:
        from django.utils import timezone
        from datetime import date
        year = int(year)
        month = int(month)
        queryset = queryset.filter(
            delivery_date__year=year,
            delivery_date__month=month
        )

    # Récupérer TOUS les assignements du livreur pour la période
    from django.db.models import Q
    from datetime import date as date_type

    # Déterminer la plage de dates basée sur le mois/année filtré
    if year and month:
        start_date = date_type(year, month, 1)
        # Dernier jour du mois
        if month == 12:
            end_date = date_type(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(year, month + 1, 1) - timedelta(days=1)
    else:
        # Si pas de filtre, utiliser la date actuelle
        now = date_type.today()
        start_date = date_type(now.year, now.month, 1)
        if now.month == 12:
            end_date = date_type(now.year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date_type(now.year, now.month + 1, 1) - timedelta(days=1)

    # Récupérer tous les assignements du livreur dans cette période
    all_assignments = OrderAssignment.objects.filter(
        driver=driver,
        assigned_at__date__gte=start_date,
        assigned_at__date__lte=end_date
    ).select_related('order')

    # Grouper les assignements par date
    assignments_by_date = {}
    for assignment in all_assignments:
        assignment_date = assignment.assigned_at.date()
        if assignment_date not in assignments_by_date:
            assignments_by_date[assignment_date] = []
        assignments_by_date[assignment_date].append(assignment)

    # Construire la réponse avec les assignements réels
    response_data = []

    # Créer un jour de livraison pour chaque date qui a des assignements
    for assignment_date, assignments_list in sorted(assignments_by_date.items()):
        # Compter les livrées/confirmées
        completed_count = sum(1 for a in assignments_list if a.status in ['completed', 'confirmed'])
        total_count = len(assignments_list)

        # Calculer les totaux
        total_earnings = sum(a.order.total for a in assignments_list if a.order.total)

        day_data = {
            'id': f'day-{assignment_date.isoformat()}',  # Génération d'ID unique
            'delivery_date': assignment_date.isoformat(),
            'num_deliveries': total_count,
            'total_distance': 0,  # Non disponible directement
            'total_earnings': float(total_earnings),
            'estimated_time': 0,  # Non disponible directement
            'performance_rating': 'good',  # Défaut
            'is_available': True,
            'assignments': []
        }

        # Ajouter les assignements
        for assignment in assignments_list:
            day_data['assignments'].append({
                'id': assignment.id,
                'status': assignment.status,
                'order_id': assignment.order_id,
                'order_number': assignment.order.order_number
            })

        response_data.append(day_data)

    # Ajouter aussi les DeliveryDay records si elles existent
    for delivery_day in queryset:
        # Vérifier si cette date a déjà été ajoutée
        date_str = delivery_day.delivery_date.isoformat()
        if not any(d['delivery_date'] == date_str for d in response_data):
            day_data = {
                'id': delivery_day.id,
                'delivery_date': delivery_day.delivery_date.isoformat(),
                'num_deliveries': delivery_day.num_deliveries,
                'total_distance': delivery_day.total_distance,
                'total_earnings': delivery_day.total_earnings,
                'estimated_time': delivery_day.estimated_time,
                'performance_rating': delivery_day.performance_rating,
                'is_available': delivery_day.is_available,
                'assignments': []
            }
            response_data.append(day_data)

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def manage_driver_availability(request):
    """
    Récupère ou met à jour la disponibilité du livreur
    GET: Récupère la disponibilité actuelle (crée une nouvelle si n'existe pas)
    POST/PUT: Crée ou met à jour la disponibilité
    """
    try:
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Utilisateur n'est pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        # Récupérer ou créer la disponibilité par défaut
        availability, created = DriverAvailability.objects.get_or_create(
            driver=driver,
            defaults={
                'is_active': True,
                'available_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'start_time': '08:00',
                'end_time': '18:00',
                'max_daily_deliveries': 10,
                'daily_earnings_goal': 100
            }
        )
        serializer = DriverAvailabilitySerializer(availability)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        # Créer une nouvelle disponibilité ou remplacer l'existante
        availability, created = DriverAvailability.objects.get_or_create(driver=driver)
        serializer = DriverAvailabilitySerializer(availability, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(serializer.data, status=status_code)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'PUT':
        # Mettre à jour la disponibilité existante (crée si n'existe pas)
        availability, created = DriverAvailability.objects.get_or_create(driver=driver)
        serializer = DriverAvailabilitySerializer(availability, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delivery_day_details(request, day_id):
    """
    Récupère les détails d'une journée de livraison avec les routes
    """
    try:
        delivery_day = DeliveryDay.objects.get(id=day_id)
        # Vérifier que le livreur est propriétaire de cette journée
        if delivery_day.driver.user != request.user:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = DeliveryDaySerializer(delivery_day)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except DeliveryDay.DoesNotExist:
        return Response(
            {"error": "Journée de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_delivery_day(request, day_id):
    """
    Met à jour les statistiques d'une journée de livraison
    """
    try:
        delivery_day = DeliveryDay.objects.get(id=day_id)
        # Vérifier que le livreur est propriétaire de cette journée
        if delivery_day.driver.user != request.user:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = DeliveryDaySerializer(delivery_day, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except DeliveryDay.DoesNotExist:
        return Response(
            {"error": "Journée de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delivery_routes(request, day_id):
    """
    Récupère les routes de livraison pour une journée
    """
    try:
        delivery_day = DeliveryDay.objects.get(id=day_id)
        if delivery_day.driver.user != request.user:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        routes = DeliveryRoute.objects.filter(delivery_day=delivery_day).order_by('route_order')
        serializer = DeliveryRouteSerializer(routes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except DeliveryDay.DoesNotExist:
        return Response(
            {"error": "Journée de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_delivery_route(request, route_id):
    """
    Met à jour le statut d'une route de livraison
    """
    try:
        route = DeliveryRoute.objects.get(id=route_id)
        if route.delivery_day.driver.user != request.user:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = DeliveryRouteSerializer(route, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except DeliveryRoute.DoesNotExist:
        return Response(
            {"error": "Route de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_delivery_history(request, day_id):
    """
    Récupère l'historique réel des livraisons pour un jour spécifique
    Retourne les commandes réellement acceptées/complétées par le livreur ce jour-là
    """
    try:
        # Vérifier que l'utilisateur est un livreur
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Récupérer la journée de livraison
        delivery_day = DeliveryDay.objects.get(id=day_id, driver=driver)
    except DeliveryDay.DoesNotExist:
        return Response(
            {"error": "Journée de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Récupérer tous les OrderAssignment pour ce livreur ce jour-là
    assignments = OrderAssignment.objects.filter(
        driver=driver,
        status__in=['accepted', 'completed'],
        accepted_at__date=delivery_day.delivery_date
    ).select_related('order').order_by('accepted_at')

    # Construire la réponse avec les données réelles
    deliveries = []
    for idx, assignment in enumerate(assignments, 1):
        order = assignment.order
        delivery_data = {
            'id': assignment.id,
            'route_order': idx,
            'order_id': order.id,
            'order_number': order.order_number,
            'customer_name': order.user.get_full_name() or order.user.username,
            'shipping_address': order.shipping_address,
            'shipping_city': order.shipping_city,
            'shipping_postal_code': order.shipping_postal_code,
            'total': float(order.total),
            'items_count': order.items.count(),
            'payment_method': order.payment_method,
            'status': assignment.status,
            'accepted_at': assignment.accepted_at.isoformat() if assignment.accepted_at else None,
            'completed_at': assignment.completed_at.isoformat() if assignment.completed_at else None,
            'items': [
                {
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.subtotal),
                    'store_name': item.store_name
                }
                for item in order.items.all()
            ]
        }
        deliveries.append(delivery_data)

    return Response({
        'delivery_date': delivery_day.delivery_date.isoformat(),
        'total_deliveries': len(deliveries),
        'total_distance': float(delivery_day.total_distance),
        'total_earnings': float(delivery_day.total_earnings),
        'estimated_time': delivery_day.estimated_time,
        'performance_rating': delivery_day.performance_rating,
        'deliveries': deliveries
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def transfer_undelivered_orders(request, day_id):
    """
    Transfère automatiquement les commandes non livrées au jour suivant
    POST: Transfère les commandes avec status 'assigned' ou 'accepted' au jour suivant
    """
    try:
        # Vérifier que l'utilisateur est un livreur
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Récupérer la journée de livraison
        delivery_day = DeliveryDay.objects.get(id=day_id, driver=driver)
    except DeliveryDay.DoesNotExist:
        return Response(
            {"error": "Journée de livraison non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Récupérer les commandes non livrées pour ce jour
    undelivered_assignments = OrderAssignment.objects.filter(
        driver=driver,
        status__in=['assigned', 'accepted'],
        accepted_at__date=delivery_day.delivery_date
    )

    # Créer la journée de livraison pour le lendemain
    next_day = delivery_day.delivery_date + timedelta(days=1)
    next_delivery_day, created = DeliveryDay.objects.get_or_create(
        driver=driver,
        delivery_date=next_day,
        defaults={
            'num_deliveries': 0,
            'total_distance': 0,
            'total_earnings': 0,
            'estimated_time': 0,
            'performance_rating': 'average',
            'is_available': True
        }
    )

    # Compter les commandes transférées
    transferred_count = 0

    # Transférer chaque commande non livrée
    for assignment in undelivered_assignments:
        # Mettre à jour la date d'acceptation pour le jour suivant
        # Garder le même statut mais la mettre au jour suivant
        assignment.accepted_at = datetime.combine(next_day, datetime.min.time())
        assignment.save()
        transferred_count += 1

    return Response({
        'success': True,
        'message': f'{transferred_count} commande(s) transférée(s) au jour suivant',
        'transferred_count': transferred_count,
        'next_day': next_delivery_day.delivery_date.isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_order_delivery(request, assignment_id):
    """
    Confirme la livraison d'une commande (passe le statut à 'confirmed')
    POST: Marque la commande comme confirmée par le client
    """
    try:
        # Vérifier que l'utilisateur est un livreur
        driver = Driver.objects.get(user=request.user)
    except Driver.DoesNotExist:
        return Response(
            {"error": "Vous n'êtes pas un livreur"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        # Récupérer l'assignement
        assignment = OrderAssignment.objects.get(id=assignment_id, driver=driver)
    except OrderAssignment.DoesNotExist:
        return Response(
            {"error": "Assignement de commande non trouvé"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Mettre à jour le statut à 'confirmed'
    assignment.status = 'confirmed'
    assignment.confirmed_at = datetime.now()
    assignment.save()

    return Response({
        'success': True,
        'message': 'Commande confirmée avec succès',
        'assignment': OrderAssignmentSerializer(assignment).data
    }, status=status.HTTP_200_OK)


# Invoice Management Endpoints

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_invoices(request):
    """
    List all invoices for admin panel or driver dashboard
    """
    # Admin can see all invoices, drivers can only see their own
    if request.user.groups.filter(name='Admin').exists():
        invoices = Invoice.objects.all().order_by('-issued_at')
    else:
        # Driver sees invoices from their own orders
        try:
            driver = Driver.objects.get(user=request.user)
            invoices = Invoice.objects.filter(driver=driver).order_by('-issued_at')
        except Driver.DoesNotExist:
            return Response(
                {"error": "Utilisateur n'est pas un livreur"},
                status=status.HTTP_403_FORBIDDEN
            )

    # Pagination
    paginator = Paginator(invoices, 10)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    serializer = InvoiceSerializer(page_obj, many=True)

    return Response({
        'count': paginator.count,
        'total_pages': paginator.num_pages,
        'current_page': page_number,
        'results': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_detail(request, invoice_id):
    """
    Retrieve a single invoice by ID
    """
    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response(
            {"error": "Facture non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permissions: admin or invoice owner
    if not (request.user.groups.filter(name='Admin').exists() or
            invoice.driver.user == request.user):
        return Response(
            {"error": "Vous n'avez pas accès à cette facture"},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = InvoiceSerializer(invoice)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_invoice_pdf(request, invoice_id):
    """
    Download the PDF file for an invoice
    """
    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response(
            {"error": "Facture non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permissions
    if not (request.user.groups.filter(name='Admin').exists() or
            invoice.driver.user == request.user):
        return Response(
            {"error": "Vous n'avez pas accès à cette facture"},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if PDF exists
    if not invoice.pdf_file:
        return Response(
            {"error": "Le fichier PDF n'a pas encore été généré"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Return file response
    file_handle = invoice.pdf_file.open('rb')
    response = FileResponse(file_handle, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_invoice_pdf(request, invoice_id):
    """
    Regenerate PDF for an invoice (admin only)
    """
    if not request.user.groups.filter(name='Admin').exists():
        return Response(
            {"error": "Seul l'administrateur peut régénérer les factures"},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        invoice = Invoice.objects.get(id=invoice_id)
    except Invoice.DoesNotExist:
        return Response(
            {"error": "Facture non trouvée"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        # Import here to avoid circular imports
        from .invoice_utils import save_invoice_pdf
        save_invoice_pdf(invoice)
        return Response({
            'success': True,
            'message': 'PDF régénéré avec succès',
            'invoice': InvoiceSerializer(invoice).data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Erreur lors de la régénération du PDF: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============ NOTIFICATION ENDPOINTS ============

class NotificationListView(APIView):
    """
    Get user's notifications with filtering and pagination
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get notifications for authenticated user
        Query params:
        - is_read: 'true'/'false' to filter by read status
        - notification_type: filter by notification type
        - limit: number of notifications to return (default 20)
        - offset: pagination offset (default 0)
        """
        user = request.user
        notifications = Notification.objects.filter(user=user)

        # Filter by read status
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
            notifications = notifications.filter(is_read=is_read)

        # Filter by notification type
        notification_type = request.query_params.get('notification_type')
        if notification_type:
            notifications = notifications.filter(notification_type=notification_type)

        # Pagination
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))

        total_count = notifications.count()
        unread_count = notifications.filter(is_read=False).count()

        notifications = notifications[offset:offset + limit]

        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            'count': total_count,
            'unread_count': unread_count,
            'limit': limit,
            'offset': offset,
            'results': serializer.data
        }, status=status.HTTP_200_OK)


class NotificationMarkAsReadView(APIView):
    """
    Mark notification as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        """
        Mark a specific notification as read
        """
        user = request.user
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        from django.utils import timezone
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()

        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK
        )


class NotificationMarkAllAsReadView(APIView):
    """
    Mark all user's notifications as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Mark all notifications for the user as read
        """
        user = request.user
        from django.utils import timezone

        notifications = Notification.objects.filter(user=user, is_read=False)
        count = notifications.count()

        notifications.update(is_read=True, read_at=timezone.now())

        return Response({
            'success': True,
            'message': f'{count} notifications marquées comme lues'
        }, status=status.HTTP_200_OK)


class NotificationDeleteView(APIView):
    """
    Delete a notification
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        """
        Delete a specific notification
        """
        user = request.user
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.delete()
        return Response(
            {"success": True, "message": "Notification supprimée"},
            status=status.HTTP_200_OK
        )


class NotificationActionView(APIView):
    """
    Handle notification actions (confirm/reject delivery)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        """
        Take action on a notification
        Body: {
            "action": "confirmed" or "rejected"
        }
        """
        user = request.user
        action = request.data.get('action')

        if action not in ['confirmed', 'rejected']:
            return Response(
                {"error": "Action invalide. Doit être 'confirmed' ou 'rejected'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            notification = Notification.objects.get(id=notification_id, user=user)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.action_taken = action
        notification.is_read = True
        from django.utils import timezone
        notification.read_at = timezone.now()
        notification.save()

        # If this is a delivery confirmation/rejection notification, update order status
        if notification.notification_type == 'order_delivered' and notification.order:
            order = notification.order
            if action == 'confirmed':
                order.status = 'received'
            elif action == 'rejected':
                order.status = 'disputed'
            order.save()

        return Response({
            'success': True,
            'message': f'Action "{action}" enregistrée',
            'notification': NotificationSerializer(notification).data
        }, status=status.HTTP_200_OK)
