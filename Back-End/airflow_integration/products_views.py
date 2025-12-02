"""
Django Views pour la gestion des Produits
Accès à la table products de la base de données scraper
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from django.http import JsonResponse
import os
from decouple import config

logger = logging.getLogger(__name__)

def ensure_utf8(obj):
    """Ensure all strings in object are properly encoded"""
    if isinstance(obj, dict):
        return {k: ensure_utf8(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [ensure_utf8(item) for item in obj]
    elif isinstance(obj, bytes):
        # Essayer d'abord UTF-8, sinon LATIN1
        try:
            return obj.decode('utf-8')
        except UnicodeDecodeError:
            return obj.decode('latin-1', errors='replace')
    elif isinstance(obj, str):
        # Les strings venant de psycopg2 sont déjà décodées correctement
        # On ne fait rien, juste les retourner
        return obj
    return obj


def _parse_json_field(value):
    """Parse JSON fields that might be stored as strings."""
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value

# Configuration de la base de données scraper / catalogue
# Désormais les tables products et unique_products résident dans tuni_db (même DB que Django)
SCRAPER_DB_HOST = os.getenv("SCRAPER_DB_HOST", os.getenv("DB_HOST", "db"))
SCRAPER_DB_PORT = os.getenv("SCRAPER_DB_PORT", os.getenv("DB_PORT", "5432"))
SCRAPER_DB_NAME = os.getenv("SCRAPER_DB_NAME", os.getenv("DB_NAME", "tuni_db"))
SCRAPER_DB_USER = os.getenv("SCRAPER_DB_USER", os.getenv("DB_USER", "tuni_user"))
SCRAPER_DB_PASSWORD = os.getenv("SCRAPER_DB_PASSWORD", os.getenv("DB_PASSWORD", "tuni_pass"))

SCRAPER_DB_URL = (
    f"postgresql+psycopg2://{SCRAPER_DB_USER}:{SCRAPER_DB_PASSWORD}"
    f"@{SCRAPER_DB_HOST}:{SCRAPER_DB_PORT}/{SCRAPER_DB_NAME}"
)
engine = create_engine(
    SCRAPER_DB_URL,
    echo=False,
    connect_args={
        'client_encoding': 'UTF8',
    }
)
SessionLocal = sessionmaker(bind=engine)


# ==================== Products CRUD ====================

@api_view(['GET'])
def get_products(request):
    """
    Endpoint: GET /api/airflow/products/
    Récupérer tous les produits avec filtres optionnels

    Query parameters:
        - store: Filtrer par magasin (chillandlit, mytek, spacenet, tunisianet, parashop)
        - category: Filtrer par catégorie
        - limit: Nombre de résultats (défaut: 10, max: 100)
        - offset: Offset pour la pagination (défaut: 0)

    Example:
        GET /api/airflow/products/?store=chillandlit&limit=20&offset=0
    """
    session = SessionLocal()
    try:
        store = request.query_params.get('store')
        category = request.query_params.get('category')
        limit = min(int(request.query_params.get('limit', 10)), 100)
        offset = int(request.query_params.get('offset', 0))

        query = "SELECT * FROM products WHERE 1=1"
        params = {}

        if store:
            query += " AND store_name = :store"
            params['store'] = store

        if category:
            query += " AND category = :category"
            params['category'] = category

        query += " ORDER BY id DESC"
        query += f" LIMIT {limit} OFFSET {offset}"

        result = session.execute(text(query), params)
        products = [dict(row._mapping) for row in result]

        # Convertir les colonnes JSON/arrays en format approprié
        for product in products:
            if isinstance(product.get('images_links'), str):
                try:
                    product['images_links'] = product['images_links'].split(',')
                except:
                    product['images_links'] = []

        return Response({
            'status': 'success',
            'count': len(products),
            'limit': limit,
            'offset': offset,
            'products': products
        })
    except Exception as e:
        logger.error(f"Error getting products: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


@api_view(['GET'])
def get_product_by_id(request, product_id):
    """
    Endpoint: GET /api/airflow/products/<id>/
    Récupérer un produit spécifique par son ID

    Example:
        GET /api/airflow/products/123/
    """
    session = SessionLocal()
    try:
        query = "SELECT * FROM products WHERE id = :id"
        result = session.execute(text(query), {'id': product_id})
        product = result.fetchone()

        if not product:
            return Response({
                'status': 'error',
                'message': f'Product with ID {product_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)

        product_dict = dict(product._mapping)

        # Convertir images_links
        if isinstance(product_dict.get('images_links'), str):
            try:
                product_dict['images_links'] = product_dict['images_links'].split(',')
            except:
                product_dict['images_links'] = []

        return Response({
            'status': 'success',
            'product': product_dict
        })
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


# ==================== Products by Store ====================

@api_view(['GET'])
def get_products_by_store(request, store_name):
    """
    Endpoint: GET /api/airflow/products/store/<store_name>/
    Récupérer tous les produits d'un magasin spécifique

    Stores disponibles: chillandlit, mytek, spacenet, tunisianet, parashop

    Query parameters:
        - limit: Nombre de résultats (défaut: 20, max: 100)
        - offset: Offset pour la pagination
        - category: Filtrer par catégorie
        - subcategory: Filtrer par subcatégorie

    Example:
        GET /api/airflow/products/store/chillandlit/?limit=50
    """
    try:
        from django.db import connection
        from accounts.models import Product

        limit = min(int(request.query_params.get('limit', 20)), 100)
        offset = int(request.query_params.get('offset', 0))
        category = request.query_params.get('category')
        subcategory = request.query_params.get('subcategory')

        # Use Django ORM to query products from tuni_db
        query = Product.objects.filter(store_name=store_name)

        if category:
            query = query.filter(category=category)

        if subcategory:
            query = query.filter(subcategory=subcategory)

        # Order and paginate
        query = query.order_by('-id')[offset:offset + limit]

        # Convert to dictionaries
        products = []
        for product in query:
            product_dict = {
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'subcategory': product.subcategory,
                'sub_subcategory': product.sub_subcategory,
                'store_name': product.store_name,
                'product_link': product.product_link,
                'availability': product.availability,
                'current_price': product.current_price,
                'prev_price': product.prev_price,
                'description': product.description,
                'images_links': product.images_links if isinstance(product.images_links, list) else [],
                'product_reference': product.product_reference,
            }
            products.append(product_dict)

        response_data = {
            'status': 'success',
            'store': store_name,
            'count': len(products),
            'limit': limit,
            'offset': offset,
            'products': products
        }

        return Response(response_data)
    except Exception as e:
        logger.error(f"Error getting products for store {store_name}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# ==================== Search Products ====================

@api_view(['GET'])
def search_products(request):
    """
    Endpoint: GET /api/airflow/products/search/
    Chercher des produits avec filtres avancés

    Query parameters:
        - q: Terme de recherche (nom, description) - REQUIS
        - store: Filtrer par magasin
        - min_price: Prix minimum
        - max_price: Prix maximum
        - category: Filtrer par catégorie
        - availability: Filtrer par disponibilité (In Stock, Out of Stock)
        - limit: Nombre de résultats (défaut: 20, max: 100)

    Example:
        GET /api/airflow/products/search/?q=robe&store=chillandlit&min_price=50&max_price=200
    """
    session = SessionLocal()
    try:
        q = request.query_params.get('q', '').strip()

        if not q:
            return Response({
                'status': 'error',
                'message': 'Search query (q parameter) is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        store = request.query_params.get('store')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        category = request.query_params.get('category')
        availability = request.query_params.get('availability')
        limit = min(int(request.query_params.get('limit', 20)), 100)

        query = """
        SELECT * FROM products
        WHERE (name ILIKE :q OR description ILIKE :q)
        """
        params = {'q': f"%{q}%"}

        if store:
            query += " AND store_name = :store"
            params['store'] = store

        if category:
            query += " AND category = :category"
            params['category'] = category

        if min_price:
            query += " AND current_price >= :min_price"
            params['min_price'] = float(min_price)

        if max_price:
            query += " AND current_price <= :max_price"
            params['max_price'] = float(max_price)

        if availability:
            query += " AND availability = :availability"
            params['availability'] = availability

        query += " ORDER BY current_price DESC"
        query += f" LIMIT {limit}"

        result = session.execute(text(query), params)
        products = [dict(row._mapping) for row in result]

        for product in products:
            if isinstance(product.get('images_links'), str):
                try:
                    product['images_links'] = product['images_links'].split(',')
                except:
                    product['images_links'] = []

        return Response({
            'status': 'success',
            'query': q,
            'count': len(products),
            'limit': limit,
            'products': products
        })
    except Exception as e:
        logger.error(f"Error searching products: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


# ==================== Products Statistics ====================

@api_view(['GET'])
def get_products_stats(request):
    """
    Endpoint: GET /api/airflow/products/stats/
    Récupérer les statistiques sur les produits scrappés

    Returns:
        - total_products: Nombre total de produits
        - by_store: Nombre de produits par magasin
        - by_category: Top 10 catégories avec nombre de produits
        - avg_price_by_store: Prix moyen par magasin
        - availability_summary: Résumé disponibilité
    """
    session = SessionLocal()
    try:
        # Nombre total de produits
        total_query = "SELECT COUNT(*) FROM products"
        total = session.execute(text(total_query)).scalar()

        # Produits par magasin
        store_query = """
        SELECT store_name, COUNT(*) as count
        FROM products
        GROUP BY store_name
        ORDER BY count DESC
        """
        store_result = session.execute(text(store_query))
        by_store = {row[0]: row[1] for row in store_result}

        # Produits par catégorie (Top 10)
        category_query = """
        SELECT category, COUNT(*) as count
        FROM products
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
        """
        category_result = session.execute(text(category_query))
        by_category = {row[0]: row[1] for row in category_result}

        # Prix moyen par magasin
        price_query = """
        SELECT store_name, AVG(current_price) as avg_price, MIN(current_price) as min_price, MAX(current_price) as max_price
        FROM products
        WHERE current_price IS NOT NULL
        GROUP BY store_name
        """
        price_result = session.execute(text(price_query))
        avg_price = {}
        for row in price_result:
            avg_price[row[0]] = {
                'avg': float(row[1]) if row[1] else None,
                'min': float(row[2]) if row[2] else None,
                'max': float(row[3]) if row[3] else None
            }

        # Disponibilité résumé
        availability_query = """
        SELECT availability, COUNT(*) as count
        FROM products
        WHERE availability IS NOT NULL
        GROUP BY availability
        """
        availability_result = session.execute(text(availability_query))
        availability_summary = {row[0]: row[1] for row in availability_result}

        return Response({
            'status': 'success',
            'stats': {
                'total_products': total,
                'by_store': by_store,
                'by_category': by_category,
                'price_by_store': avg_price,
                'availability': availability_summary
            }
        })
    except Exception as e:
        logger.error(f"Error getting products stats: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


@api_view(['GET'])
def get_store_product_counts(request):
    """
    Endpoint: GET /api/airflow/products/store-counts/
    Retourne le nombre total de produits par magasin (table products).
    """
    session = SessionLocal()
    try:
        query = """
        SELECT store_name, COUNT(*) as count
        FROM products
        WHERE store_name IS NOT NULL
        GROUP BY store_name
        ORDER BY store_name
        """
        result = session.execute(text(query))
        store_counts = {row[0]: row[1] for row in result if row[0]}
        total_products = sum(store_counts.values())

        return Response({
            'status': 'success',
            'total_products': total_products,
            'store_counts': store_counts
        })
    except Exception as e:
        logger.error(f"Error getting store product counts: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


@api_view(['GET'])
def get_store_stats(request, store_name):
    """
    Endpoint: GET /api/airflow/products/store/<store_name>/stats/
    Récupérer les statistiques pour un magasin spécifique

    Returns:
        - total_products: Nombre total
        - by_category: Produits par catégorie
        - price_info: Infos sur les prix
        - availability: Disponibilité
    """
    session = SessionLocal()
    try:
        # Total pour ce magasin
        total_query = "SELECT COUNT(*) FROM products WHERE store_name = :store"
        total = session.execute(text(total_query), {'store': store_name}).scalar()

        # Par catégorie
        category_query = """
        SELECT category, COUNT(*) as count
        FROM products
        WHERE store_name = :store AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        """
        category_result = session.execute(text(category_query), {'store': store_name})
        by_category = {row[0]: row[1] for row in category_result}

        # Prix info
        price_query = """
        SELECT
            AVG(current_price) as avg,
            MIN(current_price) as min,
            MAX(current_price) as max,
            COUNT(*) as with_price
        FROM products
        WHERE store_name = :store AND current_price IS NOT NULL
        """
        price_result = session.execute(text(price_query), {'store': store_name}).fetchone()
        price_info = {
            'avg': float(price_result[0]) if price_result[0] else None,
            'min': float(price_result[1]) if price_result[1] else None,
            'max': float(price_result[2]) if price_result[2] else None,
            'products_with_price': price_result[3] if price_result[3] else 0
        }

        # Disponibilité
        availability_query = """
        SELECT availability, COUNT(*) as count
        FROM products
        WHERE store_name = :store AND availability IS NOT NULL
        GROUP BY availability
        """
        availability_result = session.execute(text(availability_query), {'store': store_name})
        availability = {row[0]: row[1] for row in availability_result}

        return Response({
            'status': 'success',
            'store': store_name,
            'stats': {
                'total_products': total,
                'by_category': by_category,
                'price_info': price_info,
                'availability': availability
            }
        })
    except Exception as e:
        logger.error(f"Error getting store stats for {store_name}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


# ==================== Products by Category ====================

@api_view(['GET'])
def get_products_by_category(request, category):
    """
    Endpoint: GET /api/airflow/products/category/<category>/
    Récupérer tous les produits d'une catégorie

    Query parameters:
        - store: Filtrer par magasin (optionnel)
        - limit: Nombre de résultats (défaut: 20, max: 100)
        - offset: Offset pour la pagination

    Example:
        GET /api/airflow/products/category/Femmes/?store=chillandlit&limit=50
    """
    session = SessionLocal()
    try:
        store = request.query_params.get('store')
        limit = min(int(request.query_params.get('limit', 20)), 100)
        offset = int(request.query_params.get('offset', 0))

        query = "SELECT * FROM products WHERE category = :category"
        params = {'category': category}

        if store:
            query += " AND store_name = :store"
            params['store'] = store

        query += " ORDER BY name ASC"
        query += f" LIMIT {limit} OFFSET {offset}"

        result = session.execute(text(query), params)
        products = [dict(row._mapping) for row in result]

        for product in products:
            if isinstance(product.get('images_links'), str):
                try:
                    product['images_links'] = product['images_links'].split(',')
                except:
                    product['images_links'] = []

        return Response({
            'status': 'success',
            'category': category,
            'count': len(products),
            'limit': limit,
            'offset': offset,
            'products': products
        })
    except Exception as e:
        logger.error(f"Error getting products by category {category}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


# ==================== Unique Products (canonical catalogue) ====================

@api_view(['GET'])
def search_unique_products(request):
    """
    Endpoint: GET /api/airflow/unique-products/search/?q=term&limit=20&offset=0
    Search canonical products stored in unique_products (scrapedb).
    """
    session = SessionLocal()
    try:
        query_param = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 20)), 100)
        offset = int(request.query_params.get('offset', 0))

        base_sql = "SELECT * FROM unique_products WHERE 1=1"
        params = {}

        if query_param:
            terms = [t for t in query_param.lower().split() if t]
            like_clauses = []
            for idx, term in enumerate(terms):
                like_clauses.append(
                    "("
                    "LOWER(canonical_name) LIKE :like_{idx} OR "
                    "LOWER(canonical_description) LIKE :like_{idx} OR "
                    "LOWER(canonical_category) LIKE :like_{idx} OR "
                    "LOWER(canonical_subcategory) LIKE :like_{idx} OR "
                    "LOWER(canonical_sub_subcategory) LIKE :like_{idx}"
                    ")".format(idx=idx)
                )
                params[f"like_{idx}"] = f"%{term}%"

            if like_clauses:
                base_sql += " AND (" + " AND ".join(like_clauses) + ")"

            # Full-text fallback to catch longer queries (include categories)
            base_sql += (
                " AND to_tsvector('simple', "
                "coalesce(canonical_name,'') || ' ' || "
                "coalesce(canonical_description,'') || ' ' || "
                "coalesce(canonical_category,'') || ' ' || "
                "coalesce(canonical_subcategory,'') || ' ' || "
                "coalesce(canonical_sub_subcategory,'')"
                ") @@ plainto_tsquery('simple', :ts_query)"
            )
            params["ts_query"] = query_param

        base_sql += " ORDER BY id DESC"
        base_sql += f" LIMIT {limit} OFFSET {offset}"

        result = session.execute(text(base_sql), params)
        products = []
        for row in result:
            record = dict(row._mapping)
            for field in ['canonical_images_links', 'product_ids', 'product_names', 'store_names', 'metadata_snapshot']:
                record[field] = _parse_json_field(record.get(field))
            products.append(record)

        return Response({
            'status': 'success',
            'count': len(products),
            'limit': limit,
            'offset': offset,
            'products': products
        })
    except Exception as e:
        logger.error(f"Error searching unique products: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()


@api_view(['GET'])
def get_unique_product(request, product_id):
    """
    Endpoint: GET /api/airflow/unique-products/<id>/
    Retrieve a canonical product and all its aggregated metadata.
    """
    session = SessionLocal()
    try:
        result = session.execute(
            text("SELECT * FROM unique_products WHERE id = :id"),
            {'id': product_id}
        )
        product = result.fetchone()

        if not product:
            return Response({
                'status': 'error',
                'message': f'Unique product with ID {product_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)

        product_dict = dict(product._mapping)

        for field in ['canonical_images_links', 'product_ids', 'product_names', 'store_names', 'metadata_snapshot']:
            product_dict[field] = _parse_json_field(product_dict.get(field))

        return Response({
            'status': 'success',
            'product': product_dict
        })
    except Exception as e:
        logger.error(f"Error getting unique product {product_id}: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    finally:
        session.close()
