import { useDiagnosticsStore } from '@stores/diagnosticsStore';

export function handleError(error: Error | unknown, context: string = 'Application') {
  console.error(`[${context}] Error:`, error);
  
  let message = 'An unknown error occurred.';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  useDiagnosticsStore.getState().addLog(`[${context}] ${message}`, 'error');
}
