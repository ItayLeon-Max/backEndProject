import axios from "axios";

export function getErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return "Request failed";

  const status = err.response?.status;
  const data = err.response?.data;

  if (typeof data === "string") return `(${status ?? "?"}) ${data}`;

  if (data && typeof data === "object") {
    const anyData = data as Record<string, unknown>;
    if (typeof anyData.message === "string") return `(${status ?? "?"}) ${anyData.message}`;
    return `(${status ?? "?"}) ${JSON.stringify(data)}`;
  }

  return `Request failed (${status ?? "?"})`;
}