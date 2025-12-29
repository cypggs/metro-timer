import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      default: 'bg-gray-900 text-gray-50 shadow hover:bg-gray-900/90',
      destructive: 'bg-red-500 text-gray-50 shadow-sm hover:bg-red-500/90',
      outline: 'border border-gray-200 bg-white shadow-sm hover:bg-gray-100 hover:text-gray-900',
      secondary: 'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-100/80',
      ghost: 'hover:bg-gray-100 hover:text-gray-900',
      link: 'text-gray-900 underline-offset-4 hover:underline'
    }

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-md px-8 text-lg',
      icon: 'h-10 w-10'
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
