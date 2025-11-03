const LoadingSpinner = ({ label = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    <p className="mt-4 text-sm text-gray-600">{label}</p>
  </div>
);

export default LoadingSpinner;
