import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Get initial theme
    window.electronAPI.getTheme().then(setTheme)

    // Listen for theme changes
    window.electronAPI.onThemeChange((newTheme) => {
      setTheme(newTheme as 'light' | 'dark')
      
      // Update document class
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.setAttribute('data-theme', 'light')
      }
    })
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    window.electronAPI.sendThemeChange(newTheme)
    
    // Update document class immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  }
}
