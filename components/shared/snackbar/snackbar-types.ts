export type SnackbarType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "offline"
  | "online";

export interface SnackbarAction {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface SnackbarOptions {
  id?: string;
  type?: SnackbarType;
  title: string;
  description?: string;
  action?: SnackbarAction;
  duration?: number; // ms, default 5000 (0 for sticky)
  isSyncing?: boolean;
}

export interface SnackbarItem extends Required<Omit<SnackbarOptions, "action" | "isSyncing">> {
  action?: SnackbarAction;
  isSyncing?: boolean;
}

export interface SnackbarContextValue {
  show: (options: SnackbarOptions) => string;
  success: (title: string, description?: string, action?: SnackbarAction) => string;
  error: (title: string, description?: string, action?: SnackbarAction) => string;
  warning: (title: string, description?: string, action?: SnackbarAction) => string;
  info: (title: string, description?: string, action?: SnackbarAction) => string;
  offline: (options?: Partial<SnackbarOptions>) => string;
  online: (options?: Partial<SnackbarOptions>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
