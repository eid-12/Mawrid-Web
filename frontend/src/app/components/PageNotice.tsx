import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type PageNoticeProps = {
  variant?: "error" | "warning";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** Inline alert for forms and page-level load failures. */
export function PageNotice({
  variant = "error",
  title,
  children,
  action,
  className = "",
}: PageNoticeProps) {
  const isError = variant === "error";
  return (
    <div
      role="alert"
      className={`p-4 rounded-2xl border flex items-start gap-3 ${
        isError
          ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
      } ${className}`}
    >
      <AlertCircle
        className={`w-5 h-5 mt-0.5 shrink-0 ${isError ? "text-red-600" : "text-amber-600"}`}
      />
      <div className="flex-1 min-w-0">
        {title ? (
          <p
            className={`text-sm font-medium mb-1 ${
              isError ? "text-red-800 dark:text-red-200" : "text-amber-900 dark:text-amber-100"
            }`}
          >
            {title}
          </p>
        ) : null}
        <div
          className={`text-sm ${
            isError ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-200"
          }`}
        >
          {children}
        </div>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
