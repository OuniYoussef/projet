# Generated migration to add Invoice model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_alter_driveravailability_structure'),
    ]

    operations = [
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invoice_number', models.CharField(max_length=50, unique=True)),
                ('status', models.CharField(choices=[('draft', 'Brouillon'), ('issued', 'Émise'), ('paid', 'Payée'), ('cancelled', 'Annulée')], default='issued', max_length=20)),
                ('customer_name', models.CharField(max_length=255)),
                ('customer_email', models.EmailField(max_length=254)),
                ('customer_phone', models.CharField(blank=True, max_length=30)),
                ('customer_address', models.TextField()),
                ('seller_name', models.CharField(max_length=255)),
                ('seller_email', models.EmailField(max_length=254)),
                ('seller_phone', models.CharField(blank=True, max_length=30)),
                ('seller_address', models.TextField(blank=True)),
                ('subtotal', models.FloatField(default=0)),
                ('shipping_cost', models.FloatField(default=0)),
                ('tax', models.FloatField(default=0)),
                ('total', models.FloatField(default=0)),
                ('issued_at', models.DateTimeField(auto_now_add=True)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('pdf_file', models.FileField(blank=True, null=True, upload_to='invoices/%Y/%m/%d/')),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='accounts.driver')),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='invoice', to='accounts.order')),
                ('order_assignment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='invoice', to='accounts.orderassignment')),
            ],
            options={
                'ordering': ['-issued_at'],
            },
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['invoice_number'], name='accounts_inv_invoice_61f8e9_idx'),
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['driver'], name='accounts_inv_driver_id_7d2c4a_idx'),
        ),
        migrations.AddIndex(
            model_name='invoice',
            index=models.Index(fields=['status'], name='accounts_inv_status_8f3e1b_idx'),
        ),
    ]
