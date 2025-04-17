import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function CompaniesManager() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCompany, setNewCompany] = useState({ name: '' });
  const [editingCompany, setEditingCompany] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data);
    } catch (err) {
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({ name: newCompany.name })
          .eq('id', editingCompany.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([newCompany]);

        if (error) throw error;
      }

      setNewCompany({ name: '' });
      setEditingCompany(null);
      loadCompanies();
    } catch (err) {
      setError('Failed to save company');
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadCompanies();
    } catch (err) {
      setError('Failed to delete company');
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
        <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <lucide.AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <input
              type="text"
              value={newCompany.name}
              onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
              placeholder="Enter company name"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <lucide.Plus className="h-5 w-5" />
              {editingCompany ? 'Update Company' : 'Add Company'}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-gray-200">
          {companies.map((company) => (
            <li key={company.id} className="p-4 flex items-center justify-between">
              <span className="text-gray-900">{company.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingCompany(company);
                    setNewCompany({ name: company.name });
                  }}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <lucide.Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(company.id)}
                  className="p-2 text-red-400 hover:text-red-500"
                >
                  <lucide.Trash2 className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}