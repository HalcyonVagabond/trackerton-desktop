import type { OrganizationStatus, ProjectStatus, TaskStatus } from '../../types/electron';

type Status = OrganizationStatus | ProjectStatus | TaskStatus;

interface StatusBadgeProps {
  status: Status | undefined;
  type: 'organization' | 'project' | 'task';
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  // Organization statuses
  active: { bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: '●' },
  inactive: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', icon: '○' },
  
  // Project and Task statuses  
  todo: { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db', icon: '○' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', icon: '◐' },
  on_hold: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', icon: '⏸' },
  completed: { bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: '✓' },
  archived: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', icon: '▣' },
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
  const config = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.todo;
  const label = STATUS_LABELS[effectiveStatus] ?? effectiveStatus;

  const isSmall = size === 'small';

  return (
    <span
      className={`status-badge status-badge--${size} status-badge--${effectiveStatus}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '3px' : '5px',
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        padding: isSmall ? '1px 6px' : '3px 10px',
        borderRadius: isSmall ? '3px' : '6px',
        fontSize: isSmall ? '10px' : '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: isSmall ? '8px' : '10px', lineHeight: 1 }}>{config.icon}</span>
      {label}
    </span>
  );
}

// Export for filter dropdowns
export const STATUS_OPTIONS = {
  organization: [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: '● Active' },
    { value: 'inactive', label: '○ Inactive' },
    { value: 'archived', label: '▣ Archived' },
  ],
  project: [
    { value: '', label: 'All Statuses' },
    { value: 'in_progress', label: '◐ In Progress' },
    { value: 'on_hold', label: '⏸ On Hold' },
    { value: 'completed', label: '✓ Completed' },
    { value: 'archived', label: '▣ Archived' },
  ],
  task: [
    { value: '', label: 'All Statuses' },
    { value: 'todo', label: '○ To Do' },
    { value: 'in_progress', label: '◐ In Progress' },
    { value: 'on_hold', label: '⏸ On Hold' },
    { value: 'completed', label: '✓ Completed' },
    { value: 'archived', label: '▣ Archived' },
  ],
};
