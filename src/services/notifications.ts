import { Id, toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const toastConfig: ToastOptions = {
  position: "bottom-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored",
};

export const notify = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.info(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyError = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.error(message, toastConfig);
  return toastConfig.toastId;
};

export const notifySuccess = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.success(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyWarning = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.warning(message, toastConfig);
  return toastConfig.toastId;
};

export const notifyInfo = (
  message: string,
  id?: string,
  timeout = 3000
): string => {
  toastConfig.autoClose = timeout;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  toast.info(message, toastConfig);
  return toastConfig.toastId;
};

export const notifySuspense = (
  message: string,
  id?: string,
  timeout = 3000
): { id: Id; cancel: () => void } => {
  toastConfig.autoClose = false;
  toastConfig.toastId = id ? id : Date.now().toString(16);
  const toastId = toast.loading(message, toastConfig);

  const cancel = () => {
    toast.dismiss(toastId);
  };

  setTimeout(() => {
    toast.update(toastId, {
      render: message,
      type: "info",
      autoClose: timeout,
    });
  }, timeout);

  return { id: toastId, cancel };
};

export interface ProgressNotifier {
  id: Id;
  update: (message: string) => void;
  success: (message: string, timeout?: number) => void;
  error: (message: string, timeout?: number) => void;
  dismiss: () => void;
}

/**
 * Creates and manages a toast notification that shows progress and can be updated.
 * @param initialMessage The message to display initially while loading.
 * @param id Optional toast ID.
 * @returns An object with methods to control the notification.
 */
export const notifyProgress = (
  initialMessage: string,
  id?: string
): ProgressNotifier => {
  const toastId = toast.loading(initialMessage, {
    ...toastConfig,
    toastId: id, // Use provided ID or let toastify generate one
    autoClose: false, // Keep it open until explicitly closed
    closeOnClick: false, // Prevent accidental closing
    draggable: false,
  });

  const update = (message: string) => {
    toast.update(toastId, { render: message, isLoading: true });
  };
  const success = (message: string, timeout = 3000) => {
    toast.update(toastId, {
      render: message,
      type: "success",
      isLoading: false,
      autoClose: timeout,
      closeOnClick: true,
      draggable: true,
    });
  };
  const error = (message: string, timeout = 3000) => {
    toast.update(toastId, {
      render: message,
      type: "error",
      isLoading: false,
      autoClose: timeout,
      closeOnClick: true,
      draggable: true,
    });
  };
  const dismiss = () => {
    toast.dismiss(toastId);
  };

  return { id: toastId, update, success, error, dismiss };
};
