const SuccessMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
      {message}
    </div>
  );
};

export default SuccessMessage;
