/** Base URL for the FastAPI backend (set in .env.production or .env.local). */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
