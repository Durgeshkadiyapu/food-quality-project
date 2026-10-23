# Dataset inspection report

Source: `C:\Users\DurgeshKumar\.gemini\antigravity\scratch\food_quality_project\ml_service\data\raw\food_quality_master_expanded_transparent.csv`  
SHA-256: `a4b567cf700f40652897870091e0b3405a6fa50486e918e91a4a3babaf634e24`

Files NOT available in this run: `sensor_food_quality.zip`, original audit outputs (only the audit .md in the package was reviewed).

## Size and provenance
- Total rows: **36789** (23469 real sensor, 13320 synthetic)
- Proxy-labelled rows: 23008; unknown-labelled: 461
- `usable_for_supervised_training` = True for 0 rows (flag is False everywhere; project uses `demo_training_candidate` for clearly-labelled demo/proxy training instead)
- Labels are invented/assumed for ALL rows (`is_label_invented` = 36789)

## Classes and foods
- Classes: {'Fresh': 13501, 'Semi-Fresh': 12661, 'Spoiled': 10166, 'unknown': 461}
- Foods: {'Tomato': 11712, 'Apple': 8511, 'Banana': 4585, 'Orange': 720, 'Mango': 720, 'Grapes': 720, 'Papaya': 720, 'Guava': 720, 'Strawberry': 720, 'Pear': 720, 'Potato': 720, 'Carrot': 720, 'Cucumber': 720, 'Capsicum': 720, 'Onion': 720, 'Brinjal': 720, 'Cabbage': 720, 'Cauliflower': 720, 'Spinach': 720, 'Empty_Container': 461}
- Real foods missing a class: {'Banana': ['Spoiled']}
- Synthetic foods with a single class: {'Banana': ['Spoiled'], 'Tomato': ['Fresh']}

## Independent units
- Real specimens: 9 {'Apple': 3, 'Banana': 3, 'Empty_Container': 0, 'Tomato': 3}; recording sessions (source files): 40
- Synthetic generator groups: 414

## Missing values
- Any: {'specimen_uid': 461, 'storage_day': 13781, 'quality_tier': 13320, 'is_rh_100': 13320, 'source_file': 13320, 'source_row': 13320, 'exclusion_reason': 24325}
- Model feature columns: {'food_type': 0, 'MQ3_raw': 0, 'MQ135_raw': 0, 'temperature_C': 0, 'humidity_pct': 0}

## Duplicates
- {'duplicate_sample_id': 0, 'duplicate_measurements_all_rows(food+4 sensors)': 474, 'duplicate_measurements_real_rows': 474, 'duplicate_measurements_synthetic_rows': 0, 'duplicate_with_conflicting_labels': 0}

## MQ-135 saturation (ADC = 4095)
- 1557 rows; by class {'Semi-Fresh': 1550, 'Fresh': 6, 'Spoiled': 1}; by origin {'real_sensor_with_proxy_label': 1557}
- Saturation is almost entirely in real Semi-Fresh rows: a potential shortcut (clipped sensor == class) to report, not hide.

## Invalid / suspicious
- MQ3_outside_0_4095: 0
- MQ135_outside_0_4095: 0
- humidity_outside_0_100: 0
- humidity_exactly_100_(DHT22 limit): 122
- temperature_outside_-40_80: 0
- empty_chamber_baseline_rows: 461
- real_rows_by_quality_tier: {'A': 11005, 'C': 7131, 'B': 5333}
- real_rows_with_exclusion_reason: 12464
- exclusion_reasons: {'tier C: reference-only status': 6670, 'tier B: provisional/tentative/clipped/pre-insertion': 3766, 'MQ135_raw at ADC max 4095 (clipped); tier B: provisional/tentative/clipped/pre-insertion': 1445, 'empty-chamber baseline, not a food; tier C: reference-only status': 461, 'MQ135_raw at ADC max 4095 (clipped); humidity at DHT22 limit 100%; tier B: provisional/tentative/clipped/pre-insertion': 112, 'humidity at DHT22 limit 100%; tier B: provisional/tentative/clipped/pre-insertion': 10}

## Proxy rule check
- {'real_rows_checked': 23008, 'label_disagrees_with_storage_day_rule': 0}

## Master vs demo file
- {'demo_file': 'C:\\Users\\DurgeshKumar\\.gemini\\antigravity\\scratch\\food_quality_project\\ml_service\\data\\raw\\food_quality_demo_training_data.csv', 'demo_rows': 36328, 'master_rows': 36789, 'demo_sample_ids_subset_of_master': True, 'rows_only_in_master': 461, 'only_in_master_are': {'unknown': 461}, 'overlapping_rows_identical': True, 'conclusion': 'master is the latest/superset; demo = master minus rows with demo_training_candidate=False'}

## Columns (dtype)
- `sample_id`: str
- `data_origin`: str
- `is_synthetic`: bool
- `is_sensor_value_real`: bool
- `is_label_invented`: bool
- `food_type`: str
- `food_category`: str
- `specimen_uid`: str
- `training_split_group`: str
- `storage_day`: float64
- `MQ3_raw`: int64
- `MQ135_raw`: int64
- `temperature_C`: float64
- `humidity_pct`: float64
- `freshness_label`: str
- `label_method`: str
- `label_confidence`: str
- `label_evidence`: str
- `usable_for_supervised_training`: bool
- `quality_tier`: str
- `is_saturated`: bool
- `is_rh_100`: object
- `source_id`: str
- `source_file`: str
- `source_row`: float64
- `exclusion_reason`: str
- `freshness_label_original`: str
- `demo_training_candidate`: bool
