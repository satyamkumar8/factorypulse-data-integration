import time
import schedule
import logging
from batch_etl import run_batch_etl

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def job():
    logging.info("Triggering scheduled Batch ETL pipeline...")
    try:
        run_batch_etl()
    except Exception as e:
        logging.error(f"Scheduled job execution failed: {e}")

# Schedule to run every 1 minute (simulate batch aggregation cycle)
schedule.every(1).minutes.do(job)

if __name__ == "__main__":
    # Install schedule library before use: pip install schedule
    logging.info("Batch ETL Scheduler initialized. Running every 1 minute. (Press Ctrl+C to stop)")
    job() # Run first cycle immediately on startup
    while True:
        schedule.run_pending()
        time.sleep(1)