from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile, FacialPhoto, Address, Order, OrderItem, Driver, OrderAssignment, DeliveryDay, DriverAvailability, DeliveryRoute, Invoice, Notification
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator
import base64
from django.core.files.base import ContentFile
import json
# Facial recognition imports disabled - requires face_recognition and numpy
# import numpy as np
# import face_recognition
from io import BytesIO
from PIL import Image

# Facial recognition function disabled
# def extract_face_embedding_from_base64(img_base64):
#     """
#     Extract face embedding from base64 image
#     Returns: 128-dim numpy array if face detected, None otherwise
#     """


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['phone', 'address', 'city', 'postal_code', 'gender', 'birth_date', 'interests']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'address_type', 'street', 'city', 'postal_code', 'country', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']

class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all(), message="Cet email est déjà utilisé.")]
    )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    # champs du profile (acceptés via la même requête)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    postal_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gender = serializers.ChoiceField(write_only=True, choices=Profile.GENDER_CHOICES, required=False, allow_blank=True)
    birth_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    interests = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    # Photos faciales
    facial_photos = serializers.DictField(write_only=True, required=False, child=serializers.CharField())

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name',
                  'phone', 'address', 'city', 'postal_code', 'gender', 'birth_date', 'interests', 'facial_photos')

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({"password": "Les deux mots de passe ne correspondent pas."})
        return attrs

    def create(self, validated_data):
        # extrait champs profile
        phone = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')
        city = validated_data.pop('city', '')
        postal_code = validated_data.pop('postal_code', '')
        gender = validated_data.pop('gender', '')
        birth_date = validated_data.pop('birth_date', None)
        interests = validated_data.pop('interests', [])
        facial_photos = validated_data.pop('facial_photos', {})

        validated_data.pop('password2', None)
        password = validated_data.pop('password')

        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        user.set_password(password)
        user.save()

        # créer profile
        Profile.objects.create(
            user=user,
            phone=phone,
            address=address,
            city=city,
            postal_code=postal_code,
            gender=gender if gender else '',
            birth_date=birth_date,
            interests=interests or []
        )

        # Facial photo registration disabled - requires face_recognition library
        # The facial_photos parameter is accepted but not processed
        # To re-enable this feature:
        # 1. Restore face_recognition and numpy to requirements.txt
        # 2. Restore the extract_face_embedding_from_base64 function above
        # 3. Uncomment the code below

        return user


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product_id', 'product_name', 'store_name', 'price', 'quantity', 'subtotal']
        read_only_fields = ['id']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'payment_method', 'payment_status',
            'shipping_address', 'shipping_city', 'shipping_postal_code', 'shipping_country',
            'subtotal', 'shipping_cost', 'total', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at']


class DriverSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Driver
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'vehicle_type', 'vehicle_plate', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderAssignmentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    order_details = OrderSerializer(source='order', read_only=True)
    driver_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderAssignment
        fields = [
            'id', 'order_number', 'order_details', 'driver_name', 'status',
            'assigned_at', 'accepted_at', 'rejected_at', 'completed_at', 'rejection_reason',
            'confirmed_at', 'scheduled_delivery_date'
        ]
        read_only_fields = ['id', 'assigned_at', 'accepted_at', 'rejected_at', 'completed_at']

    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name() or obj.driver.user.username


class DriverAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverAvailability
        fields = [
            'id', 'driver', 'is_available',
            'working_days', 'max_deliveries_per_day', 'notes', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class DeliveryDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryDay
        fields = [
            'id', 'driver', 'delivery_date', 'num_deliveries', 'total_earnings',
            'performance_rating', 'is_completed', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRoute
        fields = [
            'id', 'delivery_day', 'order_assignment', 'route_order', 'status',
            'started_at', 'completed_at', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    driver_name = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'order_number', 'order_id', 'driver_id', 'driver_name',
            'status', 'customer_name', 'customer_email', 'customer_phone', 'customer_address',
            'seller_name', 'seller_email', 'seller_phone', 'seller_address',
            'subtotal', 'shipping_cost', 'tax', 'total',
            'issued_at', 'due_date', 'paid_at', 'pdf_file', 'pdf_url'
        ]
        read_only_fields = ['id', 'invoice_number', 'issued_at', 'pdf_file']

    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name() or obj.driver.user.username

    def get_pdf_url(self, obj):
        if obj.pdf_file:
            return obj.pdf_file.url
        return None


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """
    user_id = serializers.IntegerField(read_only=True)
    order_id = serializers.IntegerField(allow_null=True, required=False)
    driver_id = serializers.IntegerField(allow_null=True, required=False)
    order_assignment_id = serializers.IntegerField(allow_null=True, required=False)
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'user_id', 'notification_type', 'notification_type_display',
            'message', 'order_id', 'driver_id', 'order_assignment_id',
            'is_read', 'action_taken', 'created_at', 'read_at'
        ]
        read_only_fields = ['id', 'created_at', 'notification_type_display']
