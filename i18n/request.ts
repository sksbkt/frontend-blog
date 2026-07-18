import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  return {
    locale: locale ?? "fa",
    messages: (await import(`../messages/${locale ?? "fa"}.json`)).default,
  };
});
