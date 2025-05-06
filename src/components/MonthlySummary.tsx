import React, { useState, useEffect, useRef } from 'react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { MonthlySummary as MonthlySummaryType, SafetyCategory } from '../lib/types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Download, Filter, Calendar } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Bar as ChartJSBar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartJSTitle,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartJSTitle,
  ChartJSTooltip,
  ChartJSLegend
);

interface FilterOptions {
  department?: string;
  category?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface MonthlySummary {
  month: string;
  total_observations: number;
  observation_types: Record<string, number>;
  report_status: Record<string, number>;
  risk_levels: Record<string, number>;
  trending_data: {
    categories: Record<string, number>;
  };
  created_at?: string;
  updated_at?: string;
}

export function MonthlySummary() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [safetyCategories, setSafetyCategories] = useState<SafetyCategory[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: subMonths(new Date(), 12),
      end: new Date(),
    },
  });
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<any[]>([]);
  const [monthlyCategoryLabels, setMonthlyCategoryLabels] = useState<string[]>([]);
  const [monthlyCategorySeverityMap, setMonthlyCategorySeverityMap] = useState<Record<string, Record<string, number>>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const pieChartRef = useRef<HTMLDivElement>(null);
  const actionStatusChartRef = useRef<HTMLDivElement>(null);
  const riskLevelsChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSafetyCategories();
    loadAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadSummary(selectedMonth);
      fetchMonthlyCategoryData(selectedMonth);
    }
  }, [selectedMonth]);

  const loadSafetyCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('safety_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setSafetyCategories(data);
    } catch (err) {
      console.error('Error loading safety categories:', err);
      setError('Failed to load safety categories');
    }
  };

  const loadAvailableMonths = async () => {
    const { data, error } = await supabase
      .from('monthly_observation_stats')
      .select('month')
      .order('month', { ascending: false });
    if (!error && data) {
      const months = data.map((row: any) => row.month);
      setAvailableMonths(months);
      if (months.length > 0) setSelectedMonth(months[0]);
    }
  };

  const loadSummary = async (month: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_observation_stats')
        .select('*')
        .eq('month', month)
        .single();
      if (error) throw error;
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (!summary) return;

    try {
      if (exportFormat === 'pdf') {
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yOffset = 20;

        // Add title
        pdf.setFontSize(20);
        const title = 'Monthly Safety Report Summary';
        const titleWidth = pdf.getStringUnitWidth(title) * pdf.getFontSize() / pdf.internal.scaleFactor;
        pdf.text(title, (pageWidth - titleWidth) / 2, yOffset);
        yOffset += 20;

        const captureChart = async (ref: React.RefObject<HTMLDivElement>) => {
          if (!ref.current) return null;
          
          // Force a specific size during capture
          const originalStyle = ref.current.style.cssText;
          ref.current.style.width = '800px';
          ref.current.style.height = '600px';
          
          const canvas = await html2canvas(ref.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true,
            foreignObjectRendering: true
          });
          
          // Restore original style
          ref.current.style.cssText = originalStyle;
          return canvas.toDataURL('image/png', 1.0);
        };

        // Calculate image dimensions
        const chartWidth = 120;
        const chartHeight = 90;
        const spacing = 10;

        // Capture and add charts in a grid layout
        const [pieImg, actionImg, riskImg] = await Promise.all([
          captureChart(pieChartRef),
          captureChart(actionStatusChartRef),
          captureChart(riskLevelsChartRef)
        ]);

        if (pieImg) {
          pdf.addImage(pieImg, 'PNG', spacing, yOffset, chartWidth, chartHeight);
        }
        
        if (actionImg) {
          pdf.addImage(actionImg, 'PNG', chartWidth + spacing * 2, yOffset, chartWidth, chartHeight);
        }

        yOffset += chartHeight + spacing;

        if (riskImg) {
          pdf.addImage(riskImg, 'PNG', spacing, yOffset, chartWidth, chartHeight);
        }

        // Add summary statistics
        pdf.setFontSize(12);
        const statsX = chartWidth + spacing * 2;
        pdf.text([
          `Total Observations: ${summary.total_observations}`,
          `Month: ${format(parseISO(summary.month), 'MMMM yyyy')}`
        ], statsX, yOffset + spacing, { lineHeightFactor: 1.5 });

        pdf.save(`monthly_summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else {
        // For CSV export
        let data: any[] = [];
        
        // Add observation types
        Object.entries(summary.observation_types).forEach(([type, count]) => {
          data.push({
            category: 'Observation Type',
            name: type,
            count: count
          });
        });

        // Add report status
        Object.entries(summary.report_status).forEach(([status, count]) => {
          data.push({
            category: 'Report Status',
            name: status,
            count: count
          });
        });

        // Add risk levels
        Object.entries(summary.risk_levels).forEach(([level, count]) => {
          data.push({
            category: 'Risk Level',
            name: level,
            count: count
          });
        });

        const csv = data.map(row => 
          `${row.category},${row.name},${row.count}`
        ).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monthly_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export summary');
    }
  };

  const fetchMonthlyCategoryData = async (month: string) => {
    if (!month) return;
    const monthStart = startOfMonth(new Date(month));
    const monthEnd = endOfMonth(new Date(month));

    // Get all categories
    const { data: allCategories } = await supabase
      .from('safety_categories')
      .select('id, name');
    const categoryMap = new Map(allCategories?.map(cat => [cat.id, cat.name]) || []);
    const allCategoryLabels = Array.from(categoryMap.values());

    // Fetch all observations for the month with their categories and severity
    const { data: categoryData } = await supabase
      .from('observation_details')
      .select(`
        id,
        consequences,
        created_at,
        observation_categories (
          category_id,
          safety_categories (
            id,
            name
          )
        )
      `)
      .gte('created_at', format(monthStart, 'yyyy-MM-dd'))
      .lte('created_at', format(monthEnd, 'yyyy-MM-dd'));

    // Aggregate counts
    const categorySeverityMap: Record<string, Record<string, number>> = {};
    allCategoryLabels.forEach(category => {
      categorySeverityMap[category] = { minor: 0, moderate: 0, major: 0, severe: 0 };
    });
    (categoryData || []).forEach((row: any) => {
      if (!row.consequences) return;
      row.observation_categories?.forEach((cat: any) => {
        const categoryName = cat.safety_categories?.name;
        if (!categoryName) return;
        categorySeverityMap[categoryName][row.consequences] =
          (categorySeverityMap[categoryName][row.consequences] || 0) + 1;
      });
    });
    setMonthlyCategoryLabels(allCategoryLabels);
    setMonthlyCategorySeverityMap(categorySeverityMap);
  };

  // Prepare chart data
  const monthlyChartData = {
    labels: monthlyCategoryLabels,
    datasets: [
      {
        label: 'High Severity',
        data: monthlyCategoryLabels.map(cat => monthlyCategorySeverityMap[cat]?.major + monthlyCategorySeverityMap[cat]?.severe),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Medium Severity',
        data: monthlyCategoryLabels.map(cat => monthlyCategorySeverityMap[cat]?.moderate),
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
      },
      {
        label: 'Low Severity',
        data: monthlyCategoryLabels.map(cat => monthlyCategorySeverityMap[cat]?.minor),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Safety Categories by Severity - ${summary ? format(parseISO(summary.month), 'MMMM yyyy') : ''}`,
      },
    },
    scales: {
      y: {
        min: 0,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Reports',
        },
        ticks: {
          stepSize: 1,
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Safety Category',
        },
      },
    },
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

  if (!summary) {
    return <div>No summary data available</div>;
  }

  const actionStatusData = Object.entries(summary.report_status || {}).map(([name, value]) => {
    console.log('Processing status:', name, value);
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value: Number(value) || 0
    };
  });

  // Normalize report_status keys to lowercase and trim whitespace
  const reportStatus = Object.fromEntries(
    Object.entries(summary.report_status || {}).map(([k, v]) => [k.trim().toLowerCase(), v])
  );

  const statusMap = {
    'Open': Number(reportStatus['open'] || 0),
    'Closed': Number(reportStatus['closed'] || 0)
  };

  console.log('Status map:', statusMap);

  const normalizedActionStatusData = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value: Number(value) || 0
  }));

  console.log('Normalized data:', normalizedActionStatusData);

  const riskLevelsData = Object.entries(summary.risk_levels || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
    value
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Monthly Summary</h2>
        <div className="flex gap-2 items-center">
          <label htmlFor="month-select" className="mr-2 font-medium">Month:</label>
          <select
            id="month-select"
            value={selectedMonth || ''}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {format(new Date(month), 'MMMM yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Monthly Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download size={16} />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Safety Categories by Severity Chart - now at the top, replacing the old pie chart */}
        <div className="bg-white p-6 rounded-lg shadow print:shadow-none">
          <h3 className="text-lg font-semibold mb-4">Safety Categories by Severity (Monthly)</h3>
          <div className="h-[400px]">
            <ChartJSBar data={monthlyChartData} options={monthlyChartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow print:shadow-none">
          <h3 className="text-lg font-semibold mb-4">Report Status</h3>
          <div className="w-full h-[400px] flex items-center justify-center" ref={actionStatusChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={normalizedActionStatusData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#8884d8" 
                  name="Count"
                  label={{
                    position: 'top',
                    content: ({ value }) => value || '0'
                  }}
                >
                  {normalizedActionStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Open' ? '#FF8042' : '#00C49F'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow print:shadow-none">
          <h3 className="text-lg font-semibold mb-4">Risk Levels</h3>
          <div className="w-full h-[400px] flex items-center justify-center" ref={riskLevelsChartRef}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={riskLevelsData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  domain={[0, 'auto']}
                  tickCount={10}
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  interval={0}
                />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill="#ff8042" 
                  name="Count"
                  label={{
                    position: 'top',
                    content: ({ value }) => value || '0'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Total Observations:</span>
              <span className="font-bold">{summary.total_observations}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Month:</span>
              <span className="font-bold">{format(parseISO(summary.month), 'MMMM yyyy')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}