"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";

export default function HtmlConfig() {
  const locale = useLocale();

  // ? For Testing
  // console.log("Locale:", locale);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
  }, [locale]);

  return null;
}
