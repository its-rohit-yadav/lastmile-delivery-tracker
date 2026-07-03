import React from 'react';

const StatusPill = ({ status }) => {
  const className = `status-pill status-${status.toLowerCase().replace(/\s/g, '')}`;
  return <span className={className}>{status}</span>;
};

export default StatusPill;
