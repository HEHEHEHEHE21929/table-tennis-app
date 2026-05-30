import { useEffect, useState } from 'react';
import { Route, Routes, NavLink, Navigate } from 'react-router-dom';
import { useEventManager } from './state/useEventManager';
import { ToastContext } from './context/ToastContext';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';
import SetupPage from './pages/SetupPage';
import SchedulePage from './pages/SchedulePage';
import CurrentMatchPage from './pages/CurrentMatchPage';
import HistoryPage from './pages/HistoryPage';
import ResultsPage from './pages/ResultsPage';

function App() {
  const eventManager = useEventManager();
  const toast = useToast();

  const [viewMode, setViewMode] = useState<'mobile' | 'web'>(() =>
    window.matchMedia && window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'web'
  );

  // Keep a CSS variable for viewport height to avoid mobile address-bar issues
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Use matchMedia to update view mode responsively
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setViewMode(e.matches ? 'mobile' : 'web');
    // call once to sync
    handler(mq);
    if ('addEventListener' in mq) {
      (mq as any).addEventListener('change', handler);
      return () => (mq as any).removeEventListener('change', handler);
    }
    // fallback for older browsers / TS typing
    (mq as any).addListener(handler);
    return () => (mq as any).removeListener(handler);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className={`app-shell ${viewMode}-mode`}>
        <header className="app-bar" role="banner">
          <div className="app-brand">
            <div className="app-logo" aria-label="Table Tennis Event Manager Logo">TT</div>
            <div>
              <p className="app-label">TT Event</p>
              <h1>Table Tennis Manager</h1>
            </div>
          </div>
          <div className="app-actions">
            <button className="icon-btn" aria-label="Notifications">🔔</button>
          </div>
        </header>

        <main className="page-content" role="main" id="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/current" replace />} />
            <Route path="/setup" element={<SetupPage eventManager={eventManager} />} />
            <Route path="/schedule" element={<SchedulePage eventManager={eventManager} />} />
            <Route path="/current" element={<CurrentMatchPage eventManager={eventManager} />} />
            <Route path="/history" element={<HistoryPage eventManager={eventManager} />} />
            <Route path="/results" element={<ResultsPage eventManager={eventManager} />} />
          </Routes>
        </main>

        <nav className="app-footer" role="navigation" aria-label="Main navigation">
          <NavLink to="/setup" className={({ isActive }) => (isActive ? 'active' : '')}>Setup</NavLink>
          <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>Schedule</NavLink>
          <NavLink to="/current" className={({ isActive }) => (isActive ? 'active' : '')}>Current</NavLink>
          <NavLink to="/history" className={({ isActive }) => (isActive ? 'active' : '')}>History</NavLink>
          <NavLink to="/results" className={({ isActive }) => (isActive ? 'active' : '')}>Results</NavLink>
        </nav>

        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </ToastContext.Provider>
  );
}

export default App;
