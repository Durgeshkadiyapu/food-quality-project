import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Leaf, Activity, History as HistoryIcon, Info, Sparkles, Menu, X, Play } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
          <div className="brand-icon-wrapper">
            <Leaf size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-title">Food Quality AI</span>
            <span className="brand-subtitle">Sensor Intelligence</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className={`navbar-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            Overview
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Activity size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/predict"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Sparkles size={16} />
            Predict
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <HistoryIcon size={16} />
            History
          </NavLink>
          <NavLink
            to="/about-model"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobileMenu}
          >
            <Info size={16} />
            About Model
          </NavLink>
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="navbar-actions">
          <Link to="/predict" className="btn btn-primary btn-sm" style={{ display: 'flex' }}>
            <Play size={14} fill="currentColor" />
            <span>New Prediction</span>
          </Link>

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
