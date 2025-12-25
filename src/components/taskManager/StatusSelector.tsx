import type { OrganizationStatus, ProjectStatus, TaskStatus } from '../../types/electron';

type Status = OrganizationStatus | ProjectStatus | TaskStatus;

interface StatusSelectorProps {
  type: 'organization' | 'project' | 'task';
  value: Status | undefined;
  onChange: (status: Status) => void;
  disabled?: boolean;
}

const ORGANIZATION_STATUSES: OrganizationStatus[] = ['active', 'inactive', 'archived'];
const PROJECT_STATUSES: ProjectStatus[] = ['in_progress', 'on_hold', 'completed', 'archived'];
const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'on_hold', 'completed', 'archived'];

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  todo: 'To Do',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  active: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#16a34a' },
  inactive: { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af', text: '#6b7280' },
  todo: { bg: 'rgba(156, 163, 175, 0.1)', border: '#9ca3af', text: '#6b7280' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#2563eb' },
  on_hold: { bg: 'rgba(251, 191, 36, 0.1)', border: '#fbbf24', text: '#d97706' },
  completed: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e', text: '#16a34a' },
  archived: { bg: 'rgba(107, 114, 128, 0.1)', border: '#6b7280', text: '#4b5563' },
};

export function StatusSelector({ type, value, onChange, disabled }: StatusSelectorProps) {
  const statuses = type === 'organization' 
    ? ORGANIZATION_STATUSES 
    : type === 'project' 
      ? PROJECT_STATUSES 
      : TASK_STATUSES;
  
  const defaultValue = type === 'organization' ? 'active' : type === 'project' ? 'in_progress' : 'todo';
  const currentValue = value ?? defaultValue;
  const colors = STATUS_COLORS[currentValue] || STATUS_COLORS.todo;

  return (
    <div className="status-selector-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
      <select
        className="status-selector"
        value={currentValue}
        onChange={(e) => onChange(e.target.value as Status)}
        disabled={disabled}
        style={{
          padding: '6px 28px 6px 10px',
          borderRadius: '6px',
          border: `1.5px solid ${colors.border}`,
          backgroundColor: colors.bg,
          color: colors.text,
          fontSize: '12px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status] ?? status}
          </option>
        ))}
      </select>
      <span
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: colors.text,
          fontSize: '10px',
        }}
      >
        ▼
      </span>
    </div>
  );
}
