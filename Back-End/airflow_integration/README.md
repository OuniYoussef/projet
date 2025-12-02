# Airflow Integration - Django REST API

Cette application Django fournit une intégration complète avec l'API REST d'Airflow, permettant à ton backend Django de contrôler et surveiller les DAGs et les scrapers.

## 🎯 Caractéristiques

✅ **Client API Airflow** - Classe réutilisable pour interagir avec Airflow
✅ **Django REST Endpoints** - Endpoints API REST pour contrôler les DAGs
✅ **Gestion des DAGs** - Lister, déclencher et surveiller les DAGs
✅ **Gestion des Scrapers** - Endpoints spécialisés pour les 5 scrapers
✅ **Statistiques** - Récupérer les stats d'exécution
✅ **Historique** - Accéder à l'historique complet des exécutions
✅ **Health Check** - Vérifier l'état d'Airflow

## 📂 Structure des Fichiers

```
airflow_integration/
├── __init__.py              # Package initialization
├── apps.py                  # Django app configuration
├── airflow_client.py        # Client API Airflow (classe principale)
├── views.py                 # Vues Django REST
├── urls.py                  # URL routing
├── tests.py                 # Tests unitaires
└── README.md                # Cette documentation
```

## 🚀 Installation Rapide

### 1. Copie le package
```bash
cp -r airflow_integration/ /path/to/django/project/
```

### 2. Ajoute à INSTALLED_APPS (settings.py)
```python
INSTALLED_APPS = [
    # ...
    'airflow_integration',
]
```

### 3. Ajoute les URLs (urls.py)
```python
urlpatterns = [
    # ...
    path('api/airflow/', include('airflow_integration.urls')),
]
```

### 4. Installe les dépendances
```bash
pip install -r airflow_integration_requirements.txt
```

## 📝 Utilisation

### Via l'API REST (Recommandé)

```bash
# Déclencher un scraper
curl -X POST http://localhost:8000/api/airflow/scrapers/chillandlit/trigger/

# Récupérer le statut
curl -X GET http://localhost:8000/api/airflow/scrapers/chillandlit/status/

# Lister tous les DAGs
curl -X GET http://localhost:8000/api/airflow/dags/
```

### Via Python/Django

```python
from airflow_integration import AirflowClient

client = AirflowClient()

# Vérifier si Airflow est disponible
if client.is_available():
    # Déclencher un scraper
    result = client.trigger_dag('chillandlit_scraper_dag')
    print(f"Run ID: {result['dag_run_id']}")

    # Récupérer le dernier run
    latest = client.get_latest_dag_run('chillandlit_scraper_dag')
    print(f"Status: {latest['state']}")

    # Récupérer les stats
    stats = client.get_dag_stats('chillandlit_scraper_dag')
    print(f"Success: {stats['success']}, Failed: {stats['failed']}")
```

## 🔌 Endpoints Disponibles

### Santé
- `GET /api/airflow/health/` - Vérifier l'état d'Airflow

### DAGs
- `GET /api/airflow/dags/` - Lister tous les DAGs
- `GET /api/airflow/dags/<dag_id>/` - Détails d'un DAG
- `GET /api/airflow/dags/<dag_id>/tasks/` - Tâches d'un DAG
- `POST /api/airflow/dags/<dag_id>/trigger/` - Déclencher un DAG

### Exécutions
- `GET /api/airflow/dags/<dag_id>/runs/` - Historique
- `GET /api/airflow/dags/<dag_id>/runs/<run_id>/` - Détails d'une exécution
- `GET /api/airflow/dags/<dag_id>/latest-run/` - Dernière exécution

### Statistiques
- `GET /api/airflow/dags/<dag_id>/stats/` - Statistiques d'un DAG

### Scrapers (Raccourcis)
- `POST /api/airflow/scrapers/<name>/trigger/` - Déclencher un scraper
- `GET /api/airflow/scrapers/<name>/status/` - Statut d'un scraper

Scrapers disponibles:
- `chillandlit`
- `mytek`
- `spacenet`
- `tunisianet`
- `parashop`

## 🔒 Sécurité

### Variables d'Environnement

Crée un fichier `.env`:
```
AIRFLOW_URL=http://localhost:8080
AIRFLOW_USERNAME=airflow
AIRFLOW_PASSWORD=airflow
```

Utilise-le:
```python
import os
from dotenv import load_dotenv

load_dotenv()

AIRFLOW_CONFIG = {
    'BASE_URL': os.getenv('AIRFLOW_URL'),
    'USERNAME': os.getenv('AIRFLOW_USERNAME'),
    'PASSWORD': os.getenv('AIRFLOW_PASSWORD'),
}
```

### Authentification Django

Protège les endpoints:
```python
from django.contrib.auth.decorators import login_required

@login_required
@api_view(['POST'])
def trigger_dag(request, dag_id):
    # ...
```

## 🧪 Tests

```bash
# Exécuter les tests
python manage.py test airflow_integration

# Avec verbosité
python manage.py test airflow_integration -v 2

# Tests spécifiques
python manage.py test airflow_integration.tests.AirflowClientTests
```

## 📊 Exemple: Dashboard

```python
# views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from airflow_integration import AirflowClient

@api_view(['GET'])
def dashboard(request):
    client = AirflowClient()

    scrapers = {
        'chillandlit': 'chillandlit_scraper_dag',
        'mytek': 'mytek_scraper_dag',
        'spacenet': 'spacenet_scraper_dag',
        'tunisianet': 'tunisianet_scraper_dag',
        'parashop': 'parashop_scraper_dag'
    }

    dashboard_data = {}
    for name, dag_id in scrapers.items():
        try:
            stats = client.get_dag_stats(dag_id)
            run = client.get_latest_dag_run(dag_id)
            dashboard_data[name] = {
                'stats': stats,
                'latest': client.format_dag_run(run) if run else None
            }
        except Exception as e:
            dashboard_data[name] = {'error': str(e)}

    return Response(dashboard_data)
```

## 🐛 Troubleshooting

### Airflow non disponible
```
Error: Could not connect to http://localhost:8080
```
**Solution**: Vérifie que Airflow est en cours d'exécution et accessible à cette URL.

### Authentification échouée
```
Error: Unauthorized - check username/password
```
**Solution**: Vérifie les identifiants Airflow dans les variables d'environnement.

### CORS error (en frontend)
**Solution**: Configure CORS dans Django settings:
```python
INSTALLED_APPS = [
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Frontend URL
]
```

## 📚 Documentation Complète

Pour plus de détails, consulte [AIRFLOW_DJANGO_INTEGRATION.md](../AIRFLOW_DJANGO_INTEGRATION.md)

## 📄 Licence

MIT License

## 🤝 Contribution

Les contributions sont bienvenues ! N'hésite pas à proposer des améliorations.

## 📧 Support

Pour les questions ou problèmes, crée un issue ou contacte l'équipe.
