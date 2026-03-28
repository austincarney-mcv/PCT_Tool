import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProjectProvider } from './context/ProjectContext'
import AppShell from './components/layout/AppShell'
import Toast from './components/common/Toast'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DeliverableSchedulePage from './pages/DeliverableSchedulePage'
import C2CPage from './pages/C2CPage'
import ApprovalsPage from './pages/ApprovalsPage'
import CriticalItemsPage from './pages/CriticalItemsPage'
import DesignChangePage from './pages/DesignChangePage'
import BriefCompliancePage from './pages/BriefCompliancePage'
import RFIPage from './pages/RFIPage'
import SiDPage from './pages/SiDPage'
import RiskIssuePage from './pages/RiskIssuePage'
import ValueLogPage from './pages/ValueLogPage'
import LessonsLearntPage from './pages/LessonsLearntPage'
import TeamResourcesPage from './pages/TeamResourcesPage'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <RequireAuth>
            <ProjectProvider>
              <AppShell />
            </ProjectProvider>
          </RequireAuth>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="deliverables" element={<DeliverableSchedulePage />} />
          <Route path="c2c" element={<C2CPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="critical-items" element={<CriticalItemsPage />} />
          <Route path="design-changes" element={<DesignChangePage />} />
          <Route path="brief-compliance" element={<BriefCompliancePage />} />
          <Route path="rfis" element={<RFIPage />} />
          <Route path="sid" element={<SiDPage />} />
          <Route path="risks" element={<RiskIssuePage />} />
          <Route path="value-log" element={<ValueLogPage />} />
          <Route path="lessons" element={<LessonsLearntPage />} />
          <Route path="team" element={<TeamResourcesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
