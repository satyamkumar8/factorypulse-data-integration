#!/bin/bash
set -e

echo "=== Initializing FactoryPulse Apache Superset ==="

# 1. Initialize Superset database
superset db upgrade

# 2. Create admin user if it doesn't exist
superset fab create-admin \
    --username admin \
    --firstname FactoryPulse \
    --lastname Admin \
    --email admin@factorypulse.internal \
    --password admin || true

# 3. Setup default roles and permissions
superset init

# 4. Configure PostgreSQL Data Source connection
echo "Configuring PostgreSQL Manufacturing Database connection..."
python3 - <<EOF
from superset.app import create_app
app = create_app()
with app.app_context():
    from superset import db
    from superset.models.core import Database
    
    db_name = "FactoryPulse Manufacturing Warehouse"
    sqlalchemy_uri = "postgresql://mfg_user:mfg_password@postgres:5432/manufacturing_db"
    
    existing = db.session.query(Database).filter_by(database_name=db_name).first()
    if not existing:
        new_db = Database(database_name=db_name, sqlalchemy_uri=sqlalchemy_uri)
        new_db.allow_ctas = True
        new_db.allow_cvas = True
        new_db.allow_dml = False
        new_db.allow_run_async = True
        db.session.add(new_db)
        db.session.commit()
        print("Successfully registered FactoryPulse Manufacturing Warehouse database in Superset!")
    else:
        print("Database connection already exists in Superset metadata.")
EOF

echo "=== FactoryPulse Superset Ready. Starting Web Server on Port 8088 ==="
exec /usr/bin/run-server.sh
