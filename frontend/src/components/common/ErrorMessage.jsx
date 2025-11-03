const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
};

export default ErrorMessage;
