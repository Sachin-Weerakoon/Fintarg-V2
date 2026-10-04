import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './store';
import Layout from './components/Layout';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Financial = lazy(() => import('./pages/Financial'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Goals = lazy(() => import('./pages/Goals'));
const Letters = lazy(() => import('./pages/Letters'));
const Medical = lazy(() => import('./pages/Medical'));
const Advanced = lazy(() => import('./pages/Advanced'));
const Settings = lazy(() => import('./pages/Settings'));
const Documents = lazy(() => import('./pages/Documents'));

function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="page-loading-spinner" />
      <span>Loading…</span>
    </div>
  );
}

function Router() {
  const { state } = useApp();
  const { currentPage } = state;

  if (currentPage === 'onboarding') {
    return <Suspense fallback={<PageLoading />}><Onboarding /></Suspense>;
  }

  const pages: Record<string, React.ReactNode> = {
    dashboard: <Dashboard />,
    financial: <Financial />,
    analysis: <Analysis />,
    goals: <Goals />,
    documents: <Documents />,
    letters: <Letters />,
    medical: <Medical />,
    advanced: <Advanced />,
    settings: <Settings />,
  };

  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        {pages[currentPage] || <Dashboard />}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
