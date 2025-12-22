import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QuotesList from './pages/QuotesList';
import QuoteBuilder from './pages/QuoteBuilder';
import ClientsList from './pages/ClientsList';
import ClientForm from './pages/ClientForm';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import UsersList from './pages/UsersList';
import UserForm from './pages/UserForm';
import TermsManagement from './pages/TermsManagement';
import Settings from './pages/Settings';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quotes" element={<QuotesList />} />
            <Route path="/quotes/new" element={<QuoteBuilder />} />
            <Route path="/quotes/:id" element={<QuoteBuilder />} />
            <Route path="/clients" element={<ClientsList />} />
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id" element={<ClientForm />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:id" element={<ProductForm />} />
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/new" element={<UserForm />} />
            <Route path="/users/:id" element={<UserForm />} />
            <Route path="/terms" element={<TermsManagement />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
