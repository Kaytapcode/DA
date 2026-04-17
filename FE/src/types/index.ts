/**
 * Global Type Definitions
 */

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'org_admin' | 'instructor' | 'student'
  avatar?: string
}

export interface Course {
  id: string
  title: string
  description: string
  instructor: string
  students: number
  rating: number
  thumbnail?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: Date
  read: boolean
}
