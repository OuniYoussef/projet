# Generated migration file - placeholder

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_alter_order_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderassignment',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
