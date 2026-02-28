import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Users,
  BookOpen,
  GraduationCap,
  FileBarChart2,
  UserPlus,
  MessageSquare,
  BookMarked,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types/auth'

export interface NavItem {
  label: string
  to:    string
  icon:  LucideIcon
}

export const NAV_CONFIG: Record<Role, NavItem[]> = {
  faculty: [
    { label: 'Dashboard',     to: '/faculty/dashboard',       icon: LayoutDashboard },
    { label: 'Attendance',    to: '/faculty/attendance',       icon: ClipboardCheck  },
    { label: 'Att. Data',     to: '/faculty/attendance-data',  icon: FileSpreadsheet },
    { label: 'Courses',       to: '/faculty/courses',          icon: BookOpen        },
    { label: 'Helpdesk',      to: '/faculty/helpdesk',         icon: MessageSquare   },
    { label: 'Reports',       to: '/faculty/reports',          icon: BarChart3       },
  ],

  student: [
    { label: 'Dashboard',  to: '/student/dashboard',  icon: LayoutDashboard },
    { label: 'My Classes', to: '/student/classes',    icon: GraduationCap   },
    { label: 'Attendance', to: '/student/attendance', icon: ClipboardCheck  },
    { label: 'Helpdesk',   to: '/student/helpdesk',   icon: MessageSquare   },
  ],

  hod: [
    { label: 'Dashboard',  to: '/hod/dashboard',   icon: LayoutDashboard },
    { label: 'Faculty',    to: '/hod/faculty',     icon: Users           },
    { label: 'Subjects',   to: '/hod/subjects',    icon: BookMarked      },
    { label: 'Requests',   to: '/hod/requests',    icon: UserPlus        },
    { label: 'Attendance', to: '/hod/attendance',  icon: ClipboardCheck  },
    { label: 'Reports',    to: '/hod/reports',     icon: FileBarChart2   },
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  faculty: 'Faculty',
  student: 'Student',
  hod:     'Head of Department',
}
