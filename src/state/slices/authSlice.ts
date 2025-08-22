import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { User } from 'firebase/auth'
import { AuthService } from '../../services/AuthService'
import { UserProfile, UserRole, RoleName, PermissionName } from '../../utils/permissions'

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  isLoading: false, // Changed to false since we handle loading differently
  isAuthenticated: false,
  error: null,
}

// Async thunks for Firebase operations
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    const result = await AuthService.initializeAuth()
    return result
  }
)

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    return await AuthService.signIn(email, password)
  }
)

export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    await AuthService.signOut()
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    setUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.userProfile = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false
        if (action.payload) {
          state.user = action.payload.user
          state.userProfile = action.payload.userProfile
          state.isAuthenticated = true
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Authentication failed'
      })
      .addCase(signIn.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.userProfile = action.payload.userProfile
        state.isAuthenticated = true
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Sign in failed'
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null
        state.userProfile = null
        state.isAuthenticated = false
        state.error = null
      })
  },
})

export const { setUser, setUserProfile, clearError } = authSlice.actions
export default authSlice.reducer
