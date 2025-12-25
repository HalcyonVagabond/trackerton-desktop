// Time formatting utilities

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  // Only show hours if > 0, no leading zeros on the first segment
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  // Only show minutes:seconds, no leading zero on minutes
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export function parseDuration(display: string): number {
  const [hours, minutes, seconds] = display.split(':').map(Number)
  return (hours * 3600) + (minutes * 60) + seconds
}

export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString()
}

export function formatDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleDateString()
}

export function formatTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString()
}
