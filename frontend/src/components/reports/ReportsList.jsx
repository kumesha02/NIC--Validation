import { useEffect, useState } from 'react';
import { Download, Trash2, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { reportService } from '../../services/reportService.js';
import { formatDateTime, mapStatusColor } from '../../utils/formatters.js';

const ReportsList = ({ refreshKey }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await reportService.listReports();
      setReports(response);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load reports';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [refreshKey]);

  const handleDownload = async (reportId) => {
    try {
      const { data, filename } = await reportService.downloadReport(reportId);
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report download started');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to download report';
      toast.error(message);
    }
  };

  const handleDelete = async (reportId) => {
    const confirmed = window.confirm('Delete this report? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await reportService.deleteReport(reportId);
      toast.success('Report deleted');
      fetchReports();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete report';
      toast.error(message);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading reports..." />;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Generated reports</h2>
          <p className="text-sm text-gray-500">Download or manage existing reports.</p>
        </div>
        <button
          type="button"
          onClick={fetchReports}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">File name</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Generated</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No reports generated yet.
                </td>
              </tr>
            )}
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-4 py-3 text-gray-800">{report.reportType}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{report.fileName}</td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(report.generatedAt)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${mapStatusColor(report.status)}`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(report.id)}
                      disabled={report.status !== 'completed'}
                      className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsList;
