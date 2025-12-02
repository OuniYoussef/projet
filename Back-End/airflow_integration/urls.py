"""
Django URLs Configuration pour Airflow Integration
Endpoints API pour les DAGs, Scrapers et Produits
"""

from django.urls import path
from . import views
from . import products_views

app_name = 'airflow_integration'

urlpatterns = [
    # ==================== Health Check ====================
    path('health/', views.airflow_health, name='health'),

    # ==================== DAG Management ====================
    path('dags/', views.list_dags, name='list_dags'),
    path('dags/<str:dag_id>/', views.get_dag_detail, name='get_dag'),
    path('dags/<str:dag_id>/tasks/', views.get_dag_tasks, name='get_dag_tasks'),

    # ==================== DAG Execution ====================
    path('dags/<str:dag_id>/trigger/', views.trigger_dag, name='trigger_dag'),

    # ==================== DAG Runs ====================
    path('dags/<str:dag_id>/runs/', views.get_dag_runs, name='get_dag_runs'),
    path('dags/<str:dag_id>/runs/<str:run_id>/', views.get_dag_run, name='get_dag_run'),
    path('dags/<str:dag_id>/latest-run/', views.get_latest_dag_run, name='get_latest_dag_run'),

    # ==================== DAG Statistics ====================
    path('dags/<str:dag_id>/stats/', views.get_dag_stats, name='get_dag_stats'),

    # ==================== Scrapers Shortcuts ====================
    path('scrapers/<str:scraper_name>/trigger/', views.trigger_scraper, name='trigger_scraper'),
    path('scrapers/<str:scraper_name>/status/', views.get_scraper_status, name='get_scraper_status'),

    # ==================== Products CRUD ====================
    path('products/', products_views.get_products, name='get_products'),
    path('products/<int:product_id>/', products_views.get_product_by_id, name='get_product'),
    path('products/search/', products_views.search_products, name='search_products'),
    path('products/stats/', products_views.get_products_stats, name='get_products_stats'),
    path('products/store-counts/', products_views.get_store_product_counts, name='get_store_product_counts'),

    # ==================== Products by Store ====================
    path('products/store/<str:store_name>/', products_views.get_products_by_store, name='get_products_by_store'),
    path('products/store/<str:store_name>/stats/', products_views.get_store_stats, name='get_store_stats'),

    # ==================== Products by Category ====================
    path('products/category/<str:category>/', products_views.get_products_by_category, name='get_products_by_category'),

    # ==================== Unique Products (canonical catalogue) ====================
    path('unique-products/search/', products_views.search_unique_products, name='search_unique_products'),
    path('unique-products/<int:product_id>/', products_views.get_unique_product, name='get_unique_product'),
]
