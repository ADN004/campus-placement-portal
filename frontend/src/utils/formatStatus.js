/**
 * Format application status for display
 * Converts "under_review" to "Under Review", etc.
 */
export const formatStatus = (status) => {
  if (!status) return '';

  const statusMap = {
    'submitted': 'Submitted',
    'under_review': 'Under Review',
    'shortlisted': 'Shortlisted',
    'rejected': 'Rejected',
    'selected': 'Selected',
    'pending': 'Pending',
    'approved': 'Approved'
  };

  return statusMap[status] || status.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};
