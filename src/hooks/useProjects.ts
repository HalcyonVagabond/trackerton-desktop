import { useState, useEffect } from 'react'
import type { Project } from '../types/electron'

export function useProjects(organizationId: number | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadProjects = async () => {
    if (!organizationId) {
      setProjects([])
      return
    }

    try {
      setLoading(true)
      const projs = await window.electronAPI.getProjects(organizationId)
      setProjects(projs)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [organizationId])

  const addProject = async (name: string, description?: string) => {
    if (!organizationId) throw new Error('No organization selected')
    
    try {
      const newProject = await window.electronAPI.addProject(name, organizationId)
      setProjects([...projects, newProject])
      return newProject
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateProject = async (id: number, name: string, description?: string) => {
    try {
      await window.electronAPI.updateProject(id, name, description)
      setProjects(projects.map((proj: Project) => 
        proj.id === id ? { ...proj, name, description } : proj
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
