# ============================================================================
# FactoryPulse - Apache Superset Configuration
# ============================================================================
import os

ROW_LIMIT = 50000
SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "factorypulse_superset_secret_key_2027_mfg")

# Database URI for Superset metadata storage (using SQLite inside container or dedicated Postgres DB)
SQLALCHEMY_DATABASE_URI = "sqlite:////app/superset_home/superset.db"

# Enable Alerting & Scheduled Reporting
ALERT_REPORTS = True
FEATURE_FLAGS = {
    "ALERT_REPORTS": True,
    "DASHBOARD_NATIVE_FILTERS": True,
    "DASHBOARD_CROSS_FILTERS": True,
    "ENABLE_TEMPLATE_PROCESSING": True
}

# Allow CSV / Excel data uploads
CSV_EXTENSIONS = {"csv", "tsv"}
EXCEL_EXTENSIONS = {"xls", "xlsx"}
ALLOWED_EXTENSIONS = CSV_EXTENSIONS | EXCEL_EXTENSIONS

# CORS & CSRF
ENABLE_CORS = True
CORS_OPTIONS = {
    'supports_credentials': True,
    'allow_headers': ['*'],
    'resources': ['*'],
    'origins': ['*']
}

WTF_CSRF_ENABLED = False
TALISMAN_ENABLED = False
