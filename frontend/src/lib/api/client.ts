import { ApiError } from "./errors";

/**
 * Resolves the API base URL.
 * Environment variable NEXT_PUBLIC_API_URL takes precedence.
 * Defaults to http://localhost:8000/api/v1 for local development.
 */
function getApiBaseUrl(): string {
  if (typeof window === "undefined" && process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL.trim().replace(/\/+$/, "");
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "http://localhost:8000/api/v1";
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | string[] | undefined | null>;
}

/**
 * Core HTTP fetch wrapper for API requests.
 * Features:
 * - Base URL resolution from NEXT_PUBLIC_API_URL.
 * - Consistent non-2xx error handling and ApiError wrapping.
 * - Request timeout support via AbortSignal.
 * - Query parameter serialization.
 * - No silent fallback to mock data on error.
 */
export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 10000, params, signal: customSignal, headers, ...restOptions } = options;

  // Build full URL with query parameters
  const baseUrl = getApiBaseUrl();
  // If endpoint starts with http:// or https://, use as is; otherwise append to baseUrl
  let fullUrl: string;
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    fullUrl = endpoint;
  } else {
    const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    fullUrl = `${baseUrl}${formattedEndpoint}`;
  }

  if (params) {
    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) value.forEach((item) => urlObj.searchParams.append(key, item));
        else urlObj.searchParams.append(key, String(value));
      }
    });
    fullUrl = urlObj.toString();
  }

  // Setup abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Combine custom signal with timeout controller signal if present
  if (customSignal) {
    customSignal.addEventListener("abort", () => controller.abort());
  }

  try {
    const isFormData = typeof FormData !== "undefined" && restOptions.body instanceof FormData;
    const response = await fetch(fullUrl, {
      ...restOptions,
      // Session identity is carried in an HTTP-only cookie managed by FastAPI.
      credentials: restOptions.credentials ?? "include",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      let errorCode: string | undefined;
      let errorFields: Record<string, string> | undefined;

      try {
        const errorData = await response.json();
        if (typeof errorData?.detail === "string") {
          errorMessage = errorData.detail;
        } else if (typeof errorData?.detail === "object" && errorData?.detail !== null) {
          errorMessage = JSON.stringify(errorData.detail);
        } else if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
          errorCode = errorData.error.code;
          errorFields = errorData.error.fields;
        }
      } catch {
        // Response body wasn't JSON, retain default status message
      }

      throw new ApiError(response.status, errorMessage, errorCode, errorFields);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timed out or was cancelled.");
    }

    throw new ApiError(500, error instanceof Error ? error.message : "Network error occurred.");
  }
}
