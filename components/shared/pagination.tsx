import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

type PaginationProps = {
  currentPage: number;
  hasNextPage: boolean;
  basePath: "/blog" | "/projects";
  translationNamespace: "blog.page" | "projects.page";
};

export default async function Pagination({
  currentPage,
  hasNextPage,
  basePath,
  translationNamespace,
}: PaginationProps) {
  const locale = await getLocale();
  const t = await getTranslations(translationNamespace);

  const hasPreviousPage = currentPage > 1;

  const pages = Array.from(
    new Set(
      [
        1,
        hasPreviousPage ? currentPage - 1 : null,
        currentPage,
        hasNextPage ? currentPage + 1 : null,
      ].filter((page): page is number => page !== null),
    ),
  ).sort((a, b) => a - b);

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {hasPreviousPage ? (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {locale === "fa" ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}

          <span>{t("previous")}</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50"
        >
          {locale === "fa" ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}

          <span>{t("previous")}</span>
        </span>
      )}

      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          const previousPage = pages[index - 1];

          const showEllipsis =
            previousPage !== undefined && page - previousPage > 1;

          return (
            <div
              key={page}
              className="flex items-center gap-1"
            >
              {showEllipsis && (
                <span
                  aria-hidden="true"
                  className="inline-flex size-9 items-center justify-center text-muted-foreground"
                >
                  <MoreHorizontal className="size-4" />
                </span>
              )}

              {page === currentPage ? (
                <span
                  aria-current="page"
                  className="inline-flex size-9 items-center justify-center rounded-lg border bg-background px-3 py-2 text-sm font-medium text-foreground"
                >
                  {page}
                </span>
              ) : (
                <Link
                  href={`${basePath}?page=${page}`}
                  className="inline-flex size-9 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {page}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {hasNextPage ? (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <span>{t("next")}</span>

          {locale === "fa" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground opacity-50"
        >
          <span>{t("next")}</span>

          {locale === "fa" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
      )}
    </nav>
  );
}
