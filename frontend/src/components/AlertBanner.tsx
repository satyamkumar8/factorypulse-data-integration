import React from 'react';

interface AlertBannerProps {
  machines: any[];
  onDismiss: () => void;
  isDismissed: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ isDismissed }) => {
  if (isDismissed) return null;
  // Placeholder: no alerts shown in simplified UI
  return null;
};

export default AlertBanner;
