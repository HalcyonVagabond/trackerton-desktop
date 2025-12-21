import type { Project, Task, TimeEntry } from './electron';

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export interface TaskDetail extends Task {
  projectId: number;
  projectName: string;
  projectDescription?: string | null;
  totalDuration: number;
  timeEntries: TimeEntry[];
  latestTimestamp?: string | null;
  firstTimestamp?: string | null;
}

export interface TimeEntryModalState {
  isOpen: boolean;
  entry: TimeEntry | null;
}
