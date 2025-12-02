# Generated migration file for DeliveryDay, DriverAvailability, and DeliveryRoute models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_orderassignment_confirmed_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderassignment',
            name='scheduled_delivery_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='DriverAvailability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_available', models.BooleanField(default=True)),
                ('available_from', models.TimeField(blank=True, null=True)),
                ('available_until', models.TimeField(blank=True, null=True)),
                ('working_days', models.JSONField(blank=True, default=list)),
                ('max_deliveries_per_day', models.IntegerField(default=10)),
                ('notes', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('driver', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='availability', to='accounts.driver')),
            ],
        ),
        migrations.CreateModel(
            name='DeliveryDay',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('delivery_date', models.DateField()),
                ('num_deliveries', models.IntegerField(default=0)),
                ('total_earnings', models.FloatField(default=0)),
                ('performance_rating', models.CharField(choices=[('excellent', 'Excellent'), ('good', 'Bon'), ('normal', 'Normal'), ('poor', 'Mauvais')], default='normal', max_length=20)),
                ('is_completed', models.BooleanField(default=False)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='delivery_days', to='accounts.driver')),
            ],
            options={
                'ordering': ['-delivery_date'],
            },
        ),
        migrations.CreateModel(
            name='DeliveryRoute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('route_order', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('pending', 'En attente'), ('in_transit', 'En transit'), ('delivered', 'Livrée'), ('failed', 'Échouée')], default='pending', max_length=20)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('delivery_day', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='routes', to='accounts.deliveryday')),
                ('order_assignment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='accounts.orderassignment')),
            ],
            options={
                'ordering': ['delivery_day', 'route_order'],
            },
        ),
        migrations.AddConstraint(
            model_name='deliveryday',
            constraint=models.UniqueConstraint(fields=('driver', 'delivery_date'), name='unique_driver_delivery_date'),
        ),
    ]
