import { seedDemoData, type DemoData } from "./seed";

// Keyed on globalThis so the in-memory data survives hot reloads in dev.
const KEY = "__schemonlist_demo_data_v1__";

type GlobalWithDemo = typeof globalThis & { [KEY]?: DemoData };

export function demoData(): DemoData {
  const g = globalThis as GlobalWithDemo;
  if (!g[KEY]) g[KEY] = seedDemoData();
  return g[KEY]!;
}

export function resetDemoData(): DemoData {
  const g = globalThis as GlobalWithDemo;
  g[KEY] = seedDemoData();
  return g[KEY]!;
}

export function demoId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
