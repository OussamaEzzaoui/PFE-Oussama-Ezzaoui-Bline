import React, { useState, useEffect } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import * as lucide from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { MonthlySummary as MonthlySummaryType } from '../lib/types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

interface FilterOptions {
  department?: string;
  category?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export function MonthlySummary() {
  const [summaryData, setSummaryData] = useState<MonthlySummaryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: subMonths(new Date(), 12),
      end: new Date(),
    },
  });
  const [customNote, setCustomNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<{ date: string; note: string }[]>([]);

  useEffect(() => {
    loadSummaryData();
  }, [filters]);

  const loadSummaryData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_observation_stats')
        .select('*')
        .gte('month', format(startOfMonth(filters.dateRange.start), 'yyyy-MM-dd'))
        .lte('month', format(endOfMonth(filters.dateRange.end), 'yyyy-MM-dd'))
        .order('month');

      if (error) throw error;

      // Apply additional filters
      let filteredData = data;
      if (filters.department) {
        filteredData = filteredData.filter(item => 
          item.observation_types[filters.department!] > 0
        );
      }
      if (filters.category) {
        filteredData = filteredData.filter(item => 
          item.trending_data.categories[filters.category!] > 0
        );
      }

      setSummaryData(filteredData);
    } catch (err) {
      setError('Failed to load summary data');
      console.error('Error loading summary data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateYearOverYearGrowth = () => {
    if (summaryData.length < 13) return null;

    const currentMonth = summaryData[summaryData.length - 1];
    const lastYear = summaryData[summaryData.length - 13];

    return {
      total: ((currentMonth.total_observations - lastYear.total_observations) / lastYear.total_observations) * 100,
      byType: Object.keys(currentMonth.observation_types).reduce((acc, type) => ({
        ...acc,
        [type]: ((currentMonth.observation_types[type] - (lastYear.observation_types[type] || 0)) / 
                (lastYear.observation_types[type] || 1)) * 100
      }), {}),
    };
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      switch (format) {
        case 'pdf': {
          const doc = new jsPDF();
          
          // Add title
          doc.setFontSize(20);
          doc.text('Monthly Safety Report Summary', 20, 20);
          
          // Add date range
          doc.setFontSize(12);
          doc.text(`Period: ${format(filters.dateRange.start, 'MMM yyyy')} - ${format(filters.dateRange.end, 'MMM yyyy')}`, 20, 30);
          
          // Add summary data
          let yPos = 50;
          summaryData.forEach((month) => {
            doc.text(`${format(parseISO(month.month), 'MMMM yyyy')}`, 20, yPos);
            doc.text(`Total Observations: ${month.total_observations}`, 30, yPos + 5);
            yPos += 15;
          });
          
          // Add notes
          if (savedNotes.length > 0) {
            yPos += 10;
            doc.text('Notes:', 20, yPos);
            savedNotes.forEach((note) => {
              yPos += 10;
              doc.text(`${note.date}: ${note.note}`, 30, yPos);
            });
          }
          
          doc.save(`safety-report-${format(new Date(), 'yyyy-MM')}.pdf`);
          break;
        }
        
        case 'excel':
        case 'csv': {
          const workbook = XLSX.utils.book_new();
          
          // Convert data to worksheet format
          const wsData = summaryData.map(month => ({
            Month: format(parseISO(month.month), 'MMMM yyyy'),
            'Total Observations': month.total_observations,
            ...month.observation_types,
          }));
          
          const worksheet = XLSX.utils.json_to_sheet(wsData);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Summary');
          
          // Add notes sheet if exists
          if (savedNotes.length > 0) {
            const notesWs = XLSX.utils.json_to_sheet(savedNotes);
            XLSX.utils.book_append_sheet(workbook, notesWs, 'Notes');
          }
          
          XLSX.writeFile(workbook, `safety-report-${format(new Date(), 'yyyy-MM')}.${format}`);
          break;
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export report');
    }
  };

  const saveNote = () => {
    if (!customNote.trim()) return;
    
    setSavedNotes([
      ...savedNotes,
      {
        date: format(new Date(), 'yyyy-MM-dd'),
        note: customNote.trim(),
      },
    ]);
    setCustomNote('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <lucide.Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
        <lucide.AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  const yearOverYearGrowth = calculateYearOverYearGrowth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Monthly Safety Report</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
          >
            <lucide.FileText className="h-5 w-5" />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
          >
            <lucide.Table className="h-5 w-5" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 text-green-600 hover:text-green-700 flex items-center gap-2"
          >
            <lucide.FileSpreadsheet className="h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <input
                type="date"
                value={format(filters.dateRange.start, 'yyyy-MM-dd')}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    start: new Date(e.target.value),
                  },
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
              <input
                type="date"
                value={format(filters.dateRange.end, 'yyyy-MM-dd')}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    end: new Date(e.target.value),
                  },
                })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({
                ...filters,
                department: e.target.value || undefined,
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Departments</option>
              <option value="operations">Operations</option>
              <option value="maintenance">Maintenance</option>
              <option value="safety">Safety</option>
              <option value="contractors">Contractors</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({
                ...filters,
                category: e.target.value || undefined,
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Categories</option>
              {summaryData[0]?.trending_data.categories && 
                Object.keys(summaryData[0].trending_data.categories).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))
              }
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <lucide.ClipboardList className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-medium text-gray-500">Total Observations</h4>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {summaryData.reduce((sum, month) => sum + month.total_observations, 0)}
          </p>
          {yearOverYearGrowth && (
            <p className={`mt-2 text-sm ${
              yearOverYearGrowth.total >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {yearOverYearGrowth.total >= 0 ? '↑' : '↓'} {Math.abs(yearOverYearGrowth.total).toFixed(1)}% vs last year
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <lucide.AlertTriangle className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-medium text-gray-500">High Risk Incidents</h4>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {summaryData.reduce((sum, month) => 
              sum + (month.risk_levels.severe || 0) + (month.risk_levels.major || 0), 0
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <lucide.CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-medium text-gray-500">Resolved Cases</h4>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {summaryData.reduce((sum, month) => 
              sum + (month.action_status.closed || 0), 0
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <lucide.Clock className="h-5 w-5 text-green-600" />
            <h4 className="text-sm font-medium text-gray-500">Average Response Time</h4>
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {Math.round(summaryData.reduce((sum, month) => 
              sum + (month.trending_data.avg_response_time || 0), 0
            ) / summaryData.length)} hrs
          </p>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Monthly Observations Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Observations Trend</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => format(parseISO(date as string), 'MMMM yyyy')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_observations" 
                  name="Total Observations"
                  stroke="#16a34a" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Observation Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Observation Types Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(date) => format(parseISO(date), 'MMM yyyy')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => format(parseISO(date as string), 'MMMM yyyy')}
                />
                <Legend />
                <Bar dataKey="observation_types.operations" name="Operations" fill="#16a34a" />
                <Bar dataKey="observation_types.maintenance" name="Maintenance" fill="#22c55e" />
                <Bar dataKey="observation_types.safety" name="Safety" fill="#4ade80" />
                <Bar dataKey="observation_types.contractors" name="Contractors" fill="#86efac" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Notes & Annotations</h4>
        
        {/* Add Note */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add a note about this report..."
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={saveNote}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <lucide.Plus className="h-5 w-5" />
            Add Note
          </button>
        </div>

        {/* Saved Notes */}
        {savedNotes.length > 0 && (
          <div className="space-y-4">
            {savedNotes.map((note, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{format(parseISO(note.date), 'PPP')}</p>
                  <p className="mt-1 text-gray-900">{note.note}</p>
                </div>
                <button
                  onClick={() => setSavedNotes(savedNotes.filter((_, i) => i !== index))}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <lucide.X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}