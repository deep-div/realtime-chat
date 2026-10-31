import { firebaseAuth } from "../firebase/config";

/** Empty in prod (same-origin, frontend served alongside the API); localhost in dev. */
const API_BASE_URL = import.meta.env.DEV ? "http://localhost:8000" : "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Calls the backend API with the current Firebase user's ID token attached. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const idToken = await firebaseAuth.currentUser?.getIdToken();

  const isFormData = init.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
