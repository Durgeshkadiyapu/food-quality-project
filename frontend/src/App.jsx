import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import History from './pages/History';
import PredictionDetails from './pages/PredictionDetails';
import AboutModel from './pages/AboutModel';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="predict" element={<Predict />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<PredictionDetails />} />
        <Route path="about-model" element={<AboutModel />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
