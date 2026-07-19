"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

export default function HtmlConfig() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;

    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
