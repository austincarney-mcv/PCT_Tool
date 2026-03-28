import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import { showToast } from './lib/toast'
import './styles/variables.css'
import './styles/globals.css'
import './styles/table.css'
import './styles/forms.css'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess: () => showToast('Saved'),
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
