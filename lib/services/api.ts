// ============================================
// API Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorText = "";
    try {
      errorText = await response.text();
      // Try to parse as JSON for better error messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorText = errorJson.error;
        }
      } catch {
        // Not JSON, use as is
      }
    } catch {
      errorText = `HTTP error! status: ${response.status}`;
    }
    throw new ApiError(
      errorText || `HTTP error! status: ${response.status}`,
      response.status,
      response
    );
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const json = await response.json();
    // Check if response has an error field
    if (json && typeof json === "object" && "error" in json) {
      throw new ApiError(json.error, response.status, response);
    }
    return json;
  }

  return {} as T;
}

// ID do usuário de teste (do seed data) - usando TEXT ID ao invés de UUID
const TEST_USER_ID = "user-001";

/**
 * Get userId from localStorage (client-side only)
 * Falls back to TEST_USER_ID if not found
 * Always returns a valid string, never null
 */
function getUserId(): string {
  if (typeof window === "undefined") {
    return TEST_USER_ID;
  }

  try {
    const userId = localStorage.getItem("userId");

    // Migração: se encontrar o UUID antigo, atualizar para o novo ID
    if (userId === "00000000-0000-0000-0000-000000000001") {
      console.log("[API] Migrating old UUID to new user ID:", TEST_USER_ID);
      localStorage.setItem("userId", TEST_USER_ID);
      return TEST_USER_ID;
    }

    // Se não encontrar, usa o usuário de teste e salva no localStorage
    if (!userId || userId.trim() === "") {
      localStorage.setItem("userId", TEST_USER_ID);
      return TEST_USER_ID;
    }
    return userId;
  } catch (error) {
    // Se houver erro ao acessar localStorage, retorna o usuário de teste
    console.warn("[API] Error accessing localStorage, using test user:", error);
    return TEST_USER_ID;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit & { timeout?: number }
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const userId = getUserId();
  const finalUserId = userId || TEST_USER_ID;

  // Debug: log the userId being sent
  if (typeof window !== "undefined") {
    console.log(`[API Request] ${options?.method || "GET"} ${endpoint}`, {
      userId: finalUserId,
      hasLocalStorage: !!localStorage.getItem("userId"),
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  let userIdToUse = finalUserId;
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      const explicitUserId =
        options.headers.get("X-User-Id") || options.headers.get("x-user-id");
      if (explicitUserId) {
        userIdToUse = explicitUserId;
      }
    } else if (Array.isArray(options.headers)) {
      const userIdEntry = options.headers.find(
        ([key]) => key.toLowerCase() === "x-user-id"
      );
      if (userIdEntry && userIdEntry[1]) {
        userIdToUse = String(userIdEntry[1]);
      }
    } else {
      // Plain object
      const explicitUserId =
        options.headers["X-User-Id"] || options.headers["x-user-id"];
      if (explicitUserId) {
        userIdToUse = String(explicitUserId);
      }
    }
  }

  // Always set X-User-Id with the determined value
  headers.set("X-User-Id", userIdToUse);

  // Add any additional headers from options (excluding X-User-Id since we already set it)
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        // Don't overwrite X-User-Id
        if (key.toLowerCase() !== "x-user-id") {
          headers.set(key, value);
        }
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        // Don't overwrite X-User-Id
        if (key.toLowerCase() !== "x-user-id") {
          headers.set(key, value);
        }
      });
    } else {
      // Plain object
      Object.entries(options.headers).forEach(([key, value]) => {
        // Don't overwrite X-User-Id
        if (key.toLowerCase() !== "x-user-id" && value) {
          headers.set(key, String(value));
        }
      });
    }
  }

  // Debug: log headers for sync-files endpoint
  if (endpoint.includes("sync-files") && typeof window !== "undefined") {
    console.log("[apiRequest] Headers for sync-files:", {
      endpoint,
      userIdToUse,
      finalUserId,
      allHeaders: Object.fromEntries(headers.entries()),
    });
  }

  // Add timeout to prevent hanging requests
  // AI endpoints need more time (130s), others use default (30s)
  const defaultTimeout = 30000; // 30 seconds
  const aiTimeout = 130000; // 130 seconds (slightly more than backend's 120s)
  const timeout =
    options?.timeout ??
    (endpoint.includes("/ai/") ? aiTimeout : defaultTimeout);

  // Log timeout for AI requests for debugging
  if (endpoint.includes("/ai/") && typeof window !== "undefined") {
    console.log(
      `[API] Using ${timeout / 1000}s timeout for AI endpoint: ${endpoint}`
    );
  }

  // Remove timeout from options before passing to fetch (it's not a valid RequestInit property)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { timeout: _removedTimeout, ...fetchOptions } = options || {};

  const config: RequestInit = {
    ...fetchOptions,
    headers: headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return handleResponse<T>(response);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }

    // Mensagem de erro mais detalhada
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it's a network error (backend not running) or timeout
    const isAbortError = error instanceof Error && error.name === "AbortError";
    const isNetworkError =
      isAbortError ||
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("NetworkError") ||
      errorMessage.includes("ERR_CONNECTION_REFUSED") ||
      errorMessage.includes("ERR_INTERNET_DISCONNECTED") ||
      errorMessage.includes("timeout");

    const detailedMessage = isAbortError
      ? `Timeout: O backend não respondeu em ${
          timeout / 1000
        } segundos. Verifique se o servidor está rodando em ${API_BASE_URL} e se o banco de dados está acessível.`
      : isNetworkError
      ? `Backend não está respondendo. Verifique se o servidor está rodando em ${API_BASE_URL}`
      : `Network error: ${errorMessage}. 
      URL: ${url}
      Method: ${options?.method || "GET"}
      Backend URL: ${API_BASE_URL}
      Make sure the backend is running on port 3001.`;

    console.error("[API Error]", {
      message: detailedMessage,
      error: errorMessage,
      url,
      method: options?.method || "GET",
      backendUrl: API_BASE_URL,
      headers: Object.fromEntries(headers.entries()),
    });

    throw new ApiError(detailedMessage);
  }
}
