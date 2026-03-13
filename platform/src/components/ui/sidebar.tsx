'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LucideIcon, Menu, X, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from './badge'

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  badge?: string
  locked?: boolean
}

interface SidebarProps {
  items: SidebarItem[]
  currentPath: string
  className?: string
}

export function Sidebar({ items, currentPath, className }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sidebarContent = (
    <nav className="space-y-2 p-4">
      {items.map((item) => {
        const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
        const Icon = item.icon

        if (item.locked) {
          return (
            <div
              key={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium',
                'cursor-not-allowed opacity-50 text-slate-600',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              <Lock className="h-4 w-4" />
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
            onClick={() => setIsOpen(false)}
          >
            <Icon className="h-5 w-5" />
            <span className="flex-1">{item.label}</span>
            {item.badge && <Badge size="sm">{item.badge}</Badge>}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 rounded-lg bg-white p-2 text-slate-900 md:hidden"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:block w-64 border-r border-slate-200 bg-white overflow-y-auto',
          className,
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white overflow-y-auto md:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
