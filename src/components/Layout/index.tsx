import { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import Footer from "./footer";
import { checkEnv } from "utils";

console.log(checkEnv());

/** This component is responsible for common elements of the app */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <ToastContainer />
      <div>
        <div className="flex-grow">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
