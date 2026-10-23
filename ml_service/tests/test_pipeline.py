import json

import pandas as pd
import pytest

from src.common import CLASSES, FEATURES, FORBIDDEN_FEATURES, PREPARED_FILES, make_xy
from src.evaluation import grouped_splits
from src.prepare_dataset import assign_partition, proxy_rule


def test_features_are_the_declared_hardware_inputs():
    assert FEATURES == ["fruit_type", "MQ3_raw", "MQ135_raw", "temperature_C", "humidity_pct"]
    assert not set(FEATURES) & set(FORBIDDEN_FEATURES)


def test_proxy_rule():
    assert [proxy_rule(d) for d in (1, 2, 3, 4, 5, 6)] == ["Fresh", "Fresh", "Semi-Fresh", "Semi-Fresh", "Spoiled", "Spoiled"]
    assert proxy_rule(float("nan")) == "unknown"


def test_partition_is_complete_and_disjoint(trained):
    p = trained["prepared"]
    dfs = {k: pd.read_csv(p / f) for k, f in PREPARED_FILES.items()}
    master = pd.read_csv("tests/fixtures/sample_master.csv", low_memory=False)
    assert sum(len(d) for d in dfs.values()) == len(master)
    ids = pd.concat([d.sample_id for d in dfs.values()])
    assert ids.is_unique
    assert not dfs["real_proxy"].is_synthetic.any() and dfs["synthetic"].is_synthetic.all()
    assert set(dfs["real_proxy"].freshness_label) <= set(CLASSES)
    assert (dfs["unknown_unusable"].freshness_label == "unknown").all()
    assert "prepare_reason" in dfs["unknown_unusable"]


def test_unknown_labels_never_become_targets(trained):
    X, y, _ = make_xy(pd.read_csv(trained["prepared"] / PREPARED_FILES["real_proxy"]))
    assert set(y) <= set(CLASSES)
    assert list(X.columns) == FEATURES


@pytest.mark.parametrize("mode", ["proxy_real", "synthetic_demo"])
def test_group_splits_have_no_leakage(trained, mode):
    from src.common import load_prepared
    df = load_prepared(mode, trained["prepared"])
    _, y, g = make_xy(df)
    for tr, te in grouped_splits(mode, y, g):
        assert not set(g.iloc[tr]) & set(g.iloc[te])


def test_artifacts_and_metadata(trained):
    for mode, meta in trained["meta"].items():
        d = trained["models"] / mode
        assert (d / "model.joblib").exists()
        saved = json.loads((d / "metadata.json").read_text())
        for k in ("model_version", "training_mode", "label_method", "features", "target", "classes",
                  "supported_fruit_types", "training_ranges", "training_data", "evaluation", "warning"):
            assert k in saved
        assert saved["features"] == FEATURES and saved["classes"] == CLASSES
        assert saved["training_data"]["source_sha256"]
    assert trained["meta"]["proxy_real"]["uses_synthetic_data"] is False
    assert trained["meta"]["synthetic_demo"]["is_synthetic_demonstration"] is True
    assert set(trained["meta"]["proxy_real"]["supported_fruit_types"]) == {"Apple", "Banana", "Tomato"}


def test_modes_are_not_silently_mixed(trained):
    from src.common import load_prepared
    assert not load_prepared("proxy_real", trained["prepared"]).is_synthetic.any()
    assert load_prepared("synthetic_demo", trained["prepared"]).is_synthetic.all()
