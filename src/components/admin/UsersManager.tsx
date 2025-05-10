import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type User = {
  user_id: string;
  username: string | null;
  role: string;
  created_at: string;
};

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, role, created_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (user: User) => {
    try {
      const newRole = user.role === 'admin' ? 'normal' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', user.user_id);
      if (error) throw error;
      loadUsers();
    } catch (err) {
      setError('Failed to update user role');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      // TODO: Replace this with a secure API call or Edge Function
      // This is a placeholder for demonstration only
      const response = await fetch('/api/admin-create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (!response.ok) throw new Error('Failed to create user');
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', username: '' });
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Create New User
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              {createError && <div className="text-red-600 text-sm">{createError}</div>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <lucide.AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <ul className="divide-y divide-gray-200">
          {users.map((userItem) => (
            <li key={userItem.user_id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-900">{userItem.username || userItem.user_id}</p>
                <p className="text-sm text-gray-500">
                  {userItem.role === 'admin' ? 'Admin' : 'User'}
                </p>
                <p className="text-xs text-gray-400">Created: {userItem.created_at ? new Date(userItem.created_at).toLocaleString() : ''}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleAdmin(userItem)}
                  disabled={userItem.user_id === user.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    userItem.role === 'admin'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } ${userItem.user_id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {userItem.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}