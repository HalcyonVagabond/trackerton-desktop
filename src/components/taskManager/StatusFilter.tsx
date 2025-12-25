import { STATUS_OPTIONS } from './StatusBadge';
import type { OrganizationStatus, ProjectStatus, TaskStatus } from '../../types/electron';

type FilterType = 'organization' | 'project' | 'task';
type StatusValue = OrganizationStatus | ProjectStatus | TaskStatus | '';

const FILTER_LABELS: Record<FilterType, string> = {
  organization: 'Organization',
  project: 'Project',
  task: 'Task',
};

interface StatusFilterProps {
  type: FilterType;
  value: StatusValue;
  onChange: (value: StatusValue) => void;
  className?: string;
}

export function StatusFilter({ type, value, onChange, className = '' }: StatusFilterProps) {
  const options = STATUS_OPTIONS[type];
  const label = FILTER_LABELS[type];

  return (
    <div className={`status-filter-wrapper ${className}`}>
      <label className="status-filter-label">{label}</label>
      <select
        className="status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value as StatusValue)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
