# Evaluation report

> **All labels are assumed (storage-day proxy or synthetic), never verified freshness.** Metrics below measure agreement with those assumed labels on held-out specimens/groups. They are NOT evidence of real-world freshness or food-safety prediction. Synthetic-data metrics must never be quoted as real-world performance.

## Mode `proxy_real` — extra_trees

- Reproduces training-time CV metrics: **True**
- Accuracy 0.892 | macro precision 0.904 | macro recall 0.906 | macro F1 0.904 | balanced acc 0.906
- Majority-class baseline: accuracy 0.337, macro F1 0.242
- Reliability: ['only 9 independent groups', "fewer than 10 independent groups for some class: {'Fresh': 9, 'Semi-Fresh': 9, 'Spoiled': 6}", 'labels are storage-day proxies, so metrics measure agreement with the proxy rule', "real foods lacking a class (no real Spoiled examples): ['Banana']"]

| class | precision | recall | F1 | support |
|---|---|---|---|---|
| Fresh | 0.886 | 0.828 | 0.856 | 8761 |
| Semi-Fresh | 0.842 | 0.889 | 0.865 | 8821 |
| Spoiled | 0.986 | 1.000 | 0.993 | 5426 |

Confusion matrix (rows = true, cols = predicted; order Fresh / Semi-Fresh / Spoiled):

```
[7252, 1476, 33]
[936, 7843, 42]
[1, 1, 5424]
```

Breakdowns (accuracy / macro-F1 / n):

- by_food / Apple: acc 0.967, F1 0.973, n=8511
- by_food / Banana: acc 0.951, F1 0.632, n=3685
- by_food / Tomato: acc 0.812, F1 0.806, n=10812
- real_rows_only: acc 0.892, F1 0.904, n=23008
- real_saturated_MQ135_rows: acc 0.996, F1 0.417, n=1557
- real_non_saturated_rows: acc 0.884, F1 0.895, n=21451
- real_by_quality_tier / A: acc 0.970, F1 0.951, n=11005
- real_by_quality_tier / B: acc 0.683, F1 0.650, n=5333
- real_by_quality_tier / C: acc 0.930, F1 0.591, n=6670

Ablations (same grouped CV):

- drop_saturated_rows(train+test): acc 0.865, macro-F1 0.878, n=21451
- gas_sensors_only+fruit_type(no temperature/humidity): acc 0.596, macro-F1 0.596, n=23008
- sensors_only(no fruit_type): acc 0.763, macro-F1 0.782, n=23008

## Mode `synthetic_demo` — logistic_regression

- Reproduces training-time CV metrics: **True**
- Accuracy 0.722 | macro precision 0.723 | macro recall 0.715 | macro F1 0.717 | balanced acc 0.715
- Majority-class baseline: accuracy 0.351, macro F1 0.271
- Reliability: ["synthetic records come from a class-conditional generator; metrics measure how well the generator's classes can be separated, not real-world freshness"]

| class | precision | recall | F1 | support |
|---|---|---|---|---|
| Fresh | 0.805 | 0.728 | 0.765 | 4740 |
| Semi-Fresh | 0.521 | 0.608 | 0.561 | 3840 |
| Spoiled | 0.842 | 0.808 | 0.824 | 4740 |

Confusion matrix (rows = true, cols = predicted; order Fresh / Semi-Fresh / Spoiled):

```
[3453, 1255, 32]
[819, 2335, 686]
[18, 894, 3828]
```

Breakdowns (accuracy / macro-F1 / n):

- by_food / Banana: acc 1.000, F1 0.333, n=900
- by_food / Brinjal: acc 0.632, F1 0.635, n=720
- by_food / Cabbage: acc 0.644, F1 0.649, n=720
- by_food / Capsicum: acc 0.590, F1 0.589, n=720
- by_food / Carrot: acc 0.644, F1 0.648, n=720
- by_food / Cauliflower: acc 0.790, F1 0.791, n=720
- by_food / Cucumber: acc 0.629, F1 0.633, n=720
- by_food / Grapes: acc 0.739, F1 0.741, n=720
- by_food / Guava: acc 0.662, F1 0.673, n=720
- by_food / Mango: acc 0.647, F1 0.648, n=720
- by_food / Onion: acc 0.574, F1 0.581, n=720
- by_food / Orange: acc 0.624, F1 0.630, n=720
- by_food / Papaya: acc 0.794, F1 0.796, n=720
- by_food / Pear: acc 0.681, F1 0.683, n=720
- by_food / Potato: acc 0.733, F1 0.738, n=720
- by_food / Spinach: acc 0.710, F1 0.713, n=720
- by_food / Strawberry: acc 0.761, F1 0.765, n=720
- by_food / Tomato: acc 1.000, F1 0.333, n=900

Ablations (same grouped CV):

- gas_sensors_only+fruit_type(no temperature/humidity): acc 0.692, macro-F1 0.687, n=13320
- sensors_only(no fruit_type): acc 0.619, macro-F1 0.609, n=13320

## Mode `combined_demo` — extra_trees

- Reproduces training-time CV metrics: **True**
- Accuracy 0.773 | macro precision 0.772 | macro recall 0.778 | macro F1 0.772 | balanced acc 0.778
- Majority-class baseline: accuracy 0.372, macro F1 0.181
- Reliability: ["synthetic records come from a class-conditional generator; metrics measure how well the generator's classes can be separated, not real-world freshness", 'labels are storage-day proxies, so metrics measure agreement with the proxy rule', "real foods lacking a class (no real Spoiled examples): ['Banana']"]

| class | precision | recall | F1 | support |
|---|---|---|---|---|
| Fresh | 0.782 | 0.830 | 0.805 | 13501 |
| Semi-Fresh | 0.768 | 0.635 | 0.695 | 12661 |
| Spoiled | 0.767 | 0.870 | 0.815 | 10166 |

Confusion matrix (rows = true, cols = predicted; order Fresh / Semi-Fresh / Spoiled):

```
[11201, 1646, 654]
[2586, 8046, 2029]
[539, 785, 8842]
```

Breakdowns (accuracy / macro-F1 / n):

- by_food / Apple: acc 0.924, F1 0.934, n=8511
- by_food / Banana: acc 0.778, F1 0.769, n=4585
- by_food / Brinjal: acc 0.628, F1 0.597, n=720
- by_food / Cabbage: acc 0.707, F1 0.689, n=720
- by_food / Capsicum: acc 0.675, F1 0.670, n=720
- by_food / Carrot: acc 0.558, F1 0.527, n=720
- by_food / Cauliflower: acc 0.807, F1 0.804, n=720
- by_food / Cucumber: acc 0.639, F1 0.604, n=720
- by_food / Grapes: acc 0.679, F1 0.671, n=720
- by_food / Guava: acc 0.569, F1 0.560, n=720
- by_food / Mango: acc 0.588, F1 0.567, n=720
- by_food / Onion: acc 0.463, F1 0.430, n=720
- by_food / Orange: acc 0.618, F1 0.577, n=720
- by_food / Papaya: acc 0.678, F1 0.657, n=720
- by_food / Pear: acc 0.761, F1 0.764, n=720
- by_food / Potato: acc 0.667, F1 0.655, n=720
- by_food / Spinach: acc 0.665, F1 0.660, n=720
- by_food / Strawberry: acc 0.653, F1 0.629, n=720
- by_food / Tomato: acc 0.786, F1 0.779, n=11712
- real_rows_only: acc 0.825, F1 0.829, n=23008
- real_saturated_MQ135_rows: acc 0.996, F1 0.407, n=1557
- real_non_saturated_rows: acc 0.813, F1 0.815, n=21451
- real_by_quality_tier / A: acc 0.850, F1 0.815, n=11005
- real_by_quality_tier / B: acc 0.672, F1 0.439, n=5333
- real_by_quality_tier / C: acc 0.907, F1 0.557, n=6670
- synthetic_rows_only: acc 0.683, F1 0.652, n=13320

Ablations (same grouped CV):

- gas_sensors_only+fruit_type(no temperature/humidity): acc 0.627, macro-F1 0.622, n=36328
- sensors_only(no fruit_type): acc 0.666, macro-F1 0.659, n=36328

## Cross-origin transfer diagnostic (sensor-only)

- synthetic->real (logistic_regression): acc 0.509, macro-F1 0.476, recall {'Fresh': 0.7357607579043488, 'Semi-Fresh': 0.168688357329101, 'Spoiled': 0.69498709915223}
- real->synthetic (extra_trees): acc 0.281, macro-F1 0.248, recall {'Fresh': 0.11413502109704642, 'Semi-Fresh': 0.17552083333333332, 'Spoiled': 0.5324894514767933}
_Sensor-only diagnostic (fruit_type removed because the two sources share only Banana/Tomato and each is single-class in the synthetic set). Low transfer means synthetic data does not reproduce the real proxy-label structure and vice versa._
