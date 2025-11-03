import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fileService } from '../../services/fileService.js';
import { reportService } from '../../services/reportService.js';

const ReportGenerator = ({ onGenerated }) => {
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ type: 'PDF', fileId: '' });
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    try {
      const response = await fileService.getFiles();
      setFiles(response);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load files';
      toast.error(message);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await reportService.generateReport({
        type: form.type,
        fileId: form.fileId || undefined
      });
      toast.success('Report generation started');
      setForm({ type: 'PDF', fileId: '' });
      if (onGenerated) {
        onGenerated();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate report';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">Generate new report</h2>
      <p className="text-sm text-gray-500">
        Choose a report format and optionally limit it to a specific file.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <label htmlFor="type" className="text-sm font-medium text-gray-700">
            Report type
          </label>
          <select
            id="type"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="PDF">PDF</option>
            <option value="CSV">CSV</option>
            <option value="EXCEL">Excel</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="file" className="text-sm font-medium text-gray-700">
            Filter by file (optional)
          </label>
          <select
            id="file"
            value={form.fileId}
            onChange={(event) => setForm((prev) => ({ ...prev, fileId: event.target.value }))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            <option value="">All files</option>
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.originalName}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Generating...' : 'Generate report'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportGenerator;
