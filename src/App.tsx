import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MenuBarPopup } from './pages/MenuBarPopup';
import { TaskManager } from './pages/TaskManager';
import { TimerProvider } from './context/TimerContext';
import { AppStateProvider } from './context/AppStateContext';

function App() {
  return (
    <TimerProvider>
      <AppStateProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<TaskManager />} />
            <Route path="/menubar" element={<MenuBarPopup />} />
            {/* Redirect old routes to home */}
            <Route path="/task-manager" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </TimerProvider>
  );
}

export default App;
