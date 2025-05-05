import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';

interface SubmitterCount {
  submitter_name: string;
  count: number;
}

export function WeeklyReport() {
  const [data, setData] = useState<SubmitterCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyCounts = async () => {
      const oneWeekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('observation_details')
        .select('submitter_name, id')
        .gte('created_at', oneWeekAgo);

      if (error) {
        setData([]);
        setLoading(false);
        return;
      }

      // Aggregate counts by submitter_name
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (!row.submitter_name) return;
        counts[row.submitter_name] = (counts[row.submitter_name] || 0) + 1;
      });

      setData(
        Object.entries(counts).map(([submitter_name, count]) => ({
          submitter_name,
          count,
        }))
      );
      setLoading(false);
    };

    fetchWeeklyCounts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-4">Weekly Report: Reports per Submitter</h1>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitter Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reports This Week</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row) => (
              <tr key={row.submitter_name}>
                <td className="px-6 py-4 whitespace-nowrap">{row.submitter_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{row.count}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-4 text-gray-500">
                  No reports found for the past week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 