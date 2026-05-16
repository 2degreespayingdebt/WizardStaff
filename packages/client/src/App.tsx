import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leagues from './pages/Leagues';
import League from './pages/League';
import Draft from './pages/Draft';
import PlayerProfile from './pages/PlayerProfile';
import CreateDrinker from './pages/CreateDrinker';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues"
            element={
              <ProtectedRoute>
                <Leagues />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:id"
            element={
              <ProtectedRoute>
                <League />
              </ProtectedRoute>
            }
          />
          <Route
            path="/draft/:id"
            element={
              <ProtectedRoute>
                <Draft />
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:id"
            element={
              <ProtectedRoute>
                <PlayerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/new"
            element={
              <ProtectedRoute>
                <CreateDrinker />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}