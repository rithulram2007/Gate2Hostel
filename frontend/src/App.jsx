import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Guest Routes - Redirect to dashboard if logged in */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
        />

        {/* Protected Customer/Partner Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/:userId" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/order/:orderId" 
          element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          } 
        />

        {/* Protected Admin-Only Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Admin />
            </ProtectedRoute>
          } 
        />

        {/* Page Not Found Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
