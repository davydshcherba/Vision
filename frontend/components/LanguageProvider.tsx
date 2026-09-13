"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { setApiLanguage } from "@/lib/api";
import { DEFAULT_LANG, dictionaries, isLang, type Dictionary, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "vision-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // * The server always renders the default language; the saved choice is applied after hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) setLangState(saved);
    } catch {
      // ! storage can be blocked (private mode) — stay on the default
    }
  }, []);

  // ! Set during render, not in an effect: children's effects run first and already call the API
  setApiLanguage(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang].title;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // * not saved — the choice still applies until reload
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useI18n must be used inside LanguageProvider");
  return value;
}
