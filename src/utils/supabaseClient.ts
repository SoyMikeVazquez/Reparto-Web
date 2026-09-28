import { createClient } from "@supabase/supabase-js";

// Intercept errors and clean up stale session before creating the client
if (typeof window !== "undefined") {
  // 1. Intercept console.error to prevent Next.js dev overlay from popping up on invalid refresh token errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    try {
      const isAuthApiError = args.some(arg => {
        if (!arg) return false;
        const strArg = String(arg);
        return (
          strArg.includes("Invalid Refresh Token") || 
          strArg.includes("Refresh Token Not Found") ||
          strArg.includes("AuthApiError") ||
          (arg.message && String(arg.message).includes("Invalid Refresh Token")) ||
          arg.name === "AuthApiError"
        );
      });

      if (isAuthApiError) {
        console.warn("Intercepted and suppressed stale Supabase session error:", ...args);
        
        // Clean up stale session state
        localStorage.removeItem("reparto_logged_in");
        localStorage.removeItem("reparto_user_profile");
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            localStorage.removeItem(key);
          }
        }

        // Redirect to login page if we are not already there
        if (window.location.pathname !== "/" && window.location.pathname !== "/index.html") {
          window.location.replace("/");
        }
        return;
      }
    } catch (e) {
      // Fallback
    }
    originalConsoleError(...args);
  };

  // 2. Intercept unhandled promise rejections in the capture phase (before Next.js registers its listeners)
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      
      const isAuthError = reason && (
        reason.name === "AuthApiError" || 
        String(reason.message || "").includes("Invalid Refresh Token") ||
        String(reason.message || "").includes("Refresh Token Not Found") ||
        String(reason).includes("Invalid Refresh Token") ||
        String(reason).includes("Refresh Token Not Found") ||
        String(reason).includes("AuthApiError")
      );

      const isUnknownOrEventError = !reason || 
        reason instanceof Event || 
        String(reason) === "[object Event]" ||
        (typeof reason === "object" && reason.toString === "function" && reason.toString() === "[object Event]");

      if (isAuthError || isUnknownOrEventError) {
        console.warn("Caught and suppressed unhandled rejection:", reason);
        event.preventDefault();
        event.stopImmediatePropagation();
        
        // Clean up stale session state
        localStorage.removeItem("reparto_logged_in");
        localStorage.removeItem("reparto_user_profile");
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            localStorage.removeItem(key);
          }
        }

        // Redirect to login page on authentic authorization failures
        if (isAuthError && window.location.pathname !== "/" && window.location.pathname !== "/index.html") {
          window.location.replace("/");
        }
      }
    } catch (e) {
      console.warn("Error in unhandledrejection handler:", e);
    }
  }, true); // useCapture = true to run BEFORE Next.js handler

  // 3. Intercept global errors in the capture phase
  window.addEventListener("error", (event) => {
    try {
      const error = event.error;
      const message = event.message || "";
      
      const isAuthError = (error && (
        error.name === "AuthApiError" ||
        String(error.message || "").includes("Invalid Refresh Token") ||
        String(error.message || "").includes("Refresh Token Not Found") ||
        String(error).includes("Invalid Refresh Token") ||
        String(error).includes("Refresh Token Not Found")
      )) || message.includes("Invalid Refresh Token") || message.includes("Refresh Token Not Found");

      if (isAuthError) {
        console.warn("Caught and suppressed global auth error:", message);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    } catch (e) {
      console.warn("Error in global error handler:", e);
    }
  }, true);

  // 4. If the user is NOT logged in in our app, clear any leftover Supabase token BEFORE initialization.
  // This prevents any refresh token request from even happening on initial mount of the login page.
  const isLoggedIn = localStorage.getItem("reparto_logged_in");
  if (isLoggedIn !== "true") {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

