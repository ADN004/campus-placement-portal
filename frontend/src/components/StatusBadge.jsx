import React from 'react';
import { formatStatus } from '../utils/formatStatus';

const StatusBadge = ({ status, className = '' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      submitted: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
      },
      under_review: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
      },
      shortlisted: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-700',
      },
      selected: {
        bg: 'bg-green-100',
        text: 'text-green-700',
      },
    };

    return configs[status] || configs.submitted;
  };

  const config = getStatusConfig(status);

  return (
    <div className={`flex justify-center ${className}`}>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit ${config.bg} ${config.text}`}
      >
        {formatStatus(status)}
      </span>
    </div>
  );
};

export default StatusBadge;
