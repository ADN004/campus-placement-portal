import React from 'react';
import { formatStatus } from '../utils/formatStatus';

/**
 * Application status.
 *
 * `variant="officer"` renders the Register treatment — a coloured dot and the
 * word, sharing the vocabulary the officer tables already use — and reads the
 * role-scoped tokens, so it follows the officer palette rather than carrying a
 * second one. Every other caller gets exactly what it got before: the default
 * branch's class strings are the originals, unchanged and unreordered.
 *
 * Used by seven pages across all three roles, so the default matters more here
 * than anywhere else in this pass.
 */

const OFFICER_TONE = {
  submitted: 'bg-spc-muted',
  under_review: 'bg-spc-warn',
  shortlisted: 'bg-spc-accent',
  rejected: 'bg-spc-bad',
  selected: 'bg-spc-ok',
};

const StatusBadge = ({ status, className = '', variant }) => {
  if (variant === 'officer') {
    const dot = OFFICER_TONE[status] || OFFICER_TONE.submitted;
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-spc-xs font-semibold text-spc-ink">{formatStatus(status)}</span>
      </span>
    );
  }

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
