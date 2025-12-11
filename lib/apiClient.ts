// Simple API client wrapper
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"; // Default to a common backend port or relative

interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== "undefined") {
      localStorage.setItem("command_gateway_api_key", key);
    }
  }

  getApiKey(): string | null {
    if (this.apiKey) return this.apiKey;
    if (typeof window !== "undefined") {
      return localStorage.getItem("command_gateway_api_key");
    }
    return null;
  }

  clearApiKey() {
    this.apiKey = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("command_gateway_api_key");
    }
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { params, headers, ...customConfig } = options;
    const key = this.getApiKey();

    const config: RequestInit = {
      ...customConfig,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-API-Key": key } : {}),
        ...headers,
      },
    };

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const queryString = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const response = await fetch(url, config);

    if (response.status === 401 || response.status === 403) {
      // Handle unauthorized - optionally trigger a redirect or callback
      // For now, we just throw
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
        try {
            const errorBody = await response.json();
            throw new Error(errorBody.message || errorBody.error || "API request failed");
        } catch (e) {
             throw new Error(response.statusText || "API request failed");
        }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

