"""
FactoryPulse - Batch ETL Runner
Entrypoint for scheduled and on-demand batch data warehouse loading.
"""

import sys
from etl.pipeline import run_factorypulse_etl

def run_batch_etl():
    """Wrapper function maintaining backwards compatibility."""
    result = run_factorypulse_etl()
    if result["status"] != "SUCCESS":
        sys.exit(1)
    return result

if __name__ == "__main__":
    run_batch_etl()