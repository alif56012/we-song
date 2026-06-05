import { writable, derived } from "svelte/store";
import { translations } from "$lib/assets/translations";

export type Locale = "en" | "th";

const STORAGE_KEY = "we-song-locale";

export type TranslationKey = keyof typeof translations.en;

export const locale = writable<Locale>("en");

export const t = derived(locale, ($locale) => translations[$locale]);

export function initLocale() {
  const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (saved === "en" || saved === "th") locale.set(saved);
}

export function setLocale(l: Locale) {
  localStorage.setItem(STORAGE_KEY, l);
  locale.set(l);
}

export function toggleLocale() {
  locale.update((l) => {
    const next = l === "en" ? "th" : "en";
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  });
}
