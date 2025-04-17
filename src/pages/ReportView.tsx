import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as lucide from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ExportReport } from '../components/ExportReport';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  project_id: string;
  company_id: string;
  submitter_name: string;
  date: string;
  time: string;
  department: string;
  location: string;
  description: string;
  report_group: string;
  consequences: string;
  likelihood: string;
  status: string;
  supporting_image: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  projects: { name: string };
  companies: { name: string };
}

export function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<Partial<Report>>({});
  const [showExport, setShowExport] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('observation_details')
        .select(`
          *,
          projects(name),
          companies(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setReport(data);
      setEditedReport(data);
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedReport(report || {});
  };

  const handleSave = async () => {
    if (!report || !editedReport) return;

    try {
      setSaving(true);
      const { error: updateError } = await supabase
        .from('observation_details')
        .update({
          description: editedReport.description,
          location: editedReport.location,
          department: editedReport.department,
          consequences: editedReport.consequences,
          likelihood: editedReport.likelihood,
          status: editedReport.status,
        })
        .eq('id', report.id);

      if (updateError) throw updateError;

      await loadReport();
      setIsEditing(false);
      toast.success('Report updated successfully');
    } catch (err) {
      toast.error('Failed to update report');
      setError('Failed to update report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <lucide.Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <lucide.AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Report</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2 mx-auto"
            >
              <lucide.ArrowLeft className="h-5 w-5" />
              Back to Reports
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700"
              >
                <lucide.ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Safety Report Details</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowExport(true)}
                className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
              >
                <lucide.Download className="h-5 w-5" />
                Export
              </button>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700 flex items-center gap-2"
                  >
                    <lucide.X className="h-5 w-5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <lucide.Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <lucide.Save className="h-5 w-5" />
                    )}
                    Save Changes
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
                >
                  <lucide.Edit2 className="h-5 w-5" />
                  Edit Report
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Status Badge */}
            <div className="col-span-2">
              {isEditing ? (
                <select
                  value={editedReport.status}
                  onChange={(e) => setEditedReport({ ...editedReport, status: e.target.value })}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-white border focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  report.status === 'open'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {report.status === 'open' ? 'Open' : 'Closed'}
                </span>
              )}
            </div>

            {/* Project & Company */}
            <div>
              <label className="text-sm font-medium text-gray-500">Project</label>
              <p className="text-gray-900">{report.projects?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Company</label>
              <p className="text-gray-900">{report.companies?.name}</p>
            </div>

            {/* Submitter & Date */}
            <div>
              <label className="text-sm font-medium text-gray-500">Submitted By</label>
              <p className="text-gray-900">{report.submitter_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Date & Time</label>
              <p className="text-gray-900">
                {format(new Date(`${report.date} ${report.time}`), 'PPpp')}
              </p>
            </div>

            {/* Location & Department */}
            <div>
              <label className="text-sm font-medium text-gray-500">Location</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedReport.location}
                  onChange={(e) => setEditedReport({ ...editedReport, location: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              ) : (
                <p className="text-gray-900">{report.location}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedReport.department}
                  onChange={(e) => setEditedReport({ ...editedReport, department: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              ) : (
                <p className="text-gray-900">{report.department}</p>
              )}
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-500">Description</label>
              {isEditing ? (
                <textarea
                  value={editedReport.description}
                  onChange={(e) => setEditedReport({ ...editedReport, description: e.target.value })}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{report.description}</p>
              )}
            </div>

            {/* Risk Assessment */}
            <div>
              <label className="text-sm font-medium text-gray-500">Consequences</label>
              {isEditing ? (
                <select
                  value={editedReport.consequences}
                  onChange={(e) => setEditedReport({ ...editedReport, consequences: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="major">Major</option>
                  <option value="severe">Severe</option>
                </select>
              ) : (
                <p className="text-gray-900">{report.consequences}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Likelihood</label>
              {isEditing ? (
                <select
                  value={editedReport.likelihood}
                  onChange={(e) => setEditedReport({ ...editedReport, likelihood: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                >
                  <option value="unlikely">Unlikely</option>
                  <option value="possible">Possible</option>
                  <option value="likely">Likely</option>
                  <option value="very-likely">Very Likely</option>
                </select>
              ) : (
                <p className="text-gray-900">{report.likelihood}</p>
              )}
            </div>

            {/* Supporting Image */}
            {report.supporting_image && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Supporting Image</label>
                <div className="mt-2">
                  <img
                    src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${report.supporting_image}`}
                    alt="Supporting documentation"
                    className="max-w-lg rounded-lg border border-gray-200"
                  />
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="col-span-2 pt-6 border-t">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Created: {format(new Date(report.created_at), 'PPpp')}</span>
                {report.updated_at && report.updated_at !== report.created_at && (
                  <span>Last modified: {format(new Date(report.updated_at), 'PPpp')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportReport
          data={report}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}