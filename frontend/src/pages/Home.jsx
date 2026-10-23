import React from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Activity,
  Wind,
  Thermometer,
  Droplets,
  Cpu,
  Database,
  ShieldAlert,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function Home() {
  const sensorCards = [
    {
      name: 'MQ-3 Gas Sensor',
      role: 'Alcohol & Fermentation Gas',
      desc: 'Detects ethanol, alcohol vapors, and fermentation byproducts released during the early stages of cellular breakdown.',
      range: '0 – 4095 ADC',
      icon: Wind,
      color: '#166534'
    },
    {
      name: 'MQ-135 Sensor',
      role: 'Air Quality & Spoilage',
      desc: 'Sensitive to ammonia, sulfides, benzene, and off-gas amine compounds produced by advanced bacterial decomposition.',
      range: '0 – 4095 ADC',
      icon: Wind,
      color: '#0284c7'
    },
    {
      name: 'Temperature',
      role: 'Thermal Environment',
      desc: 'Ambient temperature (°C) modulates cellular enzymatic kinetics, ethylene sensitivity, and pathogen reproduction rates.',
      range: '-40.0 – 80.0 °C',
      icon: Thermometer,
      color: '#d97706'
    },
    {
      name: 'Relative Humidity',
      role: 'Moisture Saturation',
      desc: 'Relative moisture percentage (%) governs water activity, surface mold sporulation, and bacterial biofilm growth.',
      range: '0 – 100 %',
      icon: Droplets,
      color: '#2563eb'
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Sensor Array Telemetry',
      desc: 'Raw analog-to-digital sensor voltage signals and environmental metrics are captured inside controlled storage chambers.'
    },
    {
      step: '02',
      title: 'Backend Validation & Gateway',
      desc: 'The Express Node.js API enforces strict bounds checking, sanitizes requests, and manages client security protocols.'
    },
    {
      step: '03',
      title: 'FastAPI ML Inference',
      desc: 'The Python ML service extracts sensor features and evaluates probabilistic class distributions (Fresh, Semi-Fresh, Spoiled).'
    },
    {
      step: '04',
      title: 'MongoDB Persistence',
      desc: 'Prediction metadata, sensor readings, model versions, and advisory warnings are indexed and permanently stored in MongoDB.'
    },
    {
      step: '05',
      title: 'Real-Time Insights',
      desc: 'Interactive score distributions, spoilage tendency indicators, and historical trend dashboards are rendered for actionable decisions.'
    }
  ];

  const features = [
    {
      icon: Cpu,
      title: 'Dual Gas Sensor Fusion',
      desc: 'Combines cross-sensitive MQ-3 and MQ-135 gas responses to detect subtle anaerobic respiration signatures.'
    },
    {
      icon: Layers,
      title: 'Multiple Model Modes',
      desc: 'Switch between empirical proxy-labeled laboratory data, synthetic simulation models, and hybrid demo modes.'
    },
    {
      icon: Activity,
      title: 'Historical Audit Trails',
      desc: 'Filter and inspect past chamber evaluations with full server-side pagination, date range filtering, and confidence charts.'
    },
    {
      icon: FileSpreadsheet,
      title: 'Chamber Batch Ingestion',
      desc: 'Directly upload multi-row Arduino chamber spreadsheets (.xlsx / .csv) to stream continuous degradation curves.'
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '3.5rem 0 4.5rem', background: 'linear-gradient(180deg, #ecfdf5 0%, #f7faf7 100%)' }}>
        <div className="container">
          <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.85rem',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-mint-border)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              <Sparkles size={14} />
              <span>Next-Generation Produce Monitoring & Machine Learning</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: 'var(--color-text)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem'
              }}
            >
              Understand Food Quality Through{' '}
              <span style={{ color: 'var(--color-primary)', background: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Sensor Intelligence.
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginBottom: '2.25rem'
              }}
            >
              Transform raw chamber gas telemetry and ambient environmental conditions into machine-learned produce
              quality predictions. Detect decay byproducts before physical spoilage is visible.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <Link to="/predict" className="btn btn-primary btn-lg">
                <Play size={18} fill="currentColor" />
                Start Prediction
              </Link>
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                <Activity size={18} />
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sensor Overview Section */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--color-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Telemetry Inputs
            </span>
            <h2 style={{ marginTop: '0.35rem', marginBottom: '0.75rem' }}>The Four Core Sensor Measurements</h2>
            <p>
              Our machine learning models synthesize cross-reactive gas sensing and environmental boundary metrics to classify produce condition.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {sensorCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="card"
                  style={{
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
                  }}
                >
                  <div
                    style={{
                      width: '2.75rem',
                      height: '2.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-mint-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.color
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginTop: '0.25rem' }}>{card.name}</h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: card.color }}>{card.role}</span>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', flex: 1 }}>{card.desc}</p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                    Bounds: <strong>{card.range}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Prediction Workflow Section */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--color-background)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Architecture
            </span>
            <h2 style={{ marginTop: '0.35rem', marginBottom: '0.75rem' }}>Prediction Pipeline & Lifecycle</h2>
            <p>From initial sensor reading through multi-tier validation, ML classification, and persistent audit logging.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.5rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: 'var(--color-primary-light)',
                    marginBottom: '0.5rem'
                  }}
                >
                  {step.step}
                </div>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>{step.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '4.5rem 0', backgroundColor: 'var(--color-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Capabilities
            </span>
            <h2 style={{ marginTop: '0.35rem', marginBottom: '0.75rem' }}>Engineered for Robust AI Inference</h2>
            <p>Built with enterprise standards, zero fake mock data fallbacks, and complete diagnostic transparency.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  style={{
                    padding: '1.75rem',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-background-subtle)'
                  }}
                >
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-mint-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                      marginBottom: '1rem'
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{feat.title}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Scientific Limitation & Safety Disclaimer Banner */}
      <section style={{ padding: '3rem 0 4.5rem', backgroundColor: 'var(--color-background)' }}>
        <div className="container">
          <div
            style={{
              padding: '2rem',
              backgroundColor: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning-border)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldAlert size={24} style={{ color: 'var(--color-warning)' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#92400e', margin: 0 }}>
                Model Limitations & Scientific Disclaimer
              </h3>
            </div>
            <p style={{ color: '#78350f', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
              The classifications generated by this application are experimental machine-learning research estimates derived from
              chamber gas sensor arrays and storage-day proxy labeling. They do not constitute an officially certified microbiological or
              biochemical food safety test. Sensor performance varies with ambient air velocity, cross-volatile interferences, and sensor aging.
              Never rely solely on this system to determine if food is safe for human consumption.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
