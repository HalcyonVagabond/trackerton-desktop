import { useState, useEffect } from 'react'
import type { Task } from '../types/electron'

export function useTasks(projectId: number | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadTasks = async () => {
    if (!projectId) {
      setTasks([])
      return
    }

    try {
      setLoading(true)
      const taskList = await window.electronAPI.getTasks(projectId)
      setTasks(taskList)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [projectId])

  const addTask = async (name: string) => {
    if (!projectId) throw new Error('No project selected')
    
    try {
      const newTask = await window.electronAPI.addTask(name, projectId)
      setTasks([...tasks, newTask])
      return newTask
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateTask = async (id: number, name: string) => {
    try {
      await window.electronAPI.updateTask(id, name)
      setTasks(tasks.map((task: Task) => 
        task.id === id ? { ...task, name } : task
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
