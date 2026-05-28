export const asList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => typeof item === "string" ? item : JSON.stringify(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${key}: ${JSON.stringify(item)}`);
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
};

export const formatDate = (value?: string | null): string => value ? new Date(value).toLocaleString() : "Never";
