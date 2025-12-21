import { useState, useEffect } from 'react'
import type { Organization } from '../types/electron'

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const orgs = await window.electronAPI.getOrganizations()
      setOrganizations(orgs)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  const addOrganization = async (name: string) => {
    try {
      const newOrg = await window.electronAPI.addOrganization(name)
      setOrganizations([...organizations, newOrg])
      return newOrg
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateOrganization = async (id: number, name: string) => {
    try {
      await window.electronAPI.updateOrganization(id, name)
      setOrganizations(organizations.map(org => 
        org.id === id ? { ...org, name } : org
      ))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const deleteOrganization = async (id: number) => {
    try {
      await window.electronAPI.deleteOrganization(id)
      setOrganizations(organizations.filter(org => org.id !== id))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  return {
    organizations,
    loading,
    error,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    reload: loadOrganizations,
  }
}
