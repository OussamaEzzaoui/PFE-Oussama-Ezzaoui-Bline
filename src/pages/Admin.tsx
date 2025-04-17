import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import * as lucide from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ProjectsManager } from '../components/admin/ProjectsManager';
import { CompaniesManager } from '../components/admin/CompaniesManager';
import { UsersManager } from '../components/admin/UsersManager';

export function Admin() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [error, setError] = useState('');

  const navItems = [
    { path: '/admin/projects', label: 'Projects', icon: lucide.Briefcase },
    { path: '/admin/companies', label: 'Companies', icon: lucide.Building2 },
    { path: '/admin/users', label: 'Users', icon: lucide.Users }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <lucide.Shield className="h-8 w-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                to="/"
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <lucide.ArrowLeft className="h-5 w-5" />
                Back to Reports
              </Link>
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-2"
              >
                <lucide.LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex space-x-4 py-4">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                  location.pathname === path
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <lucide.AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <Routes>
          <Route path="projects" element={<ProjectsManager />} />
          <Route path="companies" element={<CompaniesManager />} />
          <Route path="users" element={<UsersManager />} />
        </Routes>
      </main>
    </div>
  );
}