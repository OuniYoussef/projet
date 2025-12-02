# Generated migration to update DriverAvailability model structure
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_orderassignment_scheduled_delivery_date'),
    ]

    operations = [
        # Remove old fields
        migrations.RemoveField(
            model_name='driveravailability',
            name='available_from',
        ),
        migrations.RemoveField(
            model_name='driveravailability',
            name='available_until',
        ),
        # Update working_days to use dict default and store per-day schedules
        migrations.AlterField(
            model_name='driveravailability',
            name='working_days',
            field=models.JSONField(blank=True, default=dict, help_text='Per-day schedule with times'),
        ),
    ]
