"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function HtmlConfig() {
  const locale = useLocale();

  useEffect(() => {
    const html = document.documentElement;

    html.lang = locale;
    html.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
