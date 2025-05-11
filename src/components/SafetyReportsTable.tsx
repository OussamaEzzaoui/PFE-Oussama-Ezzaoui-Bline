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

function getPublicUrl(path: string, bucket: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function downloadImage(path: string, bucket: string): Promise<Blob | null> {
  try {
    // Remove any leading slashes and ensure proper path format
    const cleanPath = path.replace(/^\/+/, '');
    
    console.log(`Downloading image from bucket: ${bucket}, path: ${cleanPath}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(cleanPath);
    
    if (error) {
      console.error('Error downloading image:', error, {
        bucket,
        path: cleanPath,
        errorMessage: error.message
      });
      return null;
    }
    
    if (!data) {
      console.error('No data received from storage');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error downloading image:', error, {
      bucket,
      path,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('Error converting blob to base64:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

async function getImageAsBase64(path: string, bucket: string): Promise<string> {
  if (!path) {
    console.warn('Empty path provided for image download');
    return '';
  }

  const blob = await downloadImage(path, bucket);
  if (!blob) {
    console.warn(`Failed to download image: ${path} from bucket: ${bucket}`);
    return '';
  }

  try {
    return await blobToBase64(blob);
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
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
  const [reportImages, setReportImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);

  const reportsPerPage = 10;

  useEffect(() => {
    loadReports();
  }, [currentPage, filters, sortConfig]);

  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const images: Record<string, string> = {};
      
      try {
        for (const report of reports) {
          if (report.supporting_image) {
            console.log('Loading supporting image:', report.supporting_image);
            const base64Image = await getImageAsBase64(report.supporting_image, 'safety-images');
            if (base64Image) {
              images[report.supporting_image] = base64Image;
            }
          }
          
          for (const plan of report.action_plans || []) {
            if (plan.supporting_image) {
              console.log('Loading action plan image:', plan.supporting_image);
              const base64Image = await getImageAsBase64(plan.supporting_image, 'action-plan-images');
              if (base64Image) {
                images[plan.supporting_image] = base64Image;
              }
            }
          }
        }
        
        console.log('Successfully loaded images:', Object.keys(images).length);
        setReportImages(images);
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        setLoadingImages(false);
      }
    };

    if (reports.length > 0) {
      loadImages();
    }
  }, [reports]);

  // Debug logging for PDF image sources
  useEffect(() => {
    if (reports.length > 0) {
      reports.forEach(report => {
        console.log('PDF report.supporting_image:', report.supporting_image,
          report.supporting_image
            ? (
                reportImages[report.supporting_image] && typeof reportImages[report.supporting_image] === 'string' && reportImages[report.supporting_image].startsWith('data:image/')
                  ? reportImages[report.supporting_image]
                  : (report.supporting_image.trim() !== ''
                      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${report.supporting_image.replace(/^\/+/, '')}`
                      : undefined)
              )
            : undefined
        );
        (report.action_plans || []).forEach(plan => {
          console.log('PDF actionPlan.supporting_image:', plan.supporting_image,
            plan.supporting_image
              ? (
                  reportImages[plan.supporting_image] && typeof reportImages[plan.supporting_image] === 'string' && reportImages[plan.supporting_image].startsWith('data:image/')
                    ? reportImages[plan.supporting_image]
                    : (plan.supporting_image.trim() !== ''
                        ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/action-plan-images/${plan.supporting_image.replace(/^\/+/, '')}`
                        : undefined)
                )
              : undefined
          );
        });
      });
    }
  }, [reports, reportImages]);

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
          department,
          location,
          report_group,
          likelihood,
          supporting_image,
          projects(id, name),
          companies(id, name),
          safety_categories(id, name, icon),
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
        projects: Array.isArray(report.projects) ? report.projects[0] || { id: '', name: '' } : report.projects || { id: '', name: '' },
        companies: Array.isArray(report.companies) ? report.companies[0] || { id: '', name: '' } : report.companies || { id: '', name: '' },
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
          <h1 className="text-2xl font-bold text-gray-900">Safety Reports</h1>
        </div>
        <div className="flex items-center gap-4">
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
      <div className="bg-white shadow-sm rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Report ID
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Report Details
              </th>
              <th
                scope="col"
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
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
                className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]"
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
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900">
                  {format(parseISO(report.date), 'PPP')}
                </td>
                <td className="px-2 py-3">
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
                <td className="px-2 py-3 whitespace-nowrap">
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
                <td className="px-2 py-3 whitespace-nowrap">
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
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 min-w-[90px]">
                  <div className="flex items-center gap-2 flex-nowrap">
                    {((isAdmin || report.created_by === user.id) && (isAdmin || report.status !== 'closed')) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/reports/${report.id}`);
                        }}
                        className="text-green-600 hover:text-green-700 flex items-center gap-1 px-1 py-0.5 rounded"
                      >
                        <lucide.Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${report.id}?mode=view`);
                      }}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1 px-1 py-0.5 rounded"
                    >
                      <lucide.Eye className="h-4 w-4" />
                      View
                    </button>
                    <PDFDownloadLink
                      document={
                        <SafetyReportPDF
                          report={{
                            project: { id: report.projects.id, name: report.projects.name },
                            company: { id: report.companies.id, name: report.companies.name },
                            submitterName: report.submitter_name,
                            date: report.date,
                            time: format(parseISO(report.created_at), 'HH:mm'),
                            department: report.department || 'General',
                            location: report.location || 'On-site',
                            description: report.description,
                            reportGroup: report.report_group || 'Safety',
                            consequences: report.consequences,
                            likelihood: report.likelihood || 'N/A',
                            status: report.status,
                            subject: report.subject,
                            categories: report.safety_categories || [],
                            actionPlans: (report.action_plans || []).map(plan => {
                              let imgSrc: string | undefined = undefined;
                              if (plan.supporting_image) {
                                if (
                                  reportImages[plan.supporting_image] &&
                                  typeof reportImages[plan.supporting_image] === 'string' &&
                                  reportImages[plan.supporting_image].startsWith('data:image/')
                                ) {
                                  imgSrc = reportImages[plan.supporting_image];
                                } else if (plan.supporting_image.trim() !== '') {
                                  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/action-plan-images/${plan.supporting_image.replace(/^\/+/,'')}`;
                                  imgSrc = url.trim() !== '' ? url : undefined;
                                }
                              }
                              return {
                                ...plan,
                                status: plan.status.toLowerCase() as 'open' | 'closed',
                                supporting_image: typeof imgSrc === 'string' && imgSrc.trim() !== '' ? imgSrc : undefined
                              };
                            }),
                            supportingImage: (() => {
                              let imgSrc: string | undefined = undefined;
                              if (report.supporting_image) {
                                if (
                                  reportImages[report.supporting_image] &&
                                  typeof reportImages[report.supporting_image] === 'string' &&
                                  reportImages[report.supporting_image].startsWith('data:image/')
                                ) {
                                  imgSrc = reportImages[report.supporting_image];
                                } else if (report.supporting_image.trim() !== '') {
                                  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/safety-images/${report.supporting_image.replace(/^\/+/,'')}`;
                                  imgSrc = url.trim() !== '' ? url : undefined;
                                }
                              }
                              return typeof imgSrc === 'string' && imgSrc.trim() !== '' ? imgSrc : undefined;
                            })()
                          }}
                        />
                      }
                      fileName={`safety-report-${report.id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1 px-1 py-0.5 rounded"
                    >
                      {({ blob, url, loading, error }) =>
                        loading || loadingImages ? (
                          <span className="flex items-center gap-1">
                            <lucide.Loader2 className="h-4 w-4 animate-spin" />
                            Loading PDF...
                          </span>
                        ) : error ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <lucide.AlertTriangle className="h-4 w-4" />
                            Error
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <lucide.FileDown className="h-4 w-4" />
                            Download PDF
                          </span>
                        )
                      }
                    </PDFDownloadLink>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report);
                        }}
                        className="text-red-600 hover:text-red-700 flex items-center gap-1 px-1 py-0.5 rounded"
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