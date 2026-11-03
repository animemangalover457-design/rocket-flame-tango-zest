import { previewPathPrefix } from "@/lib/preview-path-prefix";

export function withPreviewPrefix(path: string): string {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
  return `${prefix ?? ""}${path}`;
}
