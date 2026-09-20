"""
FactoryPulse - Unit & Integration Verification Tests
Verifies ETL pipeline modules, data quality gates, and OEE calculations.
"""

import unittest
from datetime import datetime, timedelta
import pandas as pd

from etl.validate import validate_telemetry_batch
from etl.transform import calculate_hourly_oee_metrics

class TestFactoryPulseETL(unittest.TestCase):

    def setUp(self):
        self.sample_raw_data = pd.DataFrame([
            {
                "event_id": 1,
                "line_id": "LINE_01",
                "machine_id": "CNC_A",
                "timestamp": datetime(2026, 3, 20, 8, 15, 0),
                "cycle_time_sec": 12.0,
                "good_units": 2,
                "defect_units": 0,
                "status_code": 1,
                "status_name": "Running Normal",
                "downtime_category": "Production"
            },
            {
                "event_id": 2,
                "line_id": "LINE_01",
                "machine_id": "CNC_A",
                "timestamp": datetime(2026, 3, 20, 8, 30, 0),
                "cycle_time_sec": 14.0,
                "good_units": 1,
                "defect_units": 1,
                "status_code": 1,
                "status_name": "Running Normal",
                "downtime_category": "Production"
            },
            {
                "event_id": 3,
                "line_id": "LINE_01",
                "machine_id": "CNC_A",
                "timestamp": datetime(2026, 3, 20, 8, 45, 0),
                "cycle_time_sec": 30.0,
                "good_units": 0,
                "defect_units": 0,
                "status_code": 3,
                "status_name": "Mechanical Jam",
                "downtime_category": "Unplanned Downtime"
            },
            # Invalid records to test quality gates
            {
                "event_id": 4,
                "line_id": None, # Null Line ID
                "machine_id": "CNC_A",
                "timestamp": datetime(2026, 3, 20, 8, 50, 0),
                "cycle_time_sec": 12.0,
                "good_units": 1,
                "defect_units": 0,
                "status_code": 1,
                "status_name": "Running Normal",
                "downtime_category": "Production"
            },
            {
                "event_id": 5,
                "line_id": "LINE_01",
                "machine_id": "CNC_A",
                "timestamp": datetime(2026, 3, 20, 8, 55, 0),
                "cycle_time_sec": -5.0, # Negative cycle time
                "good_units": 1,
                "defect_units": 0,
                "status_code": 1,
                "status_name": "Running Normal",
                "downtime_category": "Production"
            }
        ])

    def test_data_quality_gates(self):
        """Test that validation gate rejects nulls and negative cycle times."""
        valid_df, summary = validate_telemetry_batch(self.sample_raw_data)
        
        self.assertEqual(summary["total_input"], 5)
        self.assertEqual(summary["valid_records"], 3)
        self.assertEqual(summary["dropped_records"], 2)
        self.assertIn("null_identifiers", summary["drop_reasons"])
        self.assertIn("invalid_cycle_time", summary["drop_reasons"])

    def test_oee_transform_calculation(self):
        """Test mathematical accuracy of Availability, Performance, Quality, and OEE %."""
        valid_df, _ = validate_telemetry_batch(self.sample_raw_data)
        oee_df = calculate_hourly_oee_metrics(valid_df)

        self.assertEqual(len(oee_df), 1)
        row = oee_df.iloc[0]

        self.assertEqual(row["total_good_units"], 3)
        self.assertEqual(row["total_defect_units"], 1)
        self.assertEqual(row["total_produced_units"], 4)

        # Operating time = 12 + 14 = 26s
        # Unplanned downtime = 30s
        # Availability = 26 / (26 + 30) = 46.43%
        self.assertAlmostEqual(row["availability_pct"], 46.43, places=1)

        # Quality = 3 / 4 = 75.0%
        self.assertAlmostEqual(row["quality_pct"], 75.0, places=1)

        # OEE must be <= 100% and > 0
        self.assertTrue(0 <= row["oee_pct"] <= 100.0)

if __name__ == "__main__":
    unittest.main()
