import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import StatsCard from './StatsCard.jsx';
import Charts from './Charts.jsx';
import RecentUploads from './RecentUploads.jsx';
import { dashboardService } from '../../services/dashboardService.js';
import { formatNumber } from '../../utils/formatters.js';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryData, chartsData, uploadsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getCharts(),
        dashboardService.getRecentUploads()
      ]);

      setSummary(summaryData);
      setCharts(chartsData);
      setRecentUploads(uploadsData);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load dashboard data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !summary || !charts) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          Monitor NIC validation activity, records, and reports across your organization.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total records" value={formatNumber(summary.totalRecords)} icon={Users} />
        <StatsCard
          label="Male records"
          value={formatNumber(summary.genderDistribution.male)}
          icon={UserCheck}
          accent="bg-blue-100 text-blue-600"
        />
        <StatsCard
          label="Female records"
          value={formatNumber(summary.genderDistribution.female)}
          icon={UserX}
          accent="bg-pink-100 text-pink-600"
        />
        <StatsCard
          label="Files processed"
          value={formatNumber(summary.filesProcessed)}
          icon={UploadCloud}
          accent="bg-green-100 text-green-600"
        />
      </div>

      <Charts
        genderDistribution={charts.genderDistribution}
        ageDistribution={charts.ageDistribution}
        recordsPerFile={charts.recordsPerFile}
      />

      <RecentUploads uploads={recentUploads} />
    </div>
  );
};

export default Dashboard;
