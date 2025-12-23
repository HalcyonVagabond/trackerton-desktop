import type { OrganizationStatus, ProjectStatus, TaskStatus } from '../../types/electron';

type Status = OrganizationStatus | ProjectStatus | TaskStatus;

interface StatusBadgeProps {
  status: Status | undefined;
  type: 'organization' | 'project' | 'task';
  size?: 'small' | 'medium';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Organization statuses
  active: { bg: '#22c55e20', text: '#22c55e' },
  inactive: { bg: '#f59e0b20', text: '#f59e0b' },
  
  // Project and Task statuses
  todo: { bg: '#6b728020', text: '#6b7280' },
  in_progress: { bg: '#3b82f620', text: '#3b82f6' },
  on_hold: { bg: '#f59e0b20', text: '#f59e0b' },
  completed: { bg: '#22c55e20', text: '#22c55e' },
  archived: { bg: '#6b728020', text: '#6b7280' },
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  todo: 'To Do',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function StatusBadge({ status, type, size = 'medium' }: StatusBadgeProps) {
  // Default statuses if not set
  const effectiveStatus = status ?? (type === 'organization' ? 'active' : type === 'project' ? 'in_progress' : 'todo');
  const colors = STATUS_COLORS[effectiveStatus] ?? STATUS_COLORS.todo;
  const label = STATUS_LABELS[effectiveStatus] ?? effectiveStatus;

  return (
    <span
      className={`status-badge status-badge--${size}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: size === 'small' ? '2px 6px' : '4px 8px',
        borderRadius: '4px',
        fontSize: size === 'small' ? '10px' : '12px',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
