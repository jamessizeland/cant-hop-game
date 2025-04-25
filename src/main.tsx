import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "routes";
import { Layout } from "components/Layout";
import { TourProvider } from "@reactour/tour";
import { tourSteps } from "services/tour";
import { initStore } from "services/ipc";

import "styles/global.css";
import "styles/tailwind.css";

const Store: React.FC = () => {
  useEffect(() => {
    initStore(); // initialize the backend data store.
  }, []);
  return null;
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Store />
    <TourProvider
      steps={tourSteps}
      prevButton={() => <></>} // remove the back button
    >
      <BrowserRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </TourProvider>
  </React.StrictMode>
);
