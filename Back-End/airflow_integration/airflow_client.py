"""
Airflow API Client
Intégration avec l'API REST d'Airflow pour Django Backend
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)


class AirflowClient:
    """Client pour interagir avec l'API REST d'Airflow"""

    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        username: str = "airflow",
        password: str = "airflow",
        timeout: int = 30
    ):
        """
        Initialiser le client Airflow

        Args:
            base_url: URL de base d'Airflow (ex: http://localhost:8080)
            username: Nom d'utilisateur Airflow
            password: Mot de passe Airflow
            timeout: Timeout des requêtes en secondes
        """
        self.base_url = base_url.rstrip('/')
        self.auth = HTTPBasicAuth(username, password)
        self.timeout = timeout
        self.session = requests.Session()
        self.session.auth = self.auth

    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> requests.Response:
        """
        Effectuer une requête HTTP

        Args:
            method: Méthode HTTP (GET, POST, etc.)
            endpoint: Endpoint de l'API (ex: /api/v1/dags)
            **kwargs: Arguments supplémentaires pour requests

        Returns:
            Response object
        """
        url = f"{self.base_url}{endpoint}"
        kwargs.setdefault('timeout', self.timeout)

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la requête {method} {url}: {str(e)}")
            raise

    # ==================== DAG Endpoints ====================

    def get_all_dags(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """
        Récupérer la liste de tous les DAGs

        Args:
            limit: Nombre maximum de DAGs à retourner
            offset: Offset pour la pagination

        Returns:
            Dict contenant la liste des DAGs
        """
        params = {'limit': limit, 'offset': offset}
        response = self._request('GET', '/api/v1/dags', params=params)
        return response.json()

    def get_dag(self, dag_id: str) -> Dict[str, Any]:
        """
        Récupérer les informations d'un DAG spécifique

        Args:
            dag_id: ID du DAG

        Returns:
            Dict contenant les infos du DAG
        """
        response = self._request('GET', f'/api/v1/dags/{dag_id}')
        return response.json()

    def get_dag_tasks(self, dag_id: str) -> List[Dict[str, Any]]:
        """
        Récupérer la liste des tâches d'un DAG

        Args:
            dag_id: ID du DAG

        Returns:
            Liste des tâches
        """
        response = self._request('GET', f'/api/v1/dags/{dag_id}/tasks')
        return response.json().get('tasks', [])

    # ==================== DAG Run Endpoints ====================

    def trigger_dag(
        self,
        dag_id: str,
        conf: Optional[Dict[str, Any]] = None,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Déclencher l'exécution d'un DAG

        Args:
            dag_id: ID du DAG à déclencher
            conf: Configuration du DAG (optionnel)
            note: Note pour l'exécution (optionnel)

        Returns:
            Dict contenant l'info de la nouvelle exécution
        """
        payload = {}
        if conf:
            payload['conf'] = conf
        if note:
            payload['note'] = note

        response = self._request(
            'POST',
            f'/api/v1/dags/{dag_id}/dagRuns',
            json=payload
        )
        return response.json()

    def get_dag_runs(
        self,
        dag_id: str,
        limit: int = 10,
        offset: int = 0,
        state: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Récupérer l'historique d'exécution d'un DAG

        Args:
            dag_id: ID du DAG
            limit: Nombre maximum de runs
            offset: Offset pour la pagination
            state: Filtrer par état (success, failed, running, etc.)

        Returns:
            Dict contenant la liste des DAG runs
        """
        params = {
            'limit': limit,
            'offset': offset
        }
        if state:
            params['state'] = state

        response = self._request(
            'GET',
            f'/api/v1/dags/{dag_id}/dagRuns',
            params=params
        )
        return response.json()

    def get_dag_run(self, dag_id: str, run_id: str) -> Dict[str, Any]:
        """
        Récupérer les infos d'une exécution spécifique

        Args:
            dag_id: ID du DAG
            run_id: ID de l'exécution

        Returns:
            Dict contenant les infos de l'exécution
        """
        response = self._request(
            'GET',
            f'/api/v1/dags/{dag_id}/dagRuns/{run_id}'
        )
        return response.json()

    def get_latest_dag_run(self, dag_id: str) -> Optional[Dict[str, Any]]:
        """
        Récupérer la dernière exécution d'un DAG

        Args:
            dag_id: ID du DAG

        Returns:
            Dict contenant l'info de la dernière exécution, ou None si aucune
        """
        runs = self.get_dag_runs(dag_id, limit=1)
        if runs.get('dag_runs'):
            return runs['dag_runs'][0]
        return None

    # ==================== Task Instance Endpoints ====================

    def get_task_instances(
        self,
        dag_id: str,
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Récupérer les instances de tâches d'un DAG

        Args:
            dag_id: ID du DAG
            limit: Nombre maximum
            offset: Offset pour la pagination

        Returns:
            Dict contenant la liste des instances de tâches
        """
        params = {
            'limit': limit,
            'offset': offset
        }
        response = self._request(
            'GET',
            f'/api/v1/dags/{dag_id}/dagRuns',
            params=params
        )
        return response.json()

    # ==================== Statistics ====================

    def get_dag_stats(self, dag_id: str) -> Dict[str, Any]:
        """
        Récupérer les statistiques d'un DAG

        Args:
            dag_id: ID du DAG

        Returns:
            Dict contenant les statistiques (runs réussis, échoués, etc.)
        """
        runs = self.get_dag_runs(dag_id, limit=100)
        stats = {
            'total_runs': len(runs.get('dag_runs', [])),
            'success': 0,
            'failed': 0,
            'running': 0,
            'skipped': 0
        }

        for run in runs.get('dag_runs', []):
            state = run.get('state', '').lower()
            if state == 'success':
                stats['success'] += 1
            elif state == 'failed':
                stats['failed'] += 1
            elif state == 'running':
                stats['running'] += 1
            elif state == 'skipped':
                stats['skipped'] += 1

        return stats

    def get_health(self) -> Dict[str, Any]:
        """
        Vérifier la santé d'Airflow

        Returns:
            Dict contenant le statut de santé
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/v2/monitor/health",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            component_statuses = []
            for value in data.values():
                if isinstance(value, dict):
                    status = value.get("status")
                    if status:
                        component_statuses.append(status.lower())

            overall = "healthy" if component_statuses and all(s == "healthy" for s in component_statuses) else "warning"

            return {
                "status": overall,
                "details": data
            }
        except Exception as e:
            logger.error(f"Erreur lors de la vérification de santé: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    # ==================== Utility Methods ====================

    def is_available(self) -> bool:
        """Vérifier si Airflow est disponible"""
        try:
            health = self.get_health()
            return health.get('status') == 'healthy'
        except:
            return False

    def format_dag_run(self, run: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formater les données d'un DAG run pour l'API frontend

        Args:
            run: Dict du DAG run

        Returns:
            Dict formaté
        """
        return {
            'dag_id': run.get('dag_id'),
            'run_id': run.get('dag_run_id'),
            'state': run.get('state'),
            'execution_date': run.get('execution_date'),
            'start_date': run.get('start_date'),
            'end_date': run.get('end_date'),
            'duration': self._calculate_duration(
                run.get('start_date'),
                run.get('end_date')
            ),
            'note': run.get('note'),
            'conf': run.get('conf')
        }

    @staticmethod
    def _calculate_duration(start_date: str, end_date: str) -> Optional[int]:
        """
        Calculer la durée entre deux dates

        Args:
            start_date: Date de début
            end_date: Date de fin

        Returns:
            Durée en secondes, ou None
        """
        if not start_date or not end_date:
            return None

        try:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            return int((end - start).total_seconds())
        except:
            return None
