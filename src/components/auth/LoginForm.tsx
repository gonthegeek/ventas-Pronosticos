import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { signIn } from '../../state/slices/authSlice'
import { AppDispatch } from '../../state/store'
import type { RootState } from '../../state/store'

const LoginForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const authError = useSelector((state: RootState) => state.auth.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

    // Translate Firebase error codes to user-friendly Spanish messages
    const getErrorMessage = (errorMessage: string): string => {
      if (errorMessage.includes('auth/invalid-email') || errorMessage.includes('invalid-email')) {
        return 'El correo electrónico no es válido.'
      }
      if (errorMessage.includes('auth/user-disabled') || errorMessage.includes('user-disabled')) {
        return 'Esta cuenta ha sido deshabilitada. Contacta al administrador.'
      }
      if (errorMessage.includes('auth/user-not-found') || errorMessage.includes('user-not-found')) {
        return 'No existe una cuenta con este correo electrónico.'
      }
      if (errorMessage.includes('auth/wrong-password') || errorMessage.includes('wrong-password')) {
        return 'Contraseña incorrecta. Por favor, verifica tu contraseña.'
      }
      if (errorMessage.includes('auth/invalid-credential') || errorMessage.includes('invalid-credential')) {
        return 'Credenciales inválidas. Verifica tu correo y contraseña.'
      }
      if (errorMessage.includes('auth/too-many-requests') || errorMessage.includes('too-many-requests')) {
        return 'Demasiados intentos fallidos. Intenta de nuevo más tarde.'
      }
      if (errorMessage.includes('auth/network-request-failed') || errorMessage.includes('network-request-failed')) {
        return 'Error de conexión. Verifica tu conexión a internet.'
      }
      // Default message
      return 'Error al iniciar sesión. Verifica tus credenciales e intenta de nuevo.'
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await dispatch(signIn({ email, password })).unwrap()
    } catch (error: any) {
        const errorMessage = error?.message || error?.code || 'Login failed'
        setError(getErrorMessage(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="usuario@casapronosticos.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="••••••••"
        />
      </div>

      {(error || authError) && (
          <div className="bg-red-50 border border-red-400 rounded-md p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error de Autenticación</h3>
              <p className="text-sm text-red-700 mt-1">{error || getErrorMessage(authError || '')}</p>
              </div>
            </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                   shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>

      <div className="text-center text-sm text-gray-600">
        <p>Usar credenciales existentes de Firebase</p>
      </div>
    </form>
  )
}

export default LoginForm
