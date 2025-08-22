import React, { useState, useEffect } from 'react'
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAppSelector } from '../../state/hooks'
import { useHasPermission } from '../../hooks/usePermissions'
import { PERMISSIONS } from '../../utils/permissions'
import BackupRestoreTool from './DataMigrationTool'

interface User {
  id: string
  email: string
  role: any // Flexible to handle both string and object structures
  permissions?: string[]
  isActive: boolean
  displayName: string
}

const AdminSetup: React.FC = () => {
  const { user, userProfile } = useAppSelector((state) => state.auth)
  const hasPermission = useHasPermission(PERMISSIONS.ADMIN_ALL)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'migration'>('users')
  const [newUser, setNewUser] = useState({
    email: '',
    role: 'operador',
    displayName: '',
    isActive: true
  })

  // Check if user has admin permissions
  if (!hasPermission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800">Acceso Denegado</h3>
          <p className="mt-2 text-red-700">No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    console.log('AdminSetup - Current user:', user)
    console.log('AdminSetup - Current userProfile:', userProfile)
    console.log('AdminSetup - Has permission:', hasPermission)
    loadUsers()
  }, [user, userProfile, hasPermission])

  const loadUsers = async () => {
    try {
      setLoading(true)
      console.log('AdminSetup - Loading users from authorizedUsers collection...')
      const usersSnapshot = await getDocs(collection(db, 'authorizedUsers'))
      console.log('AdminSetup - Users snapshot:', usersSnapshot)
      console.log('AdminSetup - Number of docs:', usersSnapshot.docs.length)
      
      const usersList = usersSnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('AdminSetup - User doc:', doc.id, data)
        return {
          id: doc.id,
          ...data
        }
      }) as User[]
      
      console.log('AdminSetup - Final users list:', usersList)
      setUsers(usersList)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUser.email.trim() || !newUser.displayName.trim()) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      setLoading(true)
      
      // Generate user ID from email
      const userId = newUser.email.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      // Get role structure that matches AuthService expectations
      const roleStructure = getRoleStructure(newUser.role)
      
      const userData = {
        email: newUser.email.toLowerCase(),
        displayName: newUser.displayName,
        role: roleStructure,
        isActive: newUser.isActive,
        createdAt: new Date(),
        createdBy: userProfile?.email || user?.email || 'system',
        updatedAt: new Date()
      }

      await setDoc(doc(db, 'authorizedUsers', userId), userData)
      
      // Reset form
      setNewUser({
        email: '',
        role: 'operador',
        displayName: '',
        isActive: true
      })
      
      // Reload users
      await loadUsers()
      
      alert('Usuario creado exitosamente')
    } catch (error) {
      console.error('Error creating user:', error)
      alert('Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await setDoc(doc(db, 'authorizedUsers', userId), { isActive }, { merge: true })
      await loadUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Error al actualizar usuario')
    }
  }

  const getRoleStructure = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          name: 'admin',
          level: 3,
          permissions: [
            'ventas:all',
            'reportes:all',
            'admin:all'
          ]
        }
      case 'supervisor':
        return {
          name: 'supervisor',
          level: 2,
          permissions: [
            'ventas:all',
            'reportes:read'
          ]
        }
      case 'operador':
        return {
          name: 'operador',
          level: 1,
          permissions: [
            'ventas:write',
            'ventas:read'
          ]
        }
      default:
        return {
          name: 'operador',
          level: 1,
          permissions: ['ventas:read']
        }
    }
  }

  const getRolePermissions = (role: string): string[] => {
    return getRoleStructure(role).permissions
  }

  const getRoleDisplayName = (user: User): string => {
    // Handle both old and new role structures
    const roleName = user.role?.name || user.role || 'operador'
    switch (roleName) {
      case 'admin': return 'Administrador'
      case 'supervisor': return 'Supervisor'
      case 'operador': return 'Operador'
      default: return String(roleName)
    }
  }

  const getUserPermissions = (user: User): string[] => {
    // Handle both old and new permission structures
    return user.role?.permissions || user.permissions || []
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="mt-2 text-gray-600">Gestiona usuarios, permisos y datos del sistema</p>
        
        {/* Current User Debug Info */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Usuario Actual:</h3>
          <div className="text-sm text-gray-600">
            <div className="mb-2">
              <strong>Firebase Auth User:</strong>
              <p><strong>Email:</strong> {user?.email || 'No disponible'}</p>
              <p><strong>UID:</strong> {user?.uid || 'No disponible'}</p>
              <p><strong>Display Name:</strong> {user?.displayName || 'No disponible'}</p>
              <p><strong>Auth State:</strong> {user ? 'Autenticado' : 'No autenticado'}</p>
            </div>
            <div>
              <strong>User Profile (from Firestore):</strong>
              <p><strong>Email:</strong> {userProfile?.email || 'No disponible'}</p>
              <p><strong>Display Name:</strong> {userProfile?.displayName || 'No disponible'}</p>
              <p><strong>Role:</strong> {userProfile?.role?.name || 'No disponible'}</p>
              <p><strong>Active:</strong> {userProfile?.isActive ? 'Sí' : 'No'}</p>
              <p><strong>Profile State:</strong> {userProfile ? 'Cargado' : 'No cargado'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as 'users' | 'migration')}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="users">Gestión de Usuarios</option>
            <option value="migration">Respaldo y Restauración</option>
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                👥 Gestión de Usuarios
              </button>
              <button
                onClick={() => setActiveTab('migration')}
                className={`${
                  activeTab === 'migration'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                � Respaldo y Restauración
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? (
        <>
          {/* Create User Form */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Crear Nuevo Usuario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="usuario@empresa.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={newUser.displayName}
              onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="operador">Operador</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={createUser}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Usuarios del Sistema</h2>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Total de usuarios: {users.length}
          </p>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">Cargando usuarios...</div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-500">No se encontraron usuarios en la base de datos.</div>
            <p className="text-sm text-gray-400 mt-2">
              Verifica que tengas usuarios en la colección 'authorizedUsers' de Firestore.
            </p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getRoleDisplayName(user)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {getUserPermissions(user)?.map((permission, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-600"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => updateUserStatus(user.id, !user.isActive)}
                      className={`${
                        user.isActive 
                          ? 'text-red-600 hover:text-red-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
        </>
      ) : (
        <BackupRestoreTool />
      )}
    </div>
  )
}

export default AdminSetup
