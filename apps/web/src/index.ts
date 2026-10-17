// Vite + React app lands here at C5.
import type { ApiResponse } from '@ricfey/shared';

export const WEB_PACKAGE = '@ricfey/web';
export type HealthResponse = ApiResponse<{ status: string }>;
