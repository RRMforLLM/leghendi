export function getRelativeTime(date: string) {
  const now = new Date()
  const commentDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }
  
  return commentDate.toLocaleDateString()
}