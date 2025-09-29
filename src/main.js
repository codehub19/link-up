"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_router_dom_1 = require("react-router-dom");
var App_1 = require("./App");
require("./styles.css");
var AuthContext_1 = require("./state/AuthContext");
var sonner_1 = require("sonner");
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <react_router_dom_1.BrowserRouter>
      <AuthContext_1.AuthProvider>
        <App_1.default />
        <sonner_1.Toaster position="top-center" richColors/>
      </AuthContext_1.AuthProvider>
    </react_router_dom_1.BrowserRouter>
  </react_1.default.StrictMode>);
