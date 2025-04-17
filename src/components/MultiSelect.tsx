import React, { useEffect, useState } from 'react';
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react';
import { supabase, isAdmin } from '../lib/supabase';

interface Option {
  id: string;
  value: string;
}

interface MultiSelectProps {
  listId: string;
  label: string;
}

export function MultiSelect({ listId, label }: MultiSelectProps) {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newOption, setNewOption] = useState('');
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdminStatus();
    loadOptions();
    loadUserSelections();
  }, [listId]);

  const checkAdminStatus = async () => {
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);
  };

  const loadOptions = async () => {
    const { data, error } = await supabase
      .from('list_options')
      .select('*')
      .eq('list_id', listId);

    if (error) {
      setError('Failed to load options');
      return;
    }

    setOptions(data);
  };

  const loadUserSelections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_selections')
      .select('option_id')
      .eq('list_id', listId)
      .eq('user_id', user.id);

    if (error) {
      setError('Failed to load selections');
      return;
    }

    setSelectedOptions(data.map(selection => selection.option_id));
  };

  const toggleOption = async (optionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in to make selections');
      return;
    }

    const isSelected = selectedOptions.includes(optionId);
    
    if (isSelected) {
      const { error } = await supabase
        .from('user_selections')
        .delete()
        .eq('user_id', user.id)
        .eq('list_id', listId)
        .eq('option_id', optionId);

      if (error) {
        setError('Failed to remove selection');
        return;
      }

      setSelectedOptions(selectedOptions.filter(id => id !== optionId));
    } else {
      const { error } = await supabase
        .from('user_selections')
        .insert({
          user_id: user.id,
          list_id: listId,
          option_id: optionId
        });

      if (error) {
        setError('Failed to add selection');
        return;
      }

      setSelectedOptions([...selectedOptions, optionId]);
    }
  };

  const addOption = async () => {
    if (!newOption.trim()) return;

    const { data, error } = await supabase
      .from('list_options')
      .insert({
        list_id: listId,
        value: newOption.trim()
      })
      .select()
      .single();

    if (error) {
      setError('Failed to add option');
      return;
    }

    setOptions([...options, data]);
    setNewOption('');
  };

  const updateOption = async (option: Option) => {
    const { error } = await supabase
      .from('list_options')
      .update({ value: editingOption?.value })
      .eq('id', option.id);

    if (error) {
      setError('Failed to update option');
      return;
    }

    setOptions(options.map(o => o.id === option.id ? { ...o, value: editingOption?.value || '' } : o));
    setEditingOption(null);
  };

  const deleteOption = async (optionId: string) => {
    const { error } = await supabase
      .from('list_options')
      .delete()
      .eq('id', optionId);

    if (error) {
      setError('Failed to delete option');
      return;
    }

    setOptions(options.filter(o => o.id !== optionId));
    setSelectedOptions(selectedOptions.filter(id => id !== optionId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{label}</h3>
        {isAdminUser && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-sm text-green-600 hover:text-green-700"
          >
            {isEditing ? 'Done' : 'Edit Options'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-md text-sm">
          {error}
          <button onClick={() => setError('')} className="float-right">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-2">
        {options.map(option => (
          <div
            key={option.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              selectedOptions.includes(option.id)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {editingOption?.id === option.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editingOption.value}
                  onChange={e => setEditingOption({ ...editingOption, value: e.target.value })}
                  className="flex-1 px-2 py-1 border rounded"
                />
                <button
                  onClick={() => updateOption(option)}
                  className="text-green-600 hover:text-green-700"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setEditingOption(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <>
                <div
                  onClick={() => !isEditing && toggleOption(option.id)}
                  className={`flex-1 ${!isEditing ? 'cursor-pointer' : ''}`}
                >
                  {option.value}
                </div>
                {isEditing && isAdminUser && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingOption(option)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteOption(option.id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {isEditing && isAdminUser && (
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              placeholder="Add new option"
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              onClick={addOption}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}