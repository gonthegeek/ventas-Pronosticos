import React from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  loading?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
  loading = false
}) => {
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500"></div>
          <span className="ml-2 text-gray-600">Cargando...</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-white rounded-lg shadow border ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">{actions}</div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}

export default Card
