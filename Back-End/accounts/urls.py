from django.urls import path
from .views import (
    RegisterView, LoginView, UserView, AddressListCreateView, AddressDetailView,
    ChangePasswordView, OrderListCreateView, OrderDetailView,
    DriverDashboardView, DriverAssignedOrdersView, DriverAcceptOrderView,
    DriverRejectOrderView, AdminAssignOrderToDriverView, AdminGetDriversView,
    DriverCompleteOrderView, ConfirmDeliveryView,
    driver_delivery_calendar, manage_driver_availability, delivery_day_details,
    update_delivery_day, delivery_routes, update_delivery_route,
    driver_delivery_history, transfer_undelivered_orders, confirm_order_delivery,
    list_invoices, invoice_detail, download_invoice_pdf, regenerate_invoice_pdf,
    NotificationListView, NotificationMarkAsReadView, NotificationMarkAllAsReadView,
    NotificationDeleteView, NotificationActionView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', RegisterView, name='register'),
    path('login/', LoginView, name='login'),  # Login personnalisé avec email/password
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/', UserView, name='user'),
    path('addresses/', AddressListCreateView, name='addresses_list_create'),
    path('addresses/<int:address_id>/', AddressDetailView, name='address_detail'),
    path('change-password/', ChangePasswordView, name='change_password'),
    path('orders/', OrderListCreateView, name='orders_list_create'),
    path('orders/<int:order_id>/', OrderDetailView, name='order_detail'),
    path('orders/<int:order_id>/confirm-delivery/', ConfirmDeliveryView, name='confirm_delivery'),

    # Driver routes
    path('driver/dashboard/', DriverDashboardView, name='driver_dashboard'),
    path('driver/orders/', DriverAssignedOrdersView, name='driver_assigned_orders'),
    path('driver/orders/<int:assignment_id>/accept/', DriverAcceptOrderView, name='driver_accept_order'),
    path('driver/orders/<int:assignment_id>/reject/', DriverRejectOrderView, name='driver_reject_order'),
    path('driver/orders/<int:assignment_id>/complete/', DriverCompleteOrderView, name='driver_complete_order'),

    # Driver calendar and delivery routes
    path('driver/calendar/', driver_delivery_calendar, name='driver_calendar'),
    path('driver/availability/', manage_driver_availability, name='driver_availability'),
    path('driver/delivery-day/<int:day_id>/', delivery_day_details, name='delivery_day_details'),
    path('driver/delivery-day/<int:day_id>/update/', update_delivery_day, name='update_delivery_day'),
    path('driver/delivery-day/<int:day_id>/routes/', delivery_routes, name='delivery_routes'),
    path('driver/delivery-day/<int:day_id>/history/', driver_delivery_history, name='driver_delivery_history'),
    path('driver/delivery-day/<int:day_id>/transfer/', transfer_undelivered_orders, name='transfer_undelivered_orders'),
    path('driver/delivery-route/<int:route_id>/update/', update_delivery_route, name='update_delivery_route'),
    path('driver/order/<int:assignment_id>/confirm/', confirm_order_delivery, name='confirm_order_delivery'),

    # Admin routes (order assignment)
    path('admin/assign-order/', AdminAssignOrderToDriverView, name='admin_assign_order'),
    path('admin/drivers/', AdminGetDriversView, name='admin_get_drivers'),

    # Invoice management routes
    path('invoices/', list_invoices, name='list_invoices'),
    path('invoices/<int:invoice_id>/', invoice_detail, name='invoice_detail'),
    path('invoices/<int:invoice_id>/download/', download_invoice_pdf, name='download_invoice_pdf'),
    path('invoices/<int:invoice_id>/regenerate/', regenerate_invoice_pdf, name='regenerate_invoice_pdf'),

    # Notification routes
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/<int:notification_id>/mark-as-read/', NotificationMarkAsReadView.as_view(), name='notification_mark_as_read'),
    path('notifications/mark-all-as-read/', NotificationMarkAllAsReadView.as_view(), name='notification_mark_all_as_read'),
    path('notifications/<int:notification_id>/delete/', NotificationDeleteView.as_view(), name='notification_delete'),
    path('notifications/<int:notification_id>/action/', NotificationActionView.as_view(), name='notification_action'),

    # FacialLoginView - DISABLED (requires face_recognition library)
]
