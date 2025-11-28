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

// UUID do usuário de teste (do seed data)
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get userId from localStorage (client-side only)
 * Falls back to TEST_USER_ID if not found
 */
function getUserId(): string | null {
  if (typeof window === "undefined") return TEST_USER_ID;
  const userId = localStorage.getItem("userId");
  // Se não encontrar, usa o usuário de teste e salva no localStorage
  if (!userId) {
    localStorage.setItem("userId", TEST_USER_ID);
    return TEST_USER_ID;
  }
  return userId;
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const userId = getUserId();

  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": userId || TEST_USER_ID, // Sempre envia o header
      ...options?.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Mensagem de erro mais detalhada
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const detailedMessage = `Network error: ${errorMessage}. 
      URL: ${url}
      Method: ${options?.method || "GET"}
      Backend URL: ${API_BASE_URL}
      Make sure the backend is running on port 3001.`;

    console.error("[API Error]", detailedMessage);
    throw new ApiError(detailedMessage);
  }
}
