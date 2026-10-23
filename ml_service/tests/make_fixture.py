"""Regenerate the small test fixture from the full master CSV (not needed to run the tests).
Usage: python tests/make_fixture.py path/to/food_quality_master_expanded_transparent.csv
"""
import sys
import pandas as pd

m = pd.read_csv(sys.argv[1], low_memory=False)
real = m[(~m.is_synthetic) & (m.freshness_label != "unknown")]
parts = [real.groupby(["specimen_uid", "freshness_label"], group_keys=False).sample(8, random_state=0),
         m[m.is_synthetic].groupby("specimen_uid", group_keys=False).sample(2, random_state=0),
         m[m.freshness_label == "unknown"].sample(5, random_state=0)]
out = pd.concat(parts).sort_values("sample_id")
out.to_csv("tests/fixtures/sample_master.csv", index=False)
print(len(out), "rows")
