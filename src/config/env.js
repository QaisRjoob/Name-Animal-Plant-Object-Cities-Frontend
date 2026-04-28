const trimTrailingSlash = (value) => String(value ?? "").replace(/\/+$/, "");

const defaultSocketUrl = import.meta.env.DEV ? "http://localhost:3000" : "";

export const API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL ?? "");
export const SOCKET_URL = trimTrailingSlash(
	import.meta.env.VITE_SOCKET_URL ?? defaultSocketUrl
);

const API_ROOT = API_URL
	? (API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`)
	: "/api";

export function apiEndpoint(path) {
	const normalizedPath = String(path ?? "").replace(/^\/+/, "");
	return `${trimTrailingSlash(API_ROOT)}/${normalizedPath}`;
}
