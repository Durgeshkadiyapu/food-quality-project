import React from 'react';
import { Wind, Thermometer, Droplets, Activity, Gauge } from 'lucide-react';
import { formatDecimal } from '../../utils/formatters';

export default function SensorOverview({ latestRecord }) {
  if (!latestRecord || !latestRecord.sensor_readings) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <Gauge size={18} style={{ color: 'var(--color-primary)' }} />
            Latest Sensor Telemetry
          </h3>
        </div>
        <div className="card-body" style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '2.5rem 1rem' }}>
          <p>No sensor readings recorded yet. Perform a prediction to view live chamber metrics.</p>
        </div>
      </div>
    );
  }

  const { sensor_readings, fruit_type, created_at, spoilage_tendency_score } = latestRecord;

  const sensors = [
    {
      id: 'mq3',
      name: 'MQ-3 Alcohol / Ethanol',
      value: sensor_readings.MQ3_raw ?? '—',
      unit: 'raw ADC',
      icon: Wind,
      range: '0 – 4095',
      accent: 'var(--color-primary)'
    },
    {
      id: 'mq135',
      name: 'MQ-135 Spoilage Gases',
      value: sensor_readings.MQ135_raw ?? '—',
      unit: 'raw ADC',
      icon: Wind,
      range: '0 – 4095',
      accent: '#0284c7'
    },
    {
      id: 'temp',
      name: 'Temperature',
      value: formatDecimal(sensor_readings.temperature_C, 1),
      unit: '°C',
      icon: Thermometer,
      range: '28.5 – 33.6 °C (train)',
      accent: '#d97706'
    },
    {
      id: 'hum',
      name: 'Relative Humidity',
      value: formatDecimal(sensor_readings.humidity_pct, 1),
      unit: '%',
      icon: Droplets,
      range: '66 – 100% (train)',
      accent: '#2563eb'
    }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            Latest Chamber Telemetry
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
            Associated with {fruit_type} inspection
          </span>
        </div>

        {spoilage_tendency_score !== null && spoilage_tendency_score !== undefined && (
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Tendency Index
            </span>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {spoilage_tendency_score} / 100
            </div>
          </div>
        )}
      </div>

      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {sensors.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-background-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    {s.name}
                  </span>
                  <Icon size={16} style={{ color: s.accent }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{s.unit}</span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: 'auto' }}>
                  Ref range: {s.range}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
