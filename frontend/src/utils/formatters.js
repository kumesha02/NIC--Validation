export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat().format(value);
};

export const mapStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'processing':
      return 'bg-yellow-100 text-yellow-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

export const exportRecordsToCsv = (records = []) => {
  if (!records.length) {
    return;
  }

  const header = ['NIC Number', 'Valid', 'Gender', 'Age', 'Birthday', 'Error'];
  const rows = records.map((record) => [
    record.nicNumber,
    record.isValid ? 'Yes' : 'No',
    record.gender ?? '-',
    record.age ?? '-',
    record.birthday ?? '-',
    record.validationError ?? '-'
  ]);

  const csvContent = [header, ...rows].map((row) => row.map((cell) => `"${cell ?? ''}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `nic-records-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
