"""
PaySphereX ETL Pipeline - Orchestrator
Runs Extract → Transform → Load in sequence with logging and error handling
"""
import logging
import time
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from etl.extract import extract_all
from etl.transform import transform_all
from etl.load import (load_to_csv, load_dim_time,
                      build_fact_payroll, build_fact_attendance, build_fact_leave)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/paysphere_etl.log')
    ]
)
logger = logging.getLogger("ETL_Pipeline")


def run_pipeline() -> dict:
    """Execute full ETL pipeline and return summary stats."""
    start = time.time()
    stats = {}

    logger.info("=" * 60)
    logger.info("PaySphereX ETL Pipeline Starting")
    logger.info("=" * 60)

    # EXTRACT
    logger.info("Phase 1: EXTRACT")
    try:
        raw = extract_all()
        for name, df in raw.items():
            logger.info(f"  Extracted {name}: {len(df)} rows")
            stats[f"extract_{name}"] = len(df)
    except Exception as e:
        logger.error(f"Extract failed: {e}")
        raise

    # TRANSFORM
    logger.info("Phase 2: TRANSFORM")
    try:
        transformed = transform_all(raw)
        for name, df in transformed.items():
            logger.info(f"  Transformed {name}: {df.shape}")
            stats[f"transform_{name}"] = df.shape[0]
    except Exception as e:
        logger.error(f"Transform failed: {e}")
        raise

    # LOAD
    logger.info("Phase 3: LOAD")
    try:
        load_to_csv(transformed)
        time_df = load_dim_time()
        fp = build_fact_payroll(transformed['payroll'], transformed['employees'], time_df)
        fa = build_fact_attendance(transformed['attendance'], transformed['employees'], time_df)
        fl = build_fact_leave(transformed['leaves'], transformed['employees'], time_df)
        stats['fact_payroll_rows'] = len(fp)
        stats['fact_attendance_rows'] = len(fa)
        stats['fact_leave_rows'] = len(fl)
        stats['dim_time_rows'] = len(time_df)
    except Exception as e:
        logger.error(f"Load failed: {e}")
        raise

    elapsed = round(time.time() - start, 2)
    stats['elapsed_seconds'] = elapsed
    logger.info(f"Pipeline completed in {elapsed}s")
    logger.info(f"Stats: {stats}")
    return stats


if __name__ == "__main__":
    result = run_pipeline()
    print("\n✅ ETL Pipeline Complete")
    for k, v in result.items():
        print(f"  {k}: {v}")
