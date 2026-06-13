import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import AgentDashboard from './pages/AgentDashboard';
import CallRoom from './pages/CallRoom';
import JoinPage from './pages/JoinPage';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children, requiredRole }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/" element={
          <PrivateRoute>
            {user?.role === 'admin' ? <AdminDashboard /> : <AgentDashboard />}
          </PrivateRoute>
        } />
        <Route path="/room/:sessionId" element={
          <PrivateRoute><CallRoom /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
