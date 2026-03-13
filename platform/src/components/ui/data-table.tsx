'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from './card'

interface DataTableProps {
  headers: string[]
  rows: ReactNode[][]
  emptyMessage?: string
  className?: string
}

export function DataTable({
  headers,
  rows,
  emptyMessage = 'No data available',
  className,
}: DataTableProps) {
  if (rows.length === 0) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <p className="text-slate-600">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-slate-200', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-100/50">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-6 py-3 font-semibold text-slate-900"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-slate-200 hover:bg-slate-100/50 transition-colors"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-6 py-4 text-slate-900"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
