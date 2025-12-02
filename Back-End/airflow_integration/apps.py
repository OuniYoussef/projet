"""
Django App Configuration pour Airflow Integration
"""

from django.apps import AppConfig


class AirflowIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'airflow_integration'
    verbose_name = 'Airflow Integration'
