"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("reparto_logged_in");
    if (isLoggedIn === "true") {
      router.replace("/dashboard");
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "var(--bg-primary)",
      color: "var(--text-secondary)",
      fontFamily: "var(--font-geist-sans), sans-serif"
    }}>
      <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>Redireccionando...</p>
    </div>
  );
}
