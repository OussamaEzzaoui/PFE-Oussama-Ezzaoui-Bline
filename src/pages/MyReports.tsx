import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { SafetyReport } from '../lib/types';
import * as lucide from 'lucide-react';

interface ReportDetailsModalProps {
  report: SafetyReport;
  onClose: () => void;
}

function ReportDetailsModal({ report, onClose }: ReportDetailsModalProps) {
  console.log('Report supporting_image:', report.supporting_image);
  if (report.action_plans) {
    report.action_plans.forEach((plan, idx) => {
      console.log(`Action plan ${idx} supporting_image:`, plan.supporting_image);
    });
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Report Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <lucide.X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Subject</h3>
              <p className="mt-1 text-gray-900">{report.subject}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date</h3>
              <p className="mt-1 text-gray-900">{format(parseISO(report.date), 'PPP')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {report.status}
                </span>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Severity</h3>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.consequences === 'severe'
                    ? 'bg-red-100 text-red-800'
                    : report.consequences === 'major'
                    ? 'bg-orange-100 text-orange-800'
                    : report.consequences === 'moderate'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {report.consequences}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{report.description}</p>
            {report.supporting_image ? (
              <img
                src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${report.supporting_image.replace(/^\/+/, '')}`}
                alt="Supporting image"
                className="max-w-xs rounded-lg border border-gray-200 mt-4"
              />
            ) : (
              <img
                src="/placeholder-image.png" // Make sure this file exists in your public folder
                alt="No image"
                className="max-w-xs rounded-lg border border-gray-200 mt-4 opacity-50"
              />
            )}
          </div>

          {report.safety_categories && report.safety_categories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Safety Categories</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {report.safety_categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.action_plans && report.action_plans.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Action Plans</h3>
              <div className="space-y-3">
                {report.action_plans.map((plan, index) => (
                  <div key={plan.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{plan.action}</p>
                        <p className="text-sm text-gray-500">Due: {format(parseISO(plan.due_date), 'PPP')}</p>
                        <p className="text-sm text-gray-500">Responsible: {plan.responsible_person}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (report.status === 'closed' ? 'bg-gray-100 text-gray-800' : (plan.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'))
                      }`}>
                        {report.status === 'closed' ? 'closed' : plan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);
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
          supporting_image,
          projects(id, name),
          companies(id, name),
          action_plans(
            id,
            action,
            due_date,
            responsible_person,
            follow_up_contact,
            status,
            supporting_image
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // Fetch safety categories for all reports
      let safetyCategoriesMap: Record<string, any[]> = {};
      if (data && data.length > 0) {
        const reportIds: string[] = data.map((r: any) => r.id);
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('observation_categories')
          .select('observation_id, category_id, safety_categories(id, name, icon)')
          .in('observation_id', reportIds);
        if (!categoriesError && categoriesData) {
          categoriesData.forEach(row => {
            if (!safetyCategoriesMap[row.observation_id]) safetyCategoriesMap[row.observation_id] = [];
            if (row.safety_categories) safetyCategoriesMap[row.observation_id].push(row.safety_categories);
          });
        }
      }

      const reports = (data || []).map((report: any) => ({
        ...report,
        projects: Array.isArray(report.projects) ? report.projects[0] || { id: '', name: '' } : report.projects,
        companies: Array.isArray(report.companies) ? report.companies[0] || { id: '', name: '' } : report.companies,
        safety_categories: safetyCategoriesMap[report.id] || [],
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
              <tr 
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-6 py-4 whitespace-nowrap">{format(parseISO(report.date), 'PPP')}</td>
                <td className="px-6 py-4 whitespace-nowrap">{report.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {report.status === 'closed' ? (
                    <span className="text-gray-400 flex items-center gap-1">
                      <span>Closed</span>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${report.id}`);
                      }}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <span>Edit</span>
                    </button>
                  )}
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

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
} 