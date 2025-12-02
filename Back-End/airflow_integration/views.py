"""
Django Views pour l'intégration Airflow
API endpoints pour les DAGs et leur exécution
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
import os
from .airflow_client import AirflowClient

logger = logging.getLogger(__name__)

# Initialiser le client Airflow
# When the backend runs in a different Docker stack than Airflow, localhost points to the backend container.
# Use host.docker.internal (exposed by Docker Desktop) or an overrideable env var so we can reach the host-mapped Airflow API port.
AIRFLOW_BASE_URL = os.getenv("AIRFLOW_API_URL", "http://host.docker.internal:8080")
AIRFLOW_API_USER = os.getenv("AIRFLOW_API_USER", "airflow")
AIRFLOW_API_PASSWORD = os.getenv("AIRFLOW_API_PASSWORD", "airflow")
airflow_client = AirflowClient(
    base_url=AIRFLOW_BASE_URL,
    username=AIRFLOW_API_USER,
    password=AIRFLOW_API_PASSWORD
)


# ==================== Health Check ====================

@api_view(['GET'])
def airflow_health(request):
    """
    Endpoint: GET /api/airflow/health/
    Vérifier si Airflow est disponible
    """
    try:
        health = airflow_client.get_health()
        if health.get('status') == 'healthy':
            return Response({
                'status': 'success',
                'airflow_status': 'healthy',
                'message': 'Airflow is running',
                'details': health.get('details', {})
            })
        else:
            return Response({
                'status': 'warning',
                'airflow_status': health.get('status', 'unknown'),
                'message': 'Airflow is not healthy',
                'details': health.get('details', {})
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return Response({
            'status': 'error',
            'airflow_status': 'unavailable',
            'message': str(e)
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ==================== DAG Management ====================

@api_view(['GET'])
def list_dags(request):
    """
    Endpoint: GET /api/airflow/dags/
    Récupérer la liste de tous les DAGs

    Query parameters:
        - limit: Nombre de DAGs (défaut: 100)
        - offset: Offset pour la pagination (défaut: 0)
    """
    try:
        limit = int(request.query_params.get('limit', 100))
        offset = int(request.query_params.get('offset', 0))

        dags = airflow_client.get_all_dags(limit=limit, offset=offset)

        return Response({
            'status': 'success',
            'total_entries': dags.get('total_entries', 0),
            'dags': dags.get('dags', [])
        })
    except Exception as e:
        logger.error(f"Error listing DAGs: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_dag_detail(request, dag_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/
    Récupérer les détails d'un DAG spécifique
    """
    try:
        dag = airflow_client.get_dag(dag_id)

        return Response({
            'status': 'success',
            'dag': dag
        })
    except Exception as e:
        logger.error(f"Error getting DAG {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': f"DAG '{dag_id}' not found"
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_dag_tasks(request, dag_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/tasks/
    Récupérer la liste des tâches d'un DAG
    """
    try:
        tasks = airflow_client.get_dag_tasks(dag_id)

        return Response({
            'status': 'success',
            'dag_id': dag_id,
            'tasks': tasks,
            'total_tasks': len(tasks)
        })
    except Exception as e:
        logger.error(f"Error getting tasks for DAG {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== DAG Execution ====================

@api_view(['POST'])
def trigger_dag(request, dag_id):
    """
    Endpoint: POST /api/airflow/dags/<dag_id>/trigger/
    Déclencher l'exécution d'un DAG

    Body (JSON):
        {
            "conf": {"key": "value"},  # optionnel
            "note": "Triggered from Django"  # optionnel
        }
    """
    try:
        conf = request.data.get('conf')
        note = request.data.get('note', f'Triggered from Django backend')

        result = airflow_client.trigger_dag(dag_id, conf=conf, note=note)

        return Response({
            'status': 'success',
            'message': f"DAG '{dag_id}' triggered successfully",
            'dag_id': result.get('dag_id'),
            'run_id': result.get('dag_run_id'),
            'execution_date': result.get('execution_date')
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Error triggering DAG {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== DAG Runs ====================

@api_view(['GET'])
def get_dag_runs(request, dag_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/runs/
    Récupérer l'historique d'exécution d'un DAG

    Query parameters:
        - limit: Nombre de runs (défaut: 10)
        - offset: Offset pour la pagination (défaut: 0)
        - state: Filtrer par état (success, failed, running, etc.)
    """
    try:
        limit = int(request.query_params.get('limit', 10))
        offset = int(request.query_params.get('offset', 0))
        state = request.query_params.get('state')

        runs = airflow_client.get_dag_runs(dag_id, limit=limit, offset=offset, state=state)

        # Formater les résultats
        formatted_runs = [airflow_client.format_dag_run(run) for run in runs.get('dag_runs', [])]

        return Response({
            'status': 'success',
            'dag_id': dag_id,
            'total_entries': runs.get('total_entries', 0),
            'runs': formatted_runs
        })
    except Exception as e:
        logger.error(f"Error getting DAG runs for {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_dag_run(request, dag_id, run_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/runs/<run_id>/
    Récupérer les infos d'une exécution spécifique
    """
    try:
        run = airflow_client.get_dag_run(dag_id, run_id)
        formatted_run = airflow_client.format_dag_run(run)

        return Response({
            'status': 'success',
            'run': formatted_run
        })
    except Exception as e:
        logger.error(f"Error getting DAG run {dag_id}/{run_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_latest_dag_run(request, dag_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/latest-run/
    Récupérer la dernière exécution d'un DAG
    """
    try:
        run = airflow_client.get_latest_dag_run(dag_id)

        if not run:
            return Response({
                'status': 'info',
                'message': f"No runs found for DAG '{dag_id}'"
            }, status=status.HTTP_404_NOT_FOUND)

        formatted_run = airflow_client.format_dag_run(run)

        return Response({
            'status': 'success',
            'run': formatted_run
        })
    except Exception as e:
        logger.error(f"Error getting latest run for {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== DAG Statistics ====================

@api_view(['GET'])
def get_dag_stats(request, dag_id):
    """
    Endpoint: GET /api/airflow/dags/<dag_id>/stats/
    Récupérer les statistiques d'un DAG
    """
    try:
        stats = airflow_client.get_dag_stats(dag_id)

        return Response({
            'status': 'success',
            'dag_id': dag_id,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Error getting stats for {dag_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== Scrapers Shortcuts ====================

@api_view(['POST'])
def trigger_scraper(request, scraper_name):
    """
    Endpoint: POST /api/airflow/scrapers/<scraper_name>/trigger/
    Déclencher l'exécution d'un scraper spécifique

    Scrapers disponibles:
        - chillandlit
        - mytek
        - spacenet
        - tunisianet
        - parashop
    """
    scrapers = {
        'chillandlit': 'chillandlit_scraper_dag',
        'mytek': 'mytek_scraper_dag',
        'spacenet': 'spacenet_scraper_dag',
        'tunisianet': 'tunisianet_scraper_dag',
        'parashop': 'parashop_scraper_dag'
    }

    if scraper_name not in scrapers:
        return Response({
            'status': 'error',
            'message': f"Unknown scraper: {scraper_name}",
            'available_scrapers': list(scrapers.keys())
        }, status=status.HTTP_400_BAD_REQUEST)

    dag_id = scrapers[scraper_name]

    try:
        result = airflow_client.trigger_dag(dag_id)

        return Response({
            'status': 'success',
            'message': f"Scraper '{scraper_name}' triggered successfully",
            'scraper': scraper_name,
            'dag_id': result.get('dag_id'),
            'run_id': result.get('dag_run_id'),
            'execution_date': result.get('execution_date')
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.error(f"Error triggering scraper {scraper_name}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_scraper_status(request, scraper_name):
    """
    Endpoint: GET /api/airflow/scrapers/<scraper_name>/status/
    Récupérer le statut d'un scraper
    """
    scrapers = {
        'chillandlit': 'chillandlit_scraper_dag',
        'mytek': 'mytek_scraper_dag',
        'spacenet': 'spacenet_scraper_dag',
        'tunisianet': 'tunisianet_scraper_dag',
        'parashop': 'parashop_scraper_dag'
    }

    if scraper_name not in scrapers:
        return Response({
            'status': 'error',
            'message': f"Unknown scraper: {scraper_name}"
        }, status=status.HTTP_400_BAD_REQUEST)

    dag_id = scrapers[scraper_name]

    try:
        run = airflow_client.get_latest_dag_run(dag_id)

        if not run:
            return Response({
                'status': 'info',
                'scraper': scraper_name,
                'message': 'No runs found'
            })

        formatted_run = airflow_client.format_dag_run(run)

        return Response({
            'status': 'success',
            'scraper': scraper_name,
            'last_run': formatted_run
        })
    except Exception as e:
        logger.error(f"Error getting status for scraper {scraper_name}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
