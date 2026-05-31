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

export const getUserInitials = (user?: { name?: string | null; email?: string | null } | null): string => {
  const nameParts = user?.name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (nameParts.length > 1) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  }
  if (nameParts.length === 1) {
    return nameParts[0][0].toUpperCase();
  }
  const email = user?.email?.trim();
  return email ? email[0].toUpperCase() : "";
};
