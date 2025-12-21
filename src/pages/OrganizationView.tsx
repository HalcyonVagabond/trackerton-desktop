import { useNavigate } from 'react-router-dom';

export function OrganizationView() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <div className="app-header">
        <button 
          className="btn btn--back" 
          onClick={() => navigate('/')}
        >
          ← Back
        </button>
        <h1 className="app-header__title">
          <span>Task Management</span>
        </h1>
      </div>

      <div className="app-content">
        <h2>Organization View</h2>
        <p>Full task management interface will be implemented here.</p>
        <p>Features to include:</p>
        <ul>
          <li>Organization selector</li>
          <li>Projects sidebar</li>
          <li>Tasks panel</li>
          <li>Time entry list with edit capabilities</li>
        </ul>
      </div>
    </div>
  );
}
