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

export function StatusSelector({ type, value, onChange, disabled }: StatusSelectorProps) {
  const statuses = type === 'organization' 
    ? ORGANIZATION_STATUSES 
    : type === 'project' 
      ? PROJECT_STATUSES 
      : TASK_STATUSES;
  
  const defaultValue = type === 'organization' ? 'active' : type === 'project' ? 'in_progress' : 'todo';
  const currentValue = value ?? defaultValue;

  return (
    <select
      className="status-selector"
      value={currentValue}
      onChange={(e) => onChange(e.target.value as Status)}
      disabled={disabled}
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status] ?? status}
        </option>
      ))}
    </select>
  );
}
