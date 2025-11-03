import { useEffect, useState } from 'react';
import { Trash } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { fileService } from '../../services/fileService.js';
import { formatDateTime, formatNumber, mapStatusColor } from '../../utils/formatters.js';

const FileList = ({ refreshTrigger, onChanged }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fileService.getFiles();
      setFiles(response);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load files';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);

  const handleDelete = async (fileId) => {
    const confirmed = window.confirm('Delete this file and all associated records?');
    if (!confirmed) return;

    try {
      await fileService.deleteFile(fileId);
      toast.success('File deleted');
      fetchFiles();
      if (onChanged) {
        onChanged();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete file';
      toast.error(message);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading uploaded files..." />;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Uploaded files</h2>
          <p className="text-sm text-gray-500">All CSV files you have uploaded recently.</p>
        </div>
        <button
          type="button"
          onClick={fetchFiles}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">File name</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Uploaded</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Total</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Valid</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Invalid</th>
              <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {files.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  You have not uploaded any files yet.
                </td>
              </tr>
            )}
            {files.map((file) => (
              <tr key={file.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{file.originalName}</td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(file.uploadedAt)}</td>
                <td className="px-4 py-3 text-gray-600">{formatNumber(file.totalRecords)}</td>
                <td className="px-4 py-3 text-green-600">{formatNumber(file.validRecords)}</td>
                <td className="px-4 py-3 text-red-500">{formatNumber(file.invalidRecords)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${mapStatusColor(file.status)}`}>
                    {file.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileList;
