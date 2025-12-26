import { useState, useEffect, useCallback } from 'react'
import type { Project, ProjectStatus } from '../types/electron'

export function useProjects(organizationId: number | null, statusFilter?: ProjectStatus) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(organizationId !== null)
  const [error, setError] = useState<Error | null>(null)

  const loadProjects = useCallback(async () => {
    if (!organizationId) {
      setProjects([])
      return
    }

    try {
      setLoading(true)
      const projs = await window.electronAPI.getProjects(organizationId, statusFilter)
      setProjects(projs)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [organizationId, statusFilter])

  useEffect(() => {
    if (organizationId) {
      setLoading(true)
    }
    loadProjects()
  }, [loadProjects, organizationId])

  // Listen for data changes from other windows
  useEffect(() => {
    const unsubscribe = window.electronAPI.onDataChanged?.((data) => {
      if (data.type === 'projects') {
        loadProjects()
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [loadProjects])

  const addProject = async (name: string, description?: string, status: ProjectStatus = 'in_progress') => {
    if (!organizationId) throw new Error('No organization selected')
    
    try {
      const newProject = await window.electronAPI.addProject(name, organizationId, description, status)
      setProjects([...projects, newProject])
      return newProject
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateProject = async (id: number, data: { name?: string; description?: string; status?: ProjectStatus }) => {
    try {
      await window.electronAPI.updateProject(id, data)
      setProjects(projects.map((proj: Project) => 
        proj.id === id ? { ...proj, ...data } : proj
      ))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteProject = async (id: number) => {
    try {
      await window.electronAPI.deleteProject(id)
      setProjects(projects.filter((proj: Project) => proj.id !== id))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    projects,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    reload: loadProjects,
  }
}
