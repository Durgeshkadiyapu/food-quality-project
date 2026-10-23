# Food Quality Dataset Expansion — Audit and Use Guide

## What was done
- Read the uploaded `sensor_training_dataset_FULL.csv` (36,789 rows, 26 columns).
- Preserved sensor values and source/provenance columns.
- Reassigned labels for real sensor rows using the explicitly requested demonstration rule: storage days 1–2 = Fresh, 3–4 = Semi-Fresh, day 5+ = Spoiled.
- Kept these labels marked as assumed proxies, not observed ground truth.
- Kept synthetic rows separate by `data_origin`, `is_synthetic`, `is_sensor_value_real`, and `is_label_invented`.
- Created a demo training candidate file containing both proxy-labelled real readings and synthetic rows. It is suitable for a *demonstration experiment only*, not evidence of real-world accuracy.

## Counts
- Input rows: 36,789
- Real sensor rows: 23,469
- Synthetic rows: 13,320
- Other/reference rows: 0
- Rows in demo candidate file: 36,328

## Important label interpretation
The day-based rule is an assumption. Storage duration alone does not establish freshness; fruit type, variety, temperature, humidity, handling, and storage conditions affect ripening and spoilage. The real measurements are real, but the labels assigned here are not observed labels. Synthetic records are not physical measurements.

## External research reviewed
1. Mahdian, “Food Freshness Electronic Nose Dataset,” Zenodo (2025), https://zenodo.org/records/17285312. The page describes MQ2/MQ3/MQ4/MQ5/MQ6/MQ7/MQ8/MQ9/MQ135 measurements over food storage time. This is a reference source, not automatically compatible with the user's MQ3/MQ135-only gas array.
2. “Assessment of ‘Golden Delicious’ Apples Using an Electronic Nose and Machine Learning to Determine Ripening Stages,” Foods (2024), https://www.mdpi.com/2304-8158/13/16/2530. Uses MQ3, MQ135, MQ136 and MQ138, with ripening stages defined using study-specific procedures; shows environmental and experiment differences matter.
3. “An Intelligent Cloud-Integrated Electronic Nose System for Non-Destructive Fruit Ripeness Monitoring in Precision Agriculture,” Electronics (2026), https://www.mdpi.com/2079-9292/15/12/2502. Reports a 953-sample banana dataset with unripe/ripe/rotten classes using eight MQ sensors plus temperature/humidity. Those sensor inputs and calibration differ from this project; do not copy its numeric values as MQ3/MQ135 readings.
4. “Intelligent Fruit Quality Monitoring System using Sensor Networks and Deep Learning,” IEEE (2025), https://ieeexplore.ieee.org/document/10872000/. Describes a multimodal sensing and image-based classification approach; useful background, not a directly compatible raw dataset.
5. “Real-Time Detection of Banana Spoilage Using IoT-Based Environmental Sensing,” Journal of Experimental Agriculture International (2026), https://doi.org/10.9734/jeai/2026/v48i104564. Describes a banana monitoring experiment with MQ3 and DHT22, but its published description alone does not make its raw readings available for merging.

## Recommended use
- For a clearly labelled *demo*: `food_quality_demo_training_data.csv`.
- For the full traceable table: `food_quality_master_expanded_transparent.csv`.
- For checking class balance: `food_quality_class_distribution.csv`.

Before modelling, use group-aware splits by `training_split_group` or `specimen_uid`; never random-split adjacent readings from the same specimen across train and test. Evaluate real-proxy and synthetic subsets separately. Report the label method and do not present demo metrics as real-world freshness performance.
