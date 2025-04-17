import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      setUsers(data.users);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (user) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(
        user.id,
        { user_metadata: { is_admin: !user.user_metadata?.is_admin } }
      );

      if (error) throw error;
      loadUsers();
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <lucide.Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <lucide.AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-500">
                  {user.user_metadata?.is_admin ? 'Admin' : 'User'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleAdmin(user)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    user.user_metadata?.is_admin
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {user.user_metadata?.is_admin ? 'Remove Admin' : 'Make Admin'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}