import React, { useState } from 'react'
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAppSelector } from '../../state/hooks'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'

interface BackupData {
  users: any[]
  salesData: any[]
  metadata: {
    createdAt: Date
    version: string
    totalRecords: number
    dateRange: {
      start: string
      end: string
    }
  }
}

interface BackupStats {
  totalUsers: number
  totalSales: number
  backupSize: string
  errors: string[]
}

interface RestoreStats {
  usersRestored: number
  salesRestored: number
  errors: string[]
}

const BackupRestoreTool: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const hasPermission = useHasPermission(PERMISSIONS.ADMIN_ALL)
  const [isRunning, setIsRunning] = useState(false)
  const [backupStats, setBackupStats] = useState<BackupStats>({ totalUsers: 0, totalSales: 0, backupSize: '', errors: [] })
  const [restoreStats, setRestoreStats] = useState<RestoreStats>({ usersRestored: 0, salesRestored: 0, errors: [] })
  const [logs, setLogs] = useState<string[]>([])
  const [backupData, setBackupData] = useState<BackupData | null>(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null)

  if (!hasPermission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Acceso Denegado</h3>
          <p className="mt-2 text-red-700">Solo administradores pueden acceder a esta herramienta.</p>
        </div>
      </div>
    )
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    setLogs(prev => [...prev, logMessage])
  }

  const getCollectionPath = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `data/sales/${year}/${month}/${day}`
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const createBackup = async () => {
    setIsRunning(true)
    setLogs([])
    
    const newStats: BackupStats = { totalUsers: 0, totalSales: 0, backupSize: '', errors: [] }

    try {
      addLog('🔄 Iniciando proceso de respaldo...')
      
      // Backup Users
      addLog('👥 Respaldando usuarios...')
      const usersData: any[] = []
      
      try {
        // Try both 'users' and 'authorizedUsers' collections
        const collections = ['authorizedUsers', 'users']
        let usersFound = false
        
        for (const collectionName of collections) {
          try {
            const usersSnapshot = await getDocs(collection(db, collectionName))
            if (!usersSnapshot.empty) {
              addLog(`📂 Encontrados usuarios en colección: ${collectionName}`)
              usersSnapshot.docs.forEach(doc => {
                const userData = doc.data()
                // Remove sensitive fields from backup
                const { password, ...safeUserData } = userData
                usersData.push({
                  id: doc.id,
                  sourceCollection: collectionName,
                  ...safeUserData,
                  backedUpAt: new Date().toISOString()
                })
              })
              usersFound = true
              break // Stop after finding users in first collection
            }
          } catch (error) {
            addLog(`⚠️ Error accediendo a colección ${collectionName}: ${error}`)
          }
        }
        
        if (!usersFound) {
          addLog('⚠️ No se encontraron usuarios en las colecciones: authorizedUsers, users')
        }
        
        newStats.totalUsers = usersData.length
        addLog(`✅ ${usersData.length} usuarios respaldados`)
      } catch (error) {
        const errorMsg = `Error respaldando usuarios: ${error}`
        newStats.errors.push(errorMsg)
        addLog(`❌ ${errorMsg}`)
      }

      // Backup Sales Data
      addLog('💰 Respaldando datos de ventas...')
      const salesData: any[] = []
      
      // Determine date range - declare outside try block
      let startDate: Date
      let endDate: Date
      
      if (dateRange.start && dateRange.end) {
        startDate = new Date(dateRange.start)
        endDate = new Date(dateRange.end)
        addLog(`📅 Rango personalizado: ${dateRange.start} a ${dateRange.end}`)
      } else {
        // Default: last 120 days to ensure we get all data
        endDate = new Date()
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 120)
        addLog(`📅 Rango automático: últimos 120 días`)
        addLog(`📅 Fechas calculadas: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}`)
      }
      
      try {
        // Collect sales data for date range
        let daysWithData = 0
        let totalDaysChecked = 0
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const collectionPath = getCollectionPath(d)
          const dateStr = d.toISOString().split('T')[0]
          totalDaysChecked++
          
          try {
            const querySnapshot = await getDocs(collection(db, collectionPath))
            
            if (!querySnapshot.empty) {
              addLog(`📊 Respaldando ${querySnapshot.size} registros de ${dateStr}`)
              daysWithData++
              
              querySnapshot.docs.forEach(doc => {
                salesData.push({
                  id: doc.id,
                  collectionPath,
                  date: dateStr,
                  ...doc.data(),
                  backedUpAt: new Date().toISOString()
                })
              })
            } else {
              // Only log first few empty days to avoid spam
              if (totalDaysChecked <= 10 || daysWithData === 0) {
                addLog(`⚪ Sin datos para ${dateStr}`)
              }
            }
          } catch (error) {
            addLog(`⚠️ Error accediendo a ${collectionPath}: ${error}`)
          }
        }

        addLog(`📈 Resumen: ${daysWithData} días con datos de ${totalDaysChecked} días verificados`)
        newStats.totalSales = salesData.length
        addLog(`✅ ${salesData.length} registros de ventas respaldados`)
      } catch (error) {
        const errorMsg = `Error respaldando ventas: ${error}`
        newStats.errors.push(errorMsg)
        addLog(`❌ ${errorMsg}`)
      }

      // Create backup object
      const backup: BackupData = {
        users: usersData,
        salesData: salesData,
        metadata: {
          createdAt: new Date(),
          version: '1.0.0',
          totalRecords: usersData.length + salesData.length,
          dateRange: {
            start: dateRange.start || startDate!.toISOString().split('T')[0],
            end: dateRange.end || endDate!.toISOString().split('T')[0]
          }
        }
      }

      // Calculate backup size
      const backupJson = JSON.stringify(backup)
      newStats.backupSize = formatBytes(new Blob([backupJson]).size)
      
      setBackupData(backup)
      addLog(`📦 Respaldo creado: ${newStats.backupSize}`)
      addLog('✅ ¡Respaldo completado exitosamente!')
      
    } catch (error) {
      const errorMsg = `Error crítico durante respaldo: ${error}`
      newStats.errors.push(errorMsg)
      addLog(`💥 ${errorMsg}`)
    } finally {
      setBackupStats(newStats)
      setIsRunning(false)
    }
  }

  const downloadBackup = () => {
    if (!backupData) return

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `casa_pronosticos_backup_${timestamp}.json`
    
    const backupJson = JSON.stringify(backupData, null, 2)
    const blob = new Blob([backupJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    addLog(`📥 Respaldo descargado: ${filename}`)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedBackupFile(file)
      addLog(`📁 Archivo seleccionado: ${file.name} (${formatBytes(file.size)})`)
    }
  }

  const restoreFromBackup = async () => {
    if (!selectedBackupFile) {
      addLog('❌ No se ha seleccionado archivo de respaldo')
      return
    }

    if (!confirm('⚠️ ADVERTENCIA: Esta operación reemplazará los datos existentes. ¿Continuar con la restauración?')) {
      return
    }

    setIsRunning(true)
    setLogs([])
    
    const newStats: RestoreStats = { usersRestored: 0, salesRestored: 0, errors: [] }

    try {
      addLog('🔄 Iniciando proceso de restauración...')
      
      // Read and parse backup file
      const fileContent = await selectedBackupFile.text()
      const backup: BackupData = JSON.parse(fileContent)
      
      addLog(`📂 Archivo de respaldo cargado:`)
      addLog(`   • Versión: ${backup.metadata.version}`)
      addLog(`   • Fecha: ${backup.metadata.createdAt}`)
      addLog(`   • Usuarios: ${backup.users.length}`)
      addLog(`   • Ventas: ${backup.salesData.length}`)
      addLog(`   • Rango: ${backup.metadata.dateRange.start} a ${backup.metadata.dateRange.end}`)

      // Restore Users
      if (backup.users.length > 0) {
        addLog('👥 Restaurando usuarios...')
        
        try {
          for (const userData of backup.users) {
            const { id, backedUpAt, sourceCollection, ...userFields } = userData
            
            // Restore to the original collection or default to 'authorizedUsers'
            const targetCollection = sourceCollection || 'authorizedUsers'
            
            await setDoc(doc(db, targetCollection, id), {
              ...userFields,
              restoredAt: new Date(),
              restoredFrom: selectedBackupFile.name
            })
            newStats.usersRestored++
          }
          
          addLog(`✅ ${newStats.usersRestored} usuarios restaurados`)
        } catch (error) {
          const errorMsg = `Error restaurando usuarios: ${error}`
          newStats.errors.push(errorMsg)
          addLog(`❌ ${errorMsg}`)
        }
      }

      // Restore Sales Data
      if (backup.salesData.length > 0) {
        addLog('💰 Restaurando datos de ventas...')
        
        try {
          for (const saleData of backup.salesData) {
            const { id, collectionPath, backedUpAt, date, ...saleFields } = saleData
            
            // Restore to original collection path
            await setDoc(doc(db, collectionPath, id), {
              ...saleFields,
              restoredAt: new Date(),
              restoredFrom: selectedBackupFile.name
            })
            
            newStats.salesRestored++
            
            if (newStats.salesRestored % 100 === 0) {
              addLog(`📈 ${newStats.salesRestored} registros restaurados...`)
            }
          }
          
          addLog(`✅ ${newStats.salesRestored} registros de ventas restaurados`)
        } catch (error) {
          const errorMsg = `Error restaurando ventas: ${error}`
          newStats.errors.push(errorMsg)
          addLog(`❌ ${errorMsg}`)
        }
      }

      addLog('✅ ¡Restauración completada exitosamente!')
      addLog(`📊 Resumen:`)
      addLog(`   • Usuarios restaurados: ${newStats.usersRestored}`)
      addLog(`   • Registros de ventas restaurados: ${newStats.salesRestored}`)
      
    } catch (error) {
      const errorMsg = `Error crítico durante restauración: ${error}`
      newStats.errors.push(errorMsg)
      addLog(`💥 ${errorMsg}`)
    } finally {
      setRestoreStats(newStats)
      setIsRunning(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setBackupStats({ totalUsers: 0, totalSales: 0, backupSize: '', errors: [] })
    setRestoreStats({ usersRestored: 0, salesRestored: 0, errors: [] })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Respaldo y Restauración</h1>
        <p className="mt-2 text-gray-600">Crea respaldos completos de usuarios y datos, y restaura desde archivos de respaldo</p>
      </div>

      {/* Backup Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-800 mb-4">📦 Crear Respaldo</h2>
        
        {/* Date Range Selector */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio (opcional)</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin (opcional)</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acciones Rápidas</label>
            <button
              type="button"
              onClick={() => setDateRange({ start: '2025-06-01', end: new Date().toISOString().split('T')[0] })}
              disabled={isRunning}
              className="w-full px-3 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              📅 Desde Junio 2025
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Si no especificas fechas, se respaldará automáticamente los últimos 120 días. 
          Para asegurar todos los datos desde junio, usa el botón "Desde Junio 2025".
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={createBackup}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold ${
              isRunning
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isRunning ? '🔄 Creando Respaldo...' : '📦 Crear Respaldo'}
          </button>
          
          {backupData && (
            <button
              onClick={downloadBackup}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
            >
              📥 Descargar Respaldo
            </button>
          )}
        </div>
      </div>

      {/* Restore Section */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-orange-800 mb-4">🔄 Restaurar desde Respaldo</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo de respaldo (.json)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isRunning}
          />
        </div>
        
        <button
          onClick={restoreFromBackup}
          disabled={isRunning || !selectedBackupFile}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isRunning || !selectedBackupFile
              ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {isRunning ? '🔄 Restaurando...' : '🔄 Restaurar Datos'}
        </button>
        
        {!selectedBackupFile && (
          <p className="mt-2 text-sm text-gray-600">
            Selecciona un archivo de respaldo para habilitar la restauración
          </p>
        )}
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">⚠️ Importante</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p><strong>Respaldo:</strong> Incluye todos los usuarios (sin contraseñas) y datos de ventas del rango especificado.</p>
              <p><strong>Restauración:</strong> Reemplaza los datos existentes con los del archivo de respaldo.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {(backupStats.totalUsers > 0 || backupStats.totalSales > 0 || restoreStats.usersRestored > 0 || restoreStats.salesRestored > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800">Usuarios Respaldados</h3>
            <p className="text-2xl font-bold text-blue-600">{backupStats.totalUsers}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800">Ventas Respaldadas</h3>
            <p className="text-2xl font-bold text-green-600">{backupStats.totalSales}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-800">Usuarios Restaurados</h3>
            <p className="text-2xl font-bold text-purple-600">{restoreStats.usersRestored}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-indigo-800">Ventas Restauradas</h3>
            <p className="text-2xl font-bold text-indigo-600">{restoreStats.salesRestored}</p>
          </div>
        </div>
      )}

      {backupStats.backupSize && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800">📊 Información del Respaldo</h3>
          <p className="text-gray-600">Tamaño del archivo: <span className="font-bold">{backupStats.backupSize}</span></p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={clearLogs}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
        >
          🧹 Limpiar Logs
        </button>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">📋 Log del Sistema:</h3>
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {(backupStats.errors.length > 0 || restoreStats.errors.length > 0) && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Errores:</h3>
          {[...backupStats.errors, ...restoreStats.errors].map((error, index) => (
            <p key={index} className="text-red-700">{error}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default BackupRestoreTool
