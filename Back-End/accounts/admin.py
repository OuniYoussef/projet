from django.contrib import admin, messages
from django.contrib.auth.models import User
from .models import Profile, Address, Order, OrderItem, Driver, OrderAssignment, Invoice
from .forms import DriverAdminForm
from .invoice_admin_actions import export_invoices_to_excel, export_invoices_to_pdf
from .admin_actions import export_to_pdf, export_to_excel
from django.utils.html import format_html
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import timedelta

# Profile Admin
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'city', 'postal_code')
    search_fields = ('user__username', 'user__email', 'phone', 'city')
    actions = [export_to_pdf, export_to_excel]

admin.site.register(Profile, ProfileAdmin)

# Address Admin
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'address_type', 'street', 'city', 'postal_code', 'is_default')
    list_filter = ('address_type', 'is_default')
    search_fields = ('user__username', 'user__email', 'street', 'city')
    ordering = ('-created_at',)
    actions = [export_to_pdf, export_to_excel]

admin.site.register(Address, AddressAdmin)

# OrderItem Inline
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'store_name', 'price', 'quantity', 'subtotal')

# Order Admin
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'status', 'payment_method', 'payment_status', 'total', 'created_at')
    list_filter = ('status', 'payment_method', 'payment_status', 'created_at')
    search_fields = ('order_number', 'user__username', 'user__email')
    readonly_fields = ('order_number', 'created_at', 'updated_at')
    inlines = [OrderItemInline]
    ordering = ('-created_at',)
    actions = [export_to_pdf, export_to_excel]

admin.site.register(Order, OrderAdmin)


# OrderAssignment Inline
class OrderAssignmentInline(admin.TabularInline):
    model = OrderAssignment
    extra = 0
    readonly_fields = ('assigned_at', 'accepted_at', 'rejected_at', 'completed_at')


# Driver Admin
class DriverAdmin(admin.ModelAdmin):
    form = DriverAdminForm
    list_display = ('get_full_name', 'get_email', 'phone', 'vehicle_type', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'phone')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Informations utilisateur', {
            'fields': ('first_name', 'last_name', 'email', 'password')
        }),
        ('Informations du livreur', {
            'fields': ('phone', 'vehicle_type', 'vehicle_plate', 'is_active')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [OrderAssignmentInline]
    ordering = ('-created_at',)
    actions = [export_to_pdf, export_to_excel]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_full_name.short_description = 'Nom du livreur'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    def save_model(self, request, obj, form, change):
        """
        Sauvegarde le modèle et envoie l'email si c'est une création
        """
        super().save_model(request, obj, form, change)

        # Envoyer l'email si c'est une création et si le formulaire a les infos
        if hasattr(form, '_is_new_driver') and form._is_new_driver:
            from .email_utils import send_driver_credentials_email

            success, message = send_driver_credentials_email(
                form._driver_email,
                form._driver_username,
                form._driver_password,
                form._driver_full_name
            )

            if success:
                self.message_user(
                    request,
                    f"✅ Livreur créé avec succès! Email d'identifiants envoyé à {form._driver_email}",
                    messages.SUCCESS
                )
            else:
                self.message_user(
                    request,
                    f"⚠️ Livreur créé mais erreur email: {message}",
                    messages.WARNING
                )


admin.site.register(Driver, DriverAdmin)


# OrderAssignment Admin
class OrderAssignmentAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'driver_name', 'status', 'assigned_at', 'accepted_at')
    list_filter = ('status', 'assigned_at')
    search_fields = ('order__order_number', 'driver__user__username', 'driver__user__email')
    readonly_fields = ('assigned_at', 'accepted_at', 'rejected_at', 'completed_at')
    ordering = ('-assigned_at',)
    actions = [export_to_pdf, export_to_excel]

    def order_number(self, obj):
        return obj.order.order_number
    order_number.short_description = 'Numéro de commande'

    def driver_name(self, obj):
        return obj.driver.user.get_full_name() or obj.driver.user.username
    driver_name.short_description = 'Livreur'


admin.site.register(OrderAssignment, OrderAssignmentAdmin)


# Filtre personnalisé par montant
class InvoiceTotalFilter(admin.SimpleListFilter):
    title = 'Montant total'
    parameter_name = 'total_range'

    def lookups(self, request, model_admin):
        return (
            ('<100', 'Moins de 100 TND'),
            ('100-500', '100 - 500 TND'),
            ('500-1000', '500 - 1000 TND'),
            ('>1000', 'Plus de 1000 TND'),
        )

    def queryset(self, request, queryset):
        if self.value() == '<100':
            return queryset.filter(total__lt=100)
        if self.value() == '100-500':
            return queryset.filter(total__gte=100, total__lt=500)
        if self.value() == '500-1000':
            return queryset.filter(total__gte=500, total__lt=1000)
        if self.value() == '>1000':
            return queryset.filter(total__gte=1000)
        return queryset


# Filtre personnalisé par date
class InvoiceDateFilter(admin.SimpleListFilter):
    title = 'Période'
    parameter_name = 'date_range'

    def lookups(self, request, model_admin):
        return (
            ('today', "Aujourd'hui"),
            ('7days', 'Cette semaine'),
            ('30days', 'Ce mois'),
            ('90days', 'Ces 3 mois'),
        )

    def queryset(self, request, queryset):
        today = timezone.now().date()
        if self.value() == 'today':
            return queryset.filter(issued_at__date=today)
        if self.value() == '7days':
            start_date = today - timedelta(days=7)
            return queryset.filter(issued_at__date__gte=start_date)
        if self.value() == '30days':
            start_date = today - timedelta(days=30)
            return queryset.filter(issued_at__date__gte=start_date)
        if self.value() == '90days':
            start_date = today - timedelta(days=90)
            return queryset.filter(issued_at__date__gte=start_date)
        return queryset


# Invoice Admin
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'get_order_number', 'get_driver_name', 'status_colored', 'get_total_formatted', 'issued_at_formatted', 'has_pdf')
    list_filter = ('status', 'issued_at', InvoiceTotalFilter, InvoiceDateFilter, 'driver__user__first_name')
    search_fields = ('invoice_number', 'order__order_number', 'driver__user__username', 'driver__user__email', 'customer_name', 'customer_email')
    readonly_fields = ('invoice_number', 'issued_at', 'pdf_file')
    list_per_page = 25
    date_hierarchy = 'issued_at'

    fieldsets = (
        ('Informations facture', {
            'fields': ('invoice_number', 'status', 'issued_at', 'due_date', 'paid_at')
        }),
        ('Informations client', {
            'fields': ('customer_name', 'customer_email', 'customer_phone', 'customer_address')
        }),
        ('Informations vendeur', {
            'fields': ('seller_name', 'seller_email', 'seller_phone', 'seller_address')
        }),
        ('Montants', {
            'fields': ('subtotal', 'shipping_cost', 'tax', 'total')
        }),
        ('Relations', {
            'fields': ('driver', 'order', 'order_assignment')
        }),
        ('Fichier PDF', {
            'fields': ('pdf_file',)
        }),
    )

    actions = [export_invoices_to_excel, export_invoices_to_pdf]
    ordering = ('-issued_at',)

    def get_order_number(self, obj):
        return obj.order.order_number
    get_order_number.short_description = 'Numéro de commande'

    def get_driver_name(self, obj):
        return obj.driver.user.get_full_name() or obj.driver.user.username
    get_driver_name.short_description = 'Livreur'

    def status_colored(self, obj):
        """Affiche le statut avec une couleur"""
        colors = {
            'draft': '#FFC107',
            'issued': '#17A2B8',
            'paid': '#28A745',
            'cancelled': '#DC3545',
        }
        color = colors.get(obj.status, '#6C757D')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_colored.short_description = 'Statut'

    def get_total_formatted(self, obj):
        """Format le montant total"""
        return format_html('<strong>{} TND</strong>', f'{obj.total:.2f}')
    get_total_formatted.short_description = 'Montant Total'

    def issued_at_formatted(self, obj):
        """Format la date d'émission"""
        return obj.issued_at.strftime('%d/%m/%Y %H:%M')
    issued_at_formatted.short_description = 'Date d\'émission'

    def has_pdf(self, obj):
        """Indique si un PDF est disponible"""
        if obj.pdf_file:
            return format_html('<span style="color: green;">✓ PDF</span>')
        return format_html('<span style="color: red;">✗ Aucun PDF</span>')
    has_pdf.short_description = 'PDF'

    def changelist_view(self, request, extra_context=None):
        """Ajouter des statistiques au changelist view"""
        from django.db.models import Count
        extra_context = extra_context or {}

        # Statistiques
        qs = self.get_queryset(request)
        total_invoices = qs.count()
        total_revenue = qs.aggregate(Sum('total'))['total__sum'] or 0
        paid_invoices = qs.filter(status='paid').count()

        extra_context.update({
            'total_invoices': total_invoices,
            'total_revenue': total_revenue,
            'paid_invoices': paid_invoices,
        })

        return super().changelist_view(request, extra_context)


admin.site.register(Invoice, InvoiceAdmin)
