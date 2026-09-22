import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ApiError } from './api/transport'
import './fonts'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // A dead session, a disabled admin API and a missing row will not fix
        // themselves on retry.
        if (error instanceof ApiError) {
          if (
            error.kind === 'session-ended' ||
            error.kind === 'api-disabled' ||
            error.kind === 'not-found'
          ) {
            return false
          }
        }
        return failureCount < 1
      },
    },
  },
})

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
