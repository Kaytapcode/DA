import { CourseList } from '@/hooks/useCourse'

export const MOCK_COURSES: CourseList[] = [
  {
    id: 'course-1',
    title: 'Advanced Quantum Mechanics',
    description: 'Deep dive into wave-particle duality, Schrödinger\'s equation, and subatomic phenomena.',
    courseCode: 'PHYS-401',
    moduleCount: 8,
    createdAt: '2025-09-15T00:00:00Z',
  },
  {
    id: 'course-2',
    title: 'Machine Learning Foundations',
    description: 'Supervised learning, neural networks, and model evaluation techniques.',
    courseCode: 'CS-350',
    moduleCount: 12,
    createdAt: '2025-10-01T00:00:00Z',
  },
  {
    id: 'course-3',
    title: 'UX Research Methods',
    description: 'User interviews, usability testing, and synthesis frameworks.',
    courseCode: 'DES-210',
    moduleCount: 6,
    createdAt: '2025-11-20T00:00:00Z',
  },
  {
    id: 'course-4',
    title: 'Cloud Architecture Essentials',
    description: 'AWS/GCP patterns, microservices, and distributed systems design.',
    courseCode: 'INFRA-301',
    moduleCount: 10,
    createdAt: '2025-12-05T00:00:00Z',
  },
  {
    id: 'course-5',
    title: 'Data Structures & Algorithms',
    description: 'Trees, graphs, sorting algorithms, and complexity analysis.',
    courseCode: 'CS-201',
    moduleCount: 14,
    createdAt: '2026-01-10T00:00:00Z',
  },
]

export interface MockOrg {
  id: string
  name: string
  slug: string
  memberCount: number
}

export const MOCK_ORGS: MockOrg[] = [
  { id: 'org-1', name: 'Lumina Research Hub', slug: 'lumina-research', memberCount: 2431 },
  { id: 'org-2', name: 'AI Innovators Guild', slug: 'ai-innovators', memberCount: 847 },
  { id: 'org-3', name: 'Quantum Labs Network', slug: 'quantum-labs', memberCount: 1205 },
  { id: 'org-4', name: 'Delta Learning Co.', slug: 'delta-learning', memberCount: 632 },
]

export interface MockUser {
  id: string
  username: string
  email: string
  role: string
  isSystemAdmin: boolean
  createdAt: string
}

export const MOCK_USERS: MockUser[] = [
  { id: 'u-1', username: 'alice_admin', email: 'alice@lumina.edu', role: 'OrgAdmin', isSystemAdmin: false, createdAt: '2025-08-01T00:00:00Z' },
  { id: 'u-2', username: 'bob_teacher', email: 'bob@lumina.edu', role: 'Teacher', isSystemAdmin: false, createdAt: '2025-09-12T00:00:00Z' },
  { id: 'u-3', username: 'carol_student', email: 'carol@example.com', role: 'Student', isSystemAdmin: false, createdAt: '2025-10-05T00:00:00Z' },
  { id: 'u-4', username: 'dan_student', email: 'dan@example.com', role: 'Student', isSystemAdmin: false, createdAt: '2025-11-20T00:00:00Z' },
  { id: 'u-5', username: 'eve_sysadmin', email: 'eve@platform.io', role: 'OrgAdmin', isSystemAdmin: true, createdAt: '2025-07-15T00:00:00Z' },
  { id: 'u-6', username: 'frank_teacher', email: 'frank@delta.edu', role: 'Teacher', isSystemAdmin: false, createdAt: '2026-01-03T00:00:00Z' },
]

export interface MockContent {
  id: string
  title: string
  contentType: string
  status: 'DRAFT' | 'PUBLISHED'
  orderIndex: number
}

export interface MockModule {
  id: string
  title: string
  orderIndex: number
  contents: MockContent[]
}

export const MOCK_MODULES: MockModule[] = [
  {
    id: 'mod-1',
    title: 'Introduction & Foundations',
    orderIndex: 0,
    contents: [
      { id: 'c-1', title: 'Welcome & Course Overview', contentType: 'VIDEO', status: 'PUBLISHED', orderIndex: 0 },
      { id: 'c-2', title: 'Setup & Prerequisites', contentType: 'DOCUMENT', status: 'PUBLISHED', orderIndex: 1 },
    ],
  },
  {
    id: 'mod-2',
    title: 'Core Concepts',
    orderIndex: 1,
    contents: [
      { id: 'c-3', title: 'Deep Dive: Key Principles', contentType: 'VIDEO', status: 'PUBLISHED', orderIndex: 0 },
      { id: 'c-4', title: 'Interactive Quiz', contentType: 'QUIZ', status: 'DRAFT', orderIndex: 1 },
      { id: 'c-5', title: 'Reading: Advanced Topics', contentType: 'DOCUMENT', status: 'DRAFT', orderIndex: 2 },
    ],
  },
  {
    id: 'mod-3',
    title: 'Assessment & Review',
    orderIndex: 2,
    contents: [
      { id: 'c-6', title: 'Final Project Brief', contentType: 'DOCUMENT', status: 'PUBLISHED', orderIndex: 0 },
      { id: 'c-7', title: 'Module Completion Quiz', contentType: 'QUIZ', status: 'DRAFT', orderIndex: 1 },
    ],
  },
]

export const MOCK_PROFILE = {
  fullName: 'Alexandra Chen',
  email: 'alex.chen@university.edu',
  bio: 'PhD researcher in computational physics. Passionate about ML applications in scientific computing.',
  institution: 'Institute of Technology',
  degree: 'PhD Computational Science',
}
