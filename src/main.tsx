import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/globals.css";
import { App } from "./App";
import { Toaster } from "./components/ui/Toast";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster>
        <App/>
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>
);
