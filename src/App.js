import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard';

import CustomerCab from './pages/cab/CustomerCab';
import DriverCab from './pages/cab/DriverCab';

import CustomerServiceRequest from './pages/services/CustomerServiceRequest';
import WorkerDashboard from './pages/services/WorkerDashboard';

import HostProperties from './pages/housing/HostProperties';
import CustomerHousing from './pages/housing/CustomerHousing';

import MedicalCustomer from './pages/medical/MedicalCustomer';
import DoctorDashboard from './pages/medical/DoctorDashboard';

import CustomerCommerce from './pages/commerce/CustomerCommerce';
import ShopDashboard from './pages/commerce/ShopDashboard';
import DeliveryDashboard from './pages/commerce/DeliveryDashboard';
import CommerceCart from './pages/commerce/CommerceCart';

import UserProfile from './pages/Profile/UserProfile';
import CustomerOrders from './pages/orders/CustomerOrders';
import LandingPage from './pages/LandingPage';
import AiAssistant from './pages/assistant/AiAssistant';

const RequireAuth = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return (
      <div>
        Access denied. This page is only for roles:{' '}
        {allowedRoles.join(', ')}.
      </div>
    );
  }

  return children;
};

const HomeRoute = () => {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LandingPage />;
};

const AppInner = () => {
  const { user, profile, logout } = useAuth();

  return (
    <div>
      <header style={{ padding: '8px', borderBottom: '1px solid #ccc' }}>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/">Home</Link>
          {!user && <Link to="/login">Login</Link>}
          {!user && <Link to="/register">Register</Link>}
          {user && (
            <>
              <Link to="/profile">My Profile</Link>
              <Link to="/commerce/cart">Cart</Link>
              <Link to="/orders">My Orders</Link>
              <Link to="/assistant">AI Assistant</Link>
              <span>
                {profile
                  ? `Logged in as: ${profile.name} (${profile.role})`
                  : 'Loading profile...'}
              </span>
              <button onClick={logout}>Logout</button>
            </>
          )}
        </nav>
      </header>

      <main style={{ padding: '16px' }}>
        <Routes>
          {/* Landing or dashboard depending on auth */}
          <Route path="/" element={<HomeRoute />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <UserProfile />
              </RequireAuth>
            }
          />

          {/* Orders overview for customer */}
          <Route
            path="/orders"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CustomerOrders />
              </RequireAuth>
            }
          />

          {/* AI Assistant */}
          <Route
            path="/assistant"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <AiAssistant />
              </RequireAuth>
            }
          />

          {/* Cab */}
          <Route
            path="/cab/customer"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CustomerCab />
              </RequireAuth>
            }
          />
          <Route
            path="/cab/driver"
            element={
              <RequireAuth allowedRoles={['DRIVER']}>
                <DriverCab />
              </RequireAuth>
            }
          />

          {/* Services on rent */}
          <Route
            path="/services/customer"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CustomerServiceRequest />
              </RequireAuth>
            }
          />
          <Route
            path="/services/worker"
            element={
              <RequireAuth allowedRoles={['WORKER']}>
                <WorkerDashboard />
              </RequireAuth>
            }
          />

          {/* Housing */}
          <Route
            path="/housing/host"
            element={
              <RequireAuth allowedRoles={['HOST']}>
                <HostProperties />
              </RequireAuth>
            }
          />
          <Route
            path="/housing/customer"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CustomerHousing />
              </RequireAuth>
            }
          />

          {/* Medical */}
          <Route
            path="/medical/customer"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <MedicalCustomer />
              </RequireAuth>
            }
          />
          <Route
            path="/medical/doctor"
            element={
              <RequireAuth allowedRoles={['DOCTOR']}>
                <DoctorDashboard />
              </RequireAuth>
            }
          />

          {/* Quick commerce */}
          <Route
            path="/commerce/customer"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CustomerCommerce />
              </RequireAuth>
            }
          />
          <Route
            path="/commerce/cart"
            element={
              <RequireAuth allowedRoles={['CUSTOMER']}>
                <CommerceCart />
              </RequireAuth>
            }
          />
          <Route
            path="/commerce/shop"
            element={
              <RequireAuth allowedRoles={['SHOP']}>
                <ShopDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/commerce/delivery"
            element={
              <RequireAuth allowedRoles={['DELIVERY']}>
                <DeliveryDashboard />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<div>Page not found.</div>} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </Router>
  );
};

export default App;
