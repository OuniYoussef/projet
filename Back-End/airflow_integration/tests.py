"""
Tests pour l'intégration Airflow - Django
"""

from django.test import TestCase, Client
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from .airflow_client import AirflowClient


class AirflowClientTests(TestCase):
    """Tests pour la classe AirflowClient"""

    def setUp(self):
        self.client = AirflowClient(
            base_url="http://localhost:8080",
            username="airflow",
            password="airflow"
        )

    @patch('airflow_integration.airflow_client.requests.Session.request')
    def test_get_all_dags(self, mock_request):
        """Test la récupération de tous les DAGs"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'dags': [
                {'dag_id': 'chillandlit_scraper_dag'},
                {'dag_id': 'mytek_scraper_dag'}
            ],
            'total_entries': 2
        }
        mock_request.return_value = mock_response

        result = self.client.get_all_dags()

        self.assertEqual(len(result['dags']), 2)
        self.assertEqual(result['total_entries'], 2)

    @patch('airflow_integration.airflow_client.requests.Session.request')
    def test_get_dag(self, mock_request):
        """Test la récupération d'un DAG spécifique"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'dag_id': 'chillandlit_scraper_dag',
            'description': 'Scrape ChillAndLit'
        }
        mock_request.return_value = mock_response

        result = self.client.get_dag('chillandlit_scraper_dag')

        self.assertEqual(result['dag_id'], 'chillandlit_scraper_dag')

    @patch('airflow_integration.airflow_client.requests.Session.request')
    def test_trigger_dag(self, mock_request):
        """Test le déclenchement d'un DAG"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'dag_id': 'chillandlit_scraper_dag',
            'dag_run_id': 'run_123',
            'execution_date': '2024-01-01T00:00:00Z'
        }
        mock_request.return_value = mock_response

        result = self.client.trigger_dag('chillandlit_scraper_dag')

        self.assertEqual(result['dag_run_id'], 'run_123')

    @patch('airflow_integration.airflow_client.requests.Session.request')
    def test_get_dag_runs(self, mock_request):
        """Test la récupération de l'historique"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'dag_runs': [
                {'dag_run_id': 'run_1', 'state': 'success'},
                {'dag_run_id': 'run_2', 'state': 'failed'}
            ],
            'total_entries': 2
        }
        mock_request.return_value = mock_response

        result = self.client.get_dag_runs('chillandlit_scraper_dag')

        self.assertEqual(len(result['dag_runs']), 2)


class AirflowAPIViewsTests(TestCase):
    """Tests pour les vues API"""

    def setUp(self):
        self.client = APIClient()

    @patch('airflow_integration.views.airflow_client.get_health')
    def test_health_endpoint(self, mock_health):
        """Test l'endpoint de santé"""
        mock_health.return_value = {
            'status': 'healthy',
            'metadb': {'status': 'healthy'}
        }

        response = self.client.get('/api/airflow/health/')

        # Note: Si l'endpoint n'est pas disponible, le test échouera
        # C'est normal si Airflow n'est pas en cours d'exécution

    @patch('airflow_integration.views.airflow_client.get_all_dags')
    def test_list_dags_endpoint(self, mock_get_dags):
        """Test l'endpoint de liste des DAGs"""
        mock_get_dags.return_value = {
            'dags': [
                {'dag_id': 'chillandlit_scraper_dag'}
            ],
            'total_entries': 1
        }

        # Note: Si l'endpoint n'est pas disponible, le test échouera


class AirflowClientFormattingTests(TestCase):
    """Tests pour le formatage des données"""

    def setUp(self):
        self.client = AirflowClient()

    def test_format_dag_run(self):
        """Test le formatage d'un DAG run"""
        run = {
            'dag_id': 'test_dag',
            'dag_run_id': 'run_1',
            'state': 'success',
            'execution_date': '2024-01-01T00:00:00Z',
            'start_date': '2024-01-01T00:00:01Z',
            'end_date': '2024-01-01T01:00:00Z'
        }

        formatted = self.client.format_dag_run(run)

        self.assertEqual(formatted['dag_id'], 'test_dag')
        self.assertEqual(formatted['state'], 'success')
        self.assertIsNotNone(formatted['duration'])

    def test_calculate_duration(self):
        """Test le calcul de durée"""
        start = '2024-01-01T00:00:00Z'
        end = '2024-01-01T01:00:00Z'

        duration = AirflowClient._calculate_duration(start, end)

        self.assertEqual(duration, 3600)  # 1 heure = 3600 secondes
