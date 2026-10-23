# Feature importance

> Shows what each model used, not scientific proof that a sensor causes or indicates spoilage. Temperature/humidity may act as proxies for recording day/environment drift.

## proxy_real (extra_trees)

| feature | model importance | permutation accuracy drop (held-out groups) |
|---|---|---|
| fruit_type | 0.1731 | 0.0 ± 0.0 |
| MQ3_raw | 0.1673 | 0.0829 ± 0.1026 |
| MQ135_raw | 0.2243 | 0.212 ± 0.1613 |
| temperature_C | 0.2888 | 0.235 ± 0.1273 |
| humidity_pct | 0.1466 | 0.0604 ± 0.0532 |

## synthetic_demo (logistic_regression)

| feature | model importance | permutation accuracy drop (held-out groups) |
|---|---|---|
| fruit_type | 0.8612 | 0.1612 ± 0.0353 |
| MQ3_raw | 0.0444 | 0.175 ± 0.0255 |
| MQ135_raw | 0.062 | 0.249 ± 0.0293 |
| temperature_C | 0.0191 | 0.0512 ± 0.0143 |
| humidity_pct | 0.0134 | 0.0381 ± 0.0201 |

## combined_demo (extra_trees)

| feature | model importance | permutation accuracy drop (held-out groups) |
|---|---|---|
| fruit_type | 0.1553 | 0.19 ± 0.0619 |
| MQ3_raw | 0.1976 | 0.1399 ± 0.0322 |
| MQ135_raw | 0.3088 | 0.2219 ± 0.0453 |
| temperature_C | 0.212 | 0.1291 ± 0.0548 |
| humidity_pct | 0.1263 | 0.0875 ± 0.0514 |
