type Params = {
  [key: string]: string | number | boolean;
};

export const API_URL = "https://api.openbirding.org/api/v1";

export const get = async (url: string, params: Params = {}) => {
  const cleanParams = Object.keys(params).reduce((accumulator: Record<string, string>, key) => {
    if (params[key]) accumulator[key] = String(params[key]);
    return accumulator;
  }, {});

  const queryParams = new URLSearchParams(cleanParams).toString();

  let urlWithParams = url;
  if (queryParams) {
    urlWithParams += url.includes("?") ? `&${queryParams}` : `?${queryParams}`;
  }

  const fullUrl = `${API_URL}${urlWithParams}`;

  const res = await fetch(fullUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  let json: Record<string, unknown> = {};

  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!res.ok) {
    const errorMessage = (json.error || json.message || "") as string;
    if (res.status === 401) throw new Error(errorMessage || "Unauthorized");
    if (res.status === 403) throw new Error(errorMessage || "Forbidden");
    if (res.status === 404) throw new Error(errorMessage || "Route not found");
    if (res.status === 405) throw new Error(errorMessage || "Method not allowed");
    if (res.status === 504) throw new Error(errorMessage || "Operation timed out. Please try again.");
    throw new Error(errorMessage || "An error occurred");
  }
  return json;
};

export const mutate = async (method: "POST" | "PUT" | "DELETE" | "PATCH", url: string, data?: unknown) => {
  const fullUrl = `${API_URL}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  let json: Record<string, unknown> = {};

  try {
    json = await res.json();
  } catch {
    throw new Error("Invalid JSON response");
  }

  if (!res.ok) {
    const errorMessage = (json.error || json.message || "") as string;
    if (res.status === 401) throw new Error(errorMessage || "Unauthorized");
    if (res.status === 403) throw new Error(errorMessage || "Forbidden");
    if (res.status === 404) throw new Error(errorMessage || "Route not found");
    if (res.status === 405) throw new Error(errorMessage || "Method not allowed");
    if (res.status === 504) throw new Error(errorMessage || "Operation timed out. Please try again.");
    throw new Error(errorMessage || "An error occurred");
  }

  return json;
};
