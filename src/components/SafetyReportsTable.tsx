import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import * as lucide from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SafetyReportPDF } from './SafetyReportPDF';
import type { SafetyReport } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  status: string;
  severity: string;
}

interface DeleteModalProps {
  report: SafetyReport;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ report, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <lucide.AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Delete Safety Report</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this safety report? This action cannot be undone.
        </p>

        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 mb-6">
          <p><strong>Report ID:</strong> {report.id}</p>
          <p><strong>Subject:</strong> {report.subject}</p>
          <p><strong>Date:</strong> {format(parseISO(report.date), 'PPP')}</p>
          <p><strong>Submitter:</strong> {report.submitter_name}</p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <lucide.Trash2 className="h-5 w-5" />
            Delete Report
          </button>
        </div>
      </div>
    </div>
  );
}

export function SafetyReportsTable() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reportToDelete, setReportToDelete] = useState<SafetyReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: '',
      end: '',
    },
    status: '',
    severity: '',
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SafetyReport;
    direction: 'asc' | 'desc';
  }>({
    key: 'created_at',
    direction: 'desc',
  });

  const reportsPerPage = 10;

  useEffect(() => {
    loadReports();
  }, [currentPage, filters, sortConfig]);

  const loadReports = async () => {
    try {
      setLoading(true);
      let query = supabase
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
        .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
        .range((currentPage - 1) * reportsPerPage, currentPage * reportsPerPage - 1);

      // Apply filters
      if (filters.dateRange.start) {
        query = query.gte('date', filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.lte('date', filters.dateRange.end);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('consequences', filters.severity);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform the data to include action plans
      const transformedData = (data || []).map(report => ({
        ...report,
        projects: report.projects[0] || { name: '' },
        companies: report.companies[0] || { name: '' },
        action_plans: (report.action_plans || []).map(plan => ({
          ...plan,
          status: plan.status.toLowerCase() as 'open' | 'closed'
        }))
      }));

      setReports(transformedData);
      setTotalPages(Math.ceil((count || 0) / reportsPerPage));
    } catch (err) {
      setError('Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof SafetyReport) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const handleDelete = async (report: SafetyReport) => {
    setReportToDelete(report);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      // First delete all action plans associated with the report
      const { error: actionPlansError } = await supabase
        .from('action_plans')
        .delete()
        .eq('observation_id', reportToDelete.id);

      if (actionPlansError) throw actionPlansError;

      // Then delete the report itself
      const { error: deleteError } = await supabase
        .from('observation_details')
        .delete()
        .eq('id', reportToDelete.id);

      if (deleteError) throw deleteError;

      toast.success('Report deleted successfully');
      setReportToDelete(null);
      loadReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    }
  };

  const exportToCSV = () => {
    const exportData = reports.map(report => ({
      'Report ID': report.id,
      'Subject': report.subject,
      'Submitter': report.submitter_name,
      'Date': format(parseISO(report.date), 'PPP'),
      'Project': report.projects.name,
      'Company': report.companies.name,
      'Description': report.description,
      'Severity': report.consequences,
      'Status': report.status,
      'Created At': format(parseISO(report.created_at), 'PPP'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Safety Reports');
    XLSX.writeFile(workbook, `safety-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handleRowClick = (report: SafetyReport) => {
    setSelectedReport(report);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <lucide.Shield className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Safety Reports</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <lucide.FileSpreadsheet className="h-5 w-5" />
            Export CSV
          </button>
          <button
            onClick={() => navigate('/reports/new')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <lucide.Plus className="h-5 w-5" />
            New Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateRange: { ...filters.dateRange, start: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) =>
              setFilters({
                ...filters,
                dateRange: { ...filters.dateRange, end: e.target.value },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity
          </label>
          <select
            value={filters.severity}
            onChange={(e) =>
              setFilters({ ...filters, severity: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">All</option>
            <option value="minor">Minor</option>
            <option value="moderate">Moderate</option>
            <option value="major">Major</option>
            <option value="severe">Severe</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Report ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortConfig.key === 'date' && (
                    sortConfig.direction === 'asc' ? 
                    <lucide.ChevronUp className="h-4 w-4" /> : 
                    <lucide.ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Report Details
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('consequences')}
              >
                <div className="flex items-center gap-1">
                  Severity
                  {sortConfig.key === 'consequences' && (
                    sortConfig.direction === 'asc' ? 
                    <lucide.ChevronUp className="h-4 w-4" /> : 
                    <lucide.ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortConfig.key === 'status' && (
                    sortConfig.direction === 'asc' ? 
                    <lucide.ChevronUp className="h-4 w-4" /> : 
                    <lucide.ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report, index) => (
              <tr
                key={report.id}
                onClick={() => handleRowClick(report)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedReport?.id === report.id ? 'bg-green-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(parseISO(report.date), 'PPP')}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 font-medium">
                    {report.subject}
                  </div>
                  <div className="text-sm text-gray-500">
                    {report.description.length > 50
                      ? `${report.description.substring(0, 50)}...`
                      : report.description}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Submitted by: {report.submitter_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.consequences === 'severe'
                        ? 'bg-red-100 text-red-800'
                        : report.consequences === 'major'
                        ? 'bg-orange-100 text-orange-800'
                        : report.consequences === 'moderate'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {report.consequences}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'open'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    {report.created_by === user.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${report.id}`);
                        }}
                        className="text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <lucide.Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    <PDFDownloadLink
                      document={<SafetyReportPDF report={{
                        project: { id: report.projects.id, name: report.projects.name },
                        company: { id: report.companies.id, name: report.companies.name },
                        submitterName: report.submitter_name,
                        date: report.date,
                        time: format(parseISO(report.created_at), 'HH:mm'),
                        department: 'General',
                        location: 'On-site',
                        description: report.description,
                        reportGroup: 'Safety',
                        consequences: report.consequences,
                        likelihood: 'N/A',
                        status: report.status,
                        subject: report.subject,
                        categories: [],
                        actionPlans: (report.action_plans || []).map(plan => ({
                          ...plan,
                          status: plan.status.toLowerCase() as 'open' | 'closed'
                        }))
                      }} />}
                      fileName={`safety-report-${report.id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {({ blob, url, loading, error }) => {
                        if (error) {
                          console.error('PDF generation error:', error);
                          return (
                            <div className="text-red-600 flex items-center gap-1">
                              <lucide.AlertTriangle className="h-4 w-4" />
                              Error
                            </div>
                          );
                        }
                        return (
                          <>
                            <lucide.FileText className="h-4 w-4" />
                            {loading ? 'Loading...' : 'PDF'}
                          </>
                        );
                      }}
                    </PDFDownloadLink>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report);
                        }}
                        className="text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <lucide.Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(currentPage - 1) * reportsPerPage + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * reportsPerPage, reports.length)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{reports.length}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <lucide.ChevronLeft className="h-5 w-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-green-50 border-green-500 text-green-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <lucide.ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <DeleteModal
          report={reportToDelete}
          onConfirm={confirmDelete}
          onCancel={() => setReportToDelete(null)}
        />
      )}
    </div>
  );
}