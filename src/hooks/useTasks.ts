import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStatus } from '../types/electron'

export function useTasks(projectId: number | null, statusFilter?: TaskStatus) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(projectId !== null)
  const [error, setError] = useState<Error | null>(null)

  const loadTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([])
      return
    }

    try {
      setLoading(true)
      const taskList = await window.electronAPI.getTasks(projectId, statusFilter)
      setTasks(taskList)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter])

  useEffect(() => {
    if (projectId) {
      setLoading(true)
    }
    loadTasks()
  }, [loadTasks, projectId])

  // Listen for data changes from other windows
  useEffect(() => {
    const unsubscribe = window.electronAPI.onDataChanged?.((data) => {
      if (data.type === 'tasks') {
        loadTasks()
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [loadTasks])

  const addTask = async (name: string, status: TaskStatus = 'todo') => {
    if (!projectId) throw new Error('No project selected')
    
    try {
      const newTask = await window.electronAPI.addTask(name, projectId, status)
      setTasks([...tasks, newTask])
      return newTask
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateTask = async (id: number, data: { name?: string; status?: TaskStatus }) => {
    try {
      await window.electronAPI.updateTask(id, data)
      setTasks(tasks.map((task: Task) => 
        task.id === id ? { ...task, ...data } : task
      ))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteTask = async (id: number) => {
    try {
      await window.electronAPI.deleteTask(id)
      setTasks(tasks.filter((task: Task) => task.id !== id))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    reload: loadTasks,
  }
}
