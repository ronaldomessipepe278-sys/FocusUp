import type { Priority } from '../../types';

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

export const PRIORITY_STYLE: Record<Priority, string> = {
  low: 'bg-success/15 text-success',
  medium: 'bg-warning/15 text-warning',
  high: 'bg-danger/15 text-danger',
};
