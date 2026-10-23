import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ShieldAlert, Cpu, Database } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="brand-icon-wrapper" style={{ width: '1.8rem', height: '1.8rem' }}>
                <Leaf size={15} />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
                AI Food Quality Predictor
              </span>
            </div>
            <p>
              An intelligent sensor classification system bridging MQ gas telemetry, environmental ambient metrics,
              and machine learning algorithms to evaluate produce storage freshness.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-links">
              <li><Link to="/">Landing Overview</Link></li>
              <li><Link to="/dashboard">System Dashboard</Link></li>
              <li><Link to="/predict">Prediction Form</Link></li>
              <li><Link to="/history">Prediction History</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Architecture</h4>
            <ul className="footer-links">
              <li><Link to="/about-model">Model Capabilities</Link></li>
              <li><span style={{ color: 'var(--color-muted)' }}>Node.js / Express Gateway</span></li>
              <li><span style={{ color: 'var(--color-muted)' }}>FastAPI ML Service</span></li>
              <li><span style={{ color: 'var(--color-muted)' }}>MongoDB Persistence</span></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Research Note</h4>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Prototype estimates derived from experimental proxy sensor rows. Not a certified food-safety guarantee.
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} AI Food Quality Predictor. Built for research & sensor intelligence.
          </div>
          <div className="footer-disclaimer-badge">
            <ShieldAlert size={14} style={{ color: 'var(--color-warning)' }} />
            <span>Prototype research tool — not a medical or health-grade safety guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
