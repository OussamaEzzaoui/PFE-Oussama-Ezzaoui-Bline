import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { SafetyReport } from '../lib/types';

export function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('observation_details')
        .select(`
          id,
          subject,
          submitter_name,
          date,
          description,
          consequences,
          status,
          created_at,
          created_by,
          projects(id, name),
          companies(id, name),
          action_plans(
            id,
            action,
            due_date,
            responsible_person,
            follow_up_contact,
            status
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      const reports = (data || []).map((report: any) => ({
        ...report,
        projects: Array.isArray(report.projects) ? report.projects[0] || { id: '', name: '' } : report.projects,
        companies: Array.isArray(report.companies) ? report.companies[0] || { id: '', name: '' } : report.companies,
      }));
      setReports(reports);
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">My Reports</h1>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap">{format(parseISO(report.date), 'PPP')}</td>
                <td className="px-6 py-4 whitespace-nowrap">{report.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">{report.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => navigate(`/reports/${report.id}`)}
                    className="text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    <span>Edit</span>
                  </button>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  You haven't created any reports yet. Click 'New Report' to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 