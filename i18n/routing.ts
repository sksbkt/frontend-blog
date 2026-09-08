import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  //? Supported locales. Add the locale code and its translation file.
  //? Example: "de" → messages/de.json
  locales: ["fa", "en"],

  defaultLocale: "fa",

  localePrefix: "always",
});
