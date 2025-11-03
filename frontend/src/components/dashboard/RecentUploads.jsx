import { formatDateTime, formatNumber, mapStatusColor } from '../../utils/formatters.js';

const RecentUploads = ({ uploads = [] }) => (
  <div className="rounded-lg bg-white p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-800">Recent uploads</h3>
        <p className="text-sm text-gray-500">Last 10 files processed through the system.</p>
      </div>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {uploads.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                No uploads found yet.
              </td>
            </tr>
          )}
          {uploads.map((upload) => (
            <tr key={upload.id}>
              <td className="px-4 py-3 font-medium text-gray-800">{upload.originalName}</td>
              <td className="px-4 py-3 text-gray-600">{formatDateTime(upload.uploadedAt)}</td>
              <td className="px-4 py-3 text-gray-600">{formatNumber(upload.totalRecords)}</td>
              <td className="px-4 py-3 text-green-600">{formatNumber(upload.validRecords)}</td>
              <td className="px-4 py-3 text-red-500">{formatNumber(upload.invalidRecords)}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${mapStatusColor(upload.status)}`}>
                  {upload.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default RecentUploads;
