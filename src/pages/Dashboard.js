import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return (
      <div>
        No profile found. Try logging out and logging in again, or registering
        a new user.
      </div>
    );
  }

  const { name, role } = profile;

  return (
    <div>
      <h1>SecondSons Dashboard</h1>
      <p>
        Welcome, <strong>{name}</strong> ({role})
      </p>

      {role === 'CUSTOMER' && (
        <>
          <h2>Customer actions</h2>
          <ul>
            <li>
              <Link to="/cab/customer">Book a cab</Link>
            </li>
            <li>
              <Link to="/services/customer">Request a service on rent</Link>
            </li>
            <li>
              <Link to="/housing/customer">Book / rent a house</Link>
            </li>
            <li>
              <Link to="/medical/customer">Consult a doctor</Link>
            </li>
            <li>
              <Link to="/commerce/customer">Order from quick commerce</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'DRIVER' && (
        <>
          <h2>Driver actions</h2>
          <ul>
            <li>
              <Link to="/cab/driver">Cab requests</Link>
            </li>
            <li>
              <Link to="/commerce/delivery">Delivery jobs</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'HOST' && (
        <>
          <h2>Host actions</h2>
          <ul>
            <li>
              <Link to="/housing/host">Manage properties</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'DOCTOR' && (
        <>
          <h2>Doctor actions</h2>
          <ul>
            <li>
              <Link to="/medical/doctor">Consultation dashboard</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'SHOP' && (
        <>
          <h2>Shop actions</h2>
          <ul>
            <li>
              <Link to="/commerce/shop">Manage products & orders</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'DELIVERY' && (
        <>
          <h2>Delivery partner actions</h2>
          <ul>
            <li>
              <Link to="/commerce/delivery">Delivery jobs</Link>
            </li>
          </ul>
        </>
      )}

      {role === 'WORKER' && (
        <>
          <h2>Worker actions</h2>
          <ul>
            <li>
              <Link to="/services/worker">Service jobs</Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
};

export default Dashboard;
