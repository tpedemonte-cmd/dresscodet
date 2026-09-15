import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { initNativeAuthListener } from "./lib/nativeAuth";

createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorker();
initNativeAuthListener();
