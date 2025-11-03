import { useEffect, useState } from 'react';
import { Search, ArrowUpDown, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { fileService } from '../../services/fileService.js';
import { exportRecordsToCsv, formatDate } from '../../utils/formatters.js';

const columns = [
  { key: 'nicNumber', label: 'NIC Number' },
  { key: 'isValid', label: 'Status' },
  { key: 'gender', label: 'Gender' },
  { key: 'age', label: 'Age' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'validationError', label: 'Error Message' }
];

const RecordsList = ({ refreshKey = 0 }) => {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'nicNumber', direction: 'asc' });

  const fetchFiles = async () => {
    try {
      const response = await fileService.getFiles();
      setFiles(response);
      if (response.length === 0) {
        setSelectedFileId(null);
        setRecords([]);
        setPagination((prev) => ({ ...prev, page: 1, total: 0, pages: 0 }));
        return;
      }

      const hasCurrentSelection = response.some((file) => file.id === selectedFileId);
      if (!hasCurrentSelection) {
        setSelectedFileId(response[0].id);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch files';
      toast.error(message);
    }
  };

  const fetchRecords = async () => {
    if (selectedFileId === null) return;
    setLoading(true);
    try {
      const response = await fileService.getFileRecords(selectedFileId, {
        page: pagination.page,
        limit: pagination.limit,
        search,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction.toUpperCase()
      });

      setRecords(response.records);
      const apiPagination = response.pagination || {};
      setPagination((prev) => ({
        page: Number(apiPagination.page) || prev.page,
        limit: Number(apiPagination.limit) || prev.limit,
        total: Number(apiPagination.total) || 0,
        pages: Number(apiPagination.pages) || 0
      }));
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load records';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [refreshKey]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedFileId, search]);

  useEffect(() => {
    fetchRecords();
  }, [selectedFileId, pagination.page, pagination.limit, search, sortConfig, refreshKey]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = () => {
    exportRecordsToCsv(records);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">NIC records</h2>
          <p className="text-sm text-gray-500">
            Inspect the validation results for any uploaded CSV file.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search NIC number..."
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <select
            value={selectedFileId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedFileId(value === '' ? null : Number(value));
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {files.length === 0 && <option value="">No files available</option>}
            {files.map((file) => (
              <option key={file.id} value={file.id}>
                {file.originalName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            Export current view
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <LoadingSpinner label="Loading records..." />
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-left font-medium uppercase tracking-wide text-gray-500">
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className="flex items-center gap-1 text-gray-600 hover:text-primary-500"
                    >
                      {column.label}
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {records.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                    No records found for this file.
                  </td>
                </tr>
              )}
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{record.nicNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        record.isValid
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {record.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{record.gender || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{record.age ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(record.birthday)}</td>
                  <td className="px-4 py-3 text-gray-600">{record.validationError || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-4 text-sm md:flex-row">
        <div className="text-gray-500">
          Page {pagination.page} of {pagination.pages || 1}. Total records: {pagination.total}.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            disabled={pagination.page <= 1}
            className="rounded-md border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: Math.min(prev.page + 1, prev.pages || 1) }))
            }
            disabled={pagination.page >= (pagination.pages || 1)}
            className="rounded-md border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
          <select
            value={pagination.limit}
            onChange={(event) =>
              setPagination((prev) => ({ ...prev, limit: Number(event.target.value), page: 1 }))
            }
            className="rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default RecordsList;
