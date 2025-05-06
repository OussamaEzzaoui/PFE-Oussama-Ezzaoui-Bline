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