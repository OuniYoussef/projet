"""
Django signals for account-related events
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import OrderAssignment, Notification, Order
from .invoice_utils import create_invoice_for_assignment, save_invoice_pdf
from django.utils import timezone


@receiver(post_save, sender=OrderAssignment)
def generate_invoice_on_acceptance(sender, instance, created, update_fields, **kwargs):
    """
    Signal handler to create an invoice when an OrderAssignment is accepted by a driver
    """
    # Check if the status was changed to 'accepted'
    if instance.status == 'accepted' and instance.accepted_at:
        # Check if invoice doesn't already exist
        if not hasattr(instance, 'invoice'):
            # Create invoice
            invoice = create_invoice_for_assignment(instance)

            # Generate PDF
            try:
                save_invoice_pdf(invoice)
            except Exception as e:
                print(f"Error generating PDF for invoice {invoice.invoice_number}: {str(e)}")


# ============ NOTIFICATION SIGNAL HANDLERS ============

@receiver(post_save, sender=OrderAssignment)
def notify_on_order_assignment(sender, instance, created, **kwargs):
    """
    Create notification when admin assigns an order to a driver
    """
    if created:  # Only on creation (assignment)
        try:
            Notification.objects.create(
                user=instance.driver.user,
                notification_type='order_assigned',
                message=f"Une commande (#{instance.order.order_number}) vous a été assignée",
                order=instance.order,
                driver=instance.driver,
                order_assignment=instance
            )
        except Exception as e:
            print(f"Error creating assignment notification: {str(e)}")


@receiver(post_save, sender=OrderAssignment)
def notify_on_order_accepted(sender, instance, created, **kwargs):
    """
    Create notification for customer when driver accepts order
    """
    if instance.status == 'accepted' and instance.accepted_at:
        try:
            Notification.objects.create(
                user=instance.order.user,
                notification_type='order_accepted',
                message=f"Votre commande (#{instance.order.order_number}) a été acceptée par le livreur",
                order=instance.order,
                driver=instance.driver,
                order_assignment=instance
            )
        except Exception as e:
            print(f"Error creating acceptance notification: {str(e)}")


@receiver(post_save, sender=OrderAssignment)
def notify_on_order_rejected(sender, instance, created, **kwargs):
    """
    Create notification for customer when driver rejects order
    """
    if instance.status == 'rejected' and instance.rejected_at:
        try:
            Notification.objects.create(
                user=instance.order.user,
                notification_type='order_rejected',
                message=f"Votre commande (#{instance.order.order_number}) a été refusée par le livreur",
                order=instance.order,
                driver=instance.driver,
                order_assignment=instance
            )
        except Exception as e:
            print(f"Error creating rejection notification: {str(e)}")


@receiver(post_save, sender=OrderAssignment)
def notify_on_order_completed(sender, instance, created, **kwargs):
    """
    Create notification for customer when driver marks order as delivered
    """
    if instance.status == 'completed' and instance.completed_at:
        try:
            Notification.objects.create(
                user=instance.order.user,
                notification_type='order_delivered',
                message=f"Votre commande (#{instance.order.order_number}) a été livrée. Veuillez confirmer la réception.",
                order=instance.order,
                driver=instance.driver,
                order_assignment=instance
            )
        except Exception as e:
            print(f"Error creating delivery notification: {str(e)}")


@receiver(post_save, sender=Order)
def notify_on_order_status_change(sender, instance, created, update_fields, **kwargs):
    """
    Create notifications based on order status changes
    """
    if not created and update_fields and 'status' in update_fields:
        old_status = Order.objects.filter(pk=instance.pk).values('status').first()

        try:
            # Notify on order confirmation
            if instance.status == 'confirmed':
                Notification.objects.create(
                    user=instance.user,
                    notification_type='order_confirmed',
                    message=f"Votre commande (#{instance.order_number}) a été confirmée",
                    order=instance
                )

            # Notify on order cancellation
            elif instance.status == 'cancelled':
                Notification.objects.create(
                    user=instance.user,
                    notification_type='order_cancelled',
                    message=f"Votre commande (#{instance.order_number}) a été annulée",
                    order=instance
                )

            # Notify on order received
            elif instance.status == 'received':
                Notification.objects.create(
                    user=instance.user,
                    notification_type='delivery_confirmed',
                    message=f"Votre commande (#{instance.order_number}) a été confirmée comme reçue",
                    order=instance
                )

            # Notify on disputed status
            elif instance.status == 'disputed':
                Notification.objects.create(
                    user=instance.user,
                    notification_type='delivery_rejected',
                    message=f"Un problème a été signalé avec votre commande (#{instance.order_number})",
                    order=instance
                )
        except Exception as e:
            print(f"Error creating order status notification: {str(e)}")
