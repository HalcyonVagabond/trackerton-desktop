import { HashRouter, Routes, Route } from 'react-router-dom';
import { MainWindow } from './pages/MainWindow';
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
            <Route path="/" element={<MainWindow />} />
            <Route path="/menubar" element={<MenuBarPopup />} />
            <Route path="/task-manager" element={<TaskManager />} />
          </Routes>
        </HashRouter>
      </AppStateProvider>
    </TimerProvider>
  );
}

export default App;
