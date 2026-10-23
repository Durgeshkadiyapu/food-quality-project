import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
FIXTURE = ROOT / "tests" / "fixtures" / "sample_master.csv"
FAST = ["logistic_regression", "random_forest"]


@pytest.fixture(scope="session")
def trained(tmp_path_factory):
    """Run prepare + train on the small fixture into a temp dir (never touches shipped models/)."""
    from src import prepare_dataset, train_model
    base = tmp_path_factory.mktemp("pipeline")
    prepared, models, reports = base / "prepared", base / "models", base / "reports"
    prepare_dataset.main(["--dataset", str(FIXTURE), "--out", str(prepared), "--reports", str(reports)])
    metas = {m: train_model.train(m, prepared, models, reports, candidates=FAST, source_csv=FIXTURE)
             for m in ("proxy_real", "synthetic_demo")}
    return {"prepared": prepared, "models": models, "reports": reports, "meta": metas}
