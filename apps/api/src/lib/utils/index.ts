export function ok<T>(data: T, message = "OK") {
  return { success: true as const, message, data };
}

export function fail(message: string) {
  return { success: false as const, message, data: null };
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
