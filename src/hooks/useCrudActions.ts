import { useCallback } from 'react';
import type { Organization, Project, Task, OrganizationStatus, ProjectStatus, TaskStatus } from '../types/electron';

interface UseCrudActionsProps {
  organizations: Organization[];
  projects: Project[];
  tasks: Task[];
  selectedOrganizationId: number | null;
  selectedProjectId: number | null;
  selectedTaskId: number | null;
  addOrganization: (name: string, status?: OrganizationStatus) => Promise<Organization>;
  updateOrganization: (id: number, data: { name?: string; status?: OrganizationStatus }) => Promise<void>;
  deleteOrganization: (id: number) => Promise<void>;
  addProject: (name: string, description?: string, status?: ProjectStatus) => Promise<Project>;
  updateProject: (id: number, data: { name?: string; description?: string; status?: ProjectStatus }) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  addTask: (name: string, status?: TaskStatus) => Promise<Task>;
  updateTask: (id: number, data: { name?: string; status?: TaskStatus }) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  reloadOrgs: () => Promise<void>;
  reloadProjects: () => Promise<void>;
  reloadTasks: () => Promise<void>;
  setSelectedOrganizationId: (id: number | null) => void;
  setSelectedProjectId: (id: number | null) => void;
  setSelectedTaskId: (id: number | null) => void;
}

export function useCrudActions(props: UseCrudActionsProps) {
  const {
    organizations,
    projects,
    tasks,
    selectedOrganizationId,
    selectedProjectId,
    selectedTaskId,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    reloadOrgs,
    reloadProjects,
    reloadTasks,
    setSelectedOrganizationId,
    setSelectedProjectId,
    setSelectedTaskId,
  } = props;

  // Organization actions
  const handleAddOrganization = useCallback(
    async (name: string) => {
      const newOrg = await addOrganization(name);
      await reloadOrgs();
      setSelectedOrganizationId(newOrg.id);
    },
    [addOrganization, reloadOrgs, setSelectedOrganizationId]
  );

  const handleUpdateOrganization = useCallback(
    async (id: number, name: string) => {
      await updateOrganization(id, { name });
      await reloadOrgs();
    },
    [updateOrganization, reloadOrgs]
  );

  const handleDeleteOrganization = useCallback(
    async (id: number) => {
      await deleteOrganization(id);
      await reloadOrgs();
      setSelectedOrganizationId(null);
      setSelectedProjectId(null);
      setSelectedTaskId(null);
    },
    [deleteOrganization, reloadOrgs, setSelectedOrganizationId, setSelectedProjectId, setSelectedTaskId]
  );

  // Project actions
  const handleAddProject = useCallback(
    async (name: string) => {
      const newProj = await addProject(name);
      await reloadProjects();
      setSelectedProjectId(newProj.id);
    },
    [addProject, reloadProjects, setSelectedProjectId]
  );

  const handleUpdateProject = useCallback(
    async (id: number, name: string) => {
      await updateProject(id, { name });
      await reloadProjects();
    },
    [updateProject, reloadProjects]
  );

  const handleDeleteProject = useCallback(
    async (id: number) => {
      await deleteProject(id);
      await reloadProjects();
      setSelectedProjectId(null);
      setSelectedTaskId(null);
    },
    [deleteProject, reloadProjects, setSelectedProjectId, setSelectedTaskId]
  );

  // Task actions
  const handleAddTask = useCallback(
    async (name: string) => {
      const newTask = await addTask(name);
      await reloadTasks();
      setSelectedTaskId(newTask.id);
    },
    [addTask, reloadTasks, setSelectedTaskId]
  );

  const handleUpdateTask = useCallback(
    async (id: number, name: string) => {
      await updateTask(id, { name });
      await reloadTasks();
    },
    [updateTask, reloadTasks]
  );

  const handleDeleteTask = useCallback(
    async (id: number) => {
      await deleteTask(id);
      await reloadTasks();
      setSelectedTaskId(null);
    },
    [deleteTask, reloadTasks, setSelectedTaskId]
  );

  // Helper to get item by id
  const getOrganizationById = useCallback(
    (id: number | null) => organizations.find((o) => o.id === id),
    [organizations]
  );

  const getProjectById = useCallback(
    (id: number | null) => projects.find((p) => p.id === id),
    [projects]
  );

  const getTaskById = useCallback(
    (id: number | null) => tasks.find((t) => t.id === id),
    [tasks]
  );

  return {
    // Organization
    handleAddOrganization,
    handleUpdateOrganization,
    handleDeleteOrganization,
    getOrganizationById,
    // Project
    handleAddProject,
    handleUpdateProject,
    handleDeleteProject,
    getProjectById,
    // Task
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    getTaskById,
  };
}
