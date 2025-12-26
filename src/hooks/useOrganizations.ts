import { useState, useEffect, useCallback } from 'react'
import type { Organization, OrganizationStatus } from '../types/electron'

export function useOrganizations(statusFilter?: OrganizationStatus) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      const orgs = await window.electronAPI.getOrganizations(statusFilter)
      setOrganizations(orgs)
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  // Listen for data changes from other windows
  useEffect(() => {
    const unsubscribe = window.electronAPI.onDataChanged?.((data) => {
      if (data.type === 'organizations') {
        loadOrganizations()
      }
    })
    return () => {
      unsubscribe?.()
    }
  }, [loadOrganizations])

  const addOrganization = async (name: string, status: OrganizationStatus = 'active') => {
    try {
      const newOrg = await window.electronAPI.addOrganization(name, status)
      setOrganizations([...organizations, newOrg])
      return newOrg
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }

  const updateOrganization = async (id: number, data: { name?: string; status?: OrganizationStatus }) => {
    try {
      await window.electronAPI.updateOrganization(id, data)
      setOrganizations(organizations.map(org => 
        org.id === id ? { ...org, ...data } : org
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
