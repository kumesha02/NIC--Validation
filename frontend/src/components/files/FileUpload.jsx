import { useCallback, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import ErrorMessage from '../common/ErrorMessage.jsx';
import SuccessMessage from '../common/SuccessMessage.jsx';
import { validateFileSelection } from '../../utils/validators.js';
import { fileService } from '../../services/fileService.js';

const FileUpload = ({ onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const clearSelection = () => {
    setFiles([]);
    setError('');
  };

  const handleFiles = useCallback((fileList) => {
    setSuccess('');
    const selected = Array.from(fileList || []);
    const validationMessage = validateFileSelection(selected);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError('');
    setFiles(selected);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleSubmit = async () => {
    const validationMessage = validateFileSelection(files);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setUploading(true);
    try {
      const response = await fileService.uploadFiles(files);
      toast.success('Files uploaded successfully');
      setSuccess(response.message);
      clearSelection();
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to upload files';
      toast.error(message);
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-gray-800">Upload CSV files</h2>
        <p className="text-sm text-gray-500">
          Select exactly four CSV files (max 10MB each) containing NIC numbers. Files will be processed in
          the background.
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-10 text-center transition-colors hover:border-primary-300 hover:bg-primary-50"
      >
        <CloudUpload className="h-12 w-12 text-primary-500" />
        <p className="mt-3 text-sm text-gray-600">
          Drag &amp; drop your CSV files here or{' '}
          <label className="cursor-pointer text-primary-600 hover:text-primary-500">
            browse
            <input
              type="file"
              multiple
              accept=".csv,text/csv"
              onChange={(event) => handleFiles(event.target.files)}
              className="hidden"
            />
          </label>
        </p>
        <p className="mt-2 text-xs text-gray-500">Exactly 4 files required. Supported format: .csv</p>
      </div>

      {!!files.length && (
        <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {files.map((file) => (
            <li key={file.name} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-600"
                onClick={() => setFiles((prev) => prev.filter((item) => item !== file))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
      {success && <div className="mt-4"><SuccessMessage message={success} /></div>}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading || files.length !== 4}
          className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? 'Uploading...' : 'Upload files'}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;
