FROM apache/superset:3.1.0

USER root

# Install PostgreSQL connector for Superset
RUN pip install --no-cache-dir psycopg2-binary

ENV SUPERSET_CONFIG_PATH=/app/superset_config.py
COPY superset_config.py /app/
COPY superset-init.sh /app/
RUN chmod +x /app/superset-init.sh

USER superset
ENTRYPOINT ["/app/superset-init.sh"]
