export const STORAGE_KEYS = {
  organization: 'selectedOrganization',
  project: 'selectedProject',
  task: 'selectedTask',
} as const;

export const secondsToHms = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { hours, minutes, secs };
};

export const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '0:00:00';
  const { hours, minutes, secs } = secondsToHms(seconds);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const formatDateTime = (timestamp?: string | null) => {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  }
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName} at ${timeStr}`;
  }
  return (
    date
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }) + ` at ${timeStr}`
  );
};

export const isoToLocalInput = (timestamp?: string | null) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const localInputToIso = (value: string) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return date.toISOString();
};

export const parseNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getStoredSelection = (key: string) => {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    const value = window.localStorage.getItem(key);
    return value && value.length ? value : null;
  } catch (error) {
    console.error('Failed to read selection from storage', error);
    return null;
  }
};
