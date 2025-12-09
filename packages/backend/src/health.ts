export const buildHealthResponse = () => ({
  status: 'ok' as const,
  service: 'backend',
  timestamp: new Date().toISOString(),
});
