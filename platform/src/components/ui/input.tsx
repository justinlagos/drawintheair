'use client'

import React, { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-white dark:text-gray-200"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-gray-900 px-4 py-2 text-white placeholder-gray-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-600 dark:border-red-600'
              : 'border-gray-700 dark:border-gray-700'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

export { Input, type InputProps }
