const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('selcuk_staj_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('selcuk_staj_token', token);
  } else {
    localStorage.removeItem('selcuk_staj_token');
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `İşlem başarısız: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Check if response is JSON or file/text
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return null as unknown as T;
}
