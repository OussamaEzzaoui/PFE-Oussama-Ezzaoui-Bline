import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SubmitterCount {
  submitter_name: string;
  count: number;
  week_start: string;
}

interface SafetyCategoryData {
  category: string;
  severity: string;
  count: number;
  week_start: string;
}

interface WeekData {
  week_start: string;
  week_end: string;
  submitterData: SubmitterCount[];
  categoryData: SafetyCategoryData[];
}

export function WeeklyReport() {
  const [weeksData, setWeeksData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 is current week, 1 is last week, etc.

  useEffect(() => {
    const fetchHistoricalData = async () => {
      const weeksToFetch = 4; // Show last 4 weeks
      const weeksData: WeekData[] = [];

      // First, get all unique categories to ensure consistent data across weeks
      const { data: allCategories } = await supabase
        .from('safety_categories')
        .select('id, name');

      const categoryMap = new Map(allCategories?.map(cat => [cat.id, cat.name]) || []);

      for (let i = 0; i < weeksToFetch; i++) {
        const weekStart = startOfWeek(subWeeks(new Date(), i));
        const weekEnd = endOfWeek(weekStart);
        
        // Fetch submitter counts
        const { data: submitterData, error: submitterError } = await supabase
          .from('observation_details')
          .select('submitter_name, id, created_at')
          .gte('created_at', format(weekStart, 'yyyy-MM-dd'))
          .lte('created_at', format(weekEnd, 'yyyy-MM-dd'));

        // Fetch category and severity data with proper joins
        const { data: categoryData, error: categoryError } = await supabase
          .from('observation_details')
          .select(`
            id,
            consequences,
            created_at,
            observation_categories!inner (
              category_id,
              safety_categories!inner (
                id,
                name
              )
            )
          `)
          .gte('created_at', format(weekStart, 'yyyy-MM-dd'))
          .lte('created_at', format(weekEnd, 'yyyy-MM-dd'));

        if (submitterError || categoryError) {
          console.error('Error fetching data:', submitterError || categoryError);
          continue;
        }

        // Process submitter data
        const submitterCounts: Record<string, { count: number, displayName: string }> = {};
        (submitterData || []).forEach((row: any) => {
          if (!row.submitter_name) return;
          const normalized = row.submitter_name.trim().toLowerCase();
          if (!submitterCounts[normalized]) {
            submitterCounts[normalized] = { count: 1, displayName: row.submitter_name };
          } else {
            submitterCounts[normalized].count += 1;
          }
        });

        // Process category data
        const categoryCounts: Record<string, Record<string, number>> = {};
        
        // Initialize all categories with zero counts
        categoryMap.forEach((categoryName) => {
          categoryCounts[categoryName] = {
            minor: 0,
            moderate: 0,
            major: 0,
            severe: 0
          };
        });

        // Count actual occurrences
        (categoryData || []).forEach((row: any) => {
          if (!row.consequences) return;
          
          row.observation_categories?.forEach((cat: any) => {
            const categoryName = cat.safety_categories?.name;
            if (!categoryName) return;
            
            categoryCounts[categoryName][row.consequences] = 
              (categoryCounts[categoryName][row.consequences] || 0) + 1;
          });
        });

        const processedSubmitterData = Object.values(submitterCounts).map(({ displayName, count }) => ({
          submitter_name: displayName,
          count,
          week_start: format(weekStart, 'yyyy-MM-dd'),
        }));

        const processedCategoryData: SafetyCategoryData[] = [];
        Object.entries(categoryCounts).forEach(([category, severityCounts]) => {
          Object.entries(severityCounts).forEach(([severity, count]) => {
            processedCategoryData.push({ 
              category, 
              severity, 
              count,
              week_start: format(weekStart, 'yyyy-MM-dd'),
            });
          });
        });

        weeksData.push({
          week_start: format(weekStart, 'yyyy-MM-dd'),
          week_end: format(weekEnd, 'yyyy-MM-dd'),
          submitterData: processedSubmitterData,
          categoryData: processedCategoryData,
        });
      }

      setWeeksData(weeksData);
      setLoading(false);
    };

    fetchHistoricalData();
  }, []);

  const currentWeekData = weeksData[selectedWeek] || { 
    week_start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    week_end: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
    submitterData: [], 
    categoryData: [] 
  };

  // Build a list of all categories from the categoryMap (ensures all are present)
  const allCategoryLabels = weeksData.length > 0 && weeksData[0].categoryData.length > 0
    ? Array.from(new Set(weeksData[0].categoryData.map(item => item.category)))
    : [];

  // If categoryMap is available, use it for labels (ensures all categories are present even if zero)
  if (weeksData.length > 0 && weeksData[0].categoryData.length > 0) {
    const allCategoriesSet = new Set<string>();
    weeksData.forEach(week => {
      week.categoryData.forEach(item => allCategoriesSet.add(item.category));
    });
    allCategoryLabels.splice(0, allCategoryLabels.length, ...Array.from(allCategoriesSet));
  }

  // Build a lookup for category/severity counts
  const categorySeverityMap: Record<string, Record<string, number>> = {};
  allCategoryLabels.forEach(category => {
    categorySeverityMap[category] = { minor: 0, moderate: 0, major: 0, severe: 0 };
  });
  currentWeekData.categoryData.forEach(item => {
    if (categorySeverityMap[item.category]) {
      categorySeverityMap[item.category][item.severity] = item.count;
    }
  });

  const chartData = {
    labels: allCategoryLabels,
    datasets: [
      {
        label: 'High Severity',
        data: allCategoryLabels.map(cat => categorySeverityMap[cat]?.major + categorySeverityMap[cat]?.severe),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Medium Severity',
        data: allCategoryLabels.map(cat => categorySeverityMap[cat]?.moderate),
        backgroundColor: 'rgba(255, 206, 86, 0.5)',
      },
      {
        label: 'Low Severity',
        data: allCategoryLabels.map(cat => categorySeverityMap[cat]?.minor),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Safety Categories by Severity - Week of ${format(new Date(currentWeekData.week_start), 'MMM d, yyyy')}`,
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Weekly Report</h1>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="border rounded-md px-3 py-2"
        >
          {weeksData.map((week, index) => (
            <option key={week.week_start} value={index}>
              Week of {format(new Date(week.week_start), 'MMM d, yyyy')}
            </option>
          ))}
        </select>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Safety Categories by Severity</h2>
        <div className="h-[400px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <h2 className="text-xl font-semibold p-6 pb-0">Reports per Submitter</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports This Week</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentWeekData.submitterData.map((row) => (
              <tr key={row.submitter_name}>
                <td className="px-6 py-4 whitespace-nowrap">{row.submitter_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{row.count}</td>
              </tr>
            ))}
            {currentWeekData.submitterData.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-4 text-gray-500">
                  No reports found for this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 