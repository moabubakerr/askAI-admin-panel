import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './app/AppContext'
import Shell from './components/Shell'
import Login from './routes/login/Login'
import Overview from './routes/overview/Overview'
import Conversations from './routes/conversations/Conversations'
import ProvenanceScreen from './routes/conversations/Provenance'
import Catalogue from './routes/catalogue/Catalogue'
import IndicatorDetail from './routes/catalogue/IndicatorDetail'
import Lineage from './routes/lineage/Lineage'
import Users from './routes/users/Users'

function Gate() {
  const { authStatus } = useApp()

  if (authStatus === 'checking') {
    return (
      <div className="flex min-h-full items-center justify-center text-[12px] text-ink-3">
        <span className="flex items-center gap-2">
          <span className="size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-maroon" />
          Checking your session…
        </span>
      </div>
    )
  }

  if (authStatus === 'anonymous') return <Login />

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:messageId" element={<ProvenanceScreen />} />
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="catalogue/:indicatorId" element={<IndicatorDetail />} />
        <Route path="lineage" element={<Lineage />} />
        <Route path="users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Gate />
      </AppProvider>
    </BrowserRouter>
  )
}
