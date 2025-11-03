export const NIC_OLD_REGEX = /^\d{9}[VvXx]$/;
export const NIC_NEW_REGEX = /^\d{12}$/;

export const isValidNIC = (value = '') => NIC_OLD_REGEX.test(value) || NIC_NEW_REGEX.test(value);

export const validateFileSelection = (files) => {
  if (!files || files.length !== 4) {
    return 'Exactly 4 CSV files are required';
  }

  for (const file of files) {
    if (!file.name.endsWith('.csv')) {
      return 'Only CSV files are allowed';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'Each file must be smaller than 10MB';
    }
  }

  return null;
};
