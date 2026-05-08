import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { AppUpdatePrompt } from "@/components/AppUpdatePrompt";

/** This component is responsible for common elements of the app */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ToastContainer />
      <AppUpdatePrompt />
      <div>
        <div className="grow">{children}</div>
      </div>
    </div>
  );
}
