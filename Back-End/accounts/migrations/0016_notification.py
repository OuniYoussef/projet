# Generated migration to add Notification model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_invoice'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('order_confirmed', 'Commande confirmée'), ('order_assigned', 'Commande assignée au livreur'), ('order_accepted', 'Commande acceptée par le livreur'), ('order_rejected', 'Commande refusée par le livreur'), ('order_in_transit', 'Commande en transit'), ('order_delivered', 'Commande livrée'), ('delivery_confirmed', 'Livraison confirmée par le client'), ('delivery_rejected', 'Livraison refusée par le client'), ('order_cancelled', 'Commande annulée')], max_length=30)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('action_taken', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='driver_notifications', to='accounts.driver')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.order')),
                ('order_assignment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='accounts.orderassignment')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-created_at'], name='accounts_not_user_id_ae2c3e_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read'], name='accounts_not_user_id_7f4b2d_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['notification_type'], name='accounts_not_notif_8g5e4f_idx'),
        ),
    ]
