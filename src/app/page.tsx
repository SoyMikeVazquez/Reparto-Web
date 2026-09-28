"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { supabase } from "../utils/supabaseClient";
import { Shield, Mail, Lock, ArrowRight, User, Phone, Briefcase, Building } from "lucide-react";

const MOCK_COMPANIES = [
  { idEmpresa: "emp-mock-1", Nombre_Empresa: "Reparto Express Local", foto_empresa: "https://images.unsplash.com/photo-1526367790999-015078648c7e?w=120&auto=format&fit=crop" },
  { idEmpresa: "emp-mock-2", Nombre_Empresa: "Fast Food CDMX Delivery", foto_empresa: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120&auto=format&fit=crop" },
  { idEmpresa: "emp-mock-3", Nombre_Empresa: "Logística Nacional S.A.", foto_empresa: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop" }
];

interface LocalUser {
  IDUser: string;
  name: string;
  mail: string;
  password?: string;
  Rol: string;
  IDEmpresa?: string | null;
  superAdmin?: boolean;
}

interface LocalCompany {
  idEmpresa: string;
  Nombre_Empresa: string;
  foto_empresa?: string;
}

export default function Login() {
  const router = useRouter();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  // User input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"Administrador" | "gestor" | "Repartidor" | "Mesero">("Administrador");
  
  // Company affiliation fields
  const [companies, setCompanies] = useState<{ idEmpresa: string; Nombre_Empresa: string }[]>(MOCK_COMPANIES);
  const [affiliationMode, setAffiliationMode] = useState<"join" | "create">("join");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newCompanyLogo, setNewCompanyLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Status states
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("reparto_logged_in");
    if (isLoggedIn === "true") {
      router.push("/dashboard");
    }
  }, [router]);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();

    async function fetchCompanies() {
      let dbCompanies: { idEmpresa: string; Nombre_Empresa: string }[] = [];
      try {
        const { data, error: dbErr } = await supabase
          .from("Empresa")
          .select("idEmpresa, NombreEmpresa");

        if (!dbErr && data && data.length > 0) {
          dbCompanies = data.map((c: any) => ({
            idEmpresa: c.idEmpresa,
            Nombre_Empresa: c.NombreEmpresa
          }));
        }
      } catch (err) {
        console.warn("Could not query Empresa table in Supabase, using mock fallback list.", err);
      }

      // Merge with local companies
      try {
        const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
        
        const merged: { idEmpresa: string; Nombre_Empresa: string }[] = [];
        const seenIds = new Set<string>();
        
        dbCompanies.forEach((c) => {
          if (c.idEmpresa && !seenIds.has(c.idEmpresa)) {
            seenIds.add(c.idEmpresa);
            merged.push(c);
          }
        });
        
        localCompanies.forEach((lc: any) => {
          const id = lc.idEmpresa || lc.id;
          const name = lc.Nombre_Empresa || lc.NombreEmpresa || "";
          if (id && !seenIds.has(id)) {
            seenIds.add(id);
            merged.push({ idEmpresa: id, Nombre_Empresa: name });
          }
        });
        
        if (merged.length > 0) {
          setCompanies(merged);
          setSelectedCompanyId(merged[0].idEmpresa);
        } else {
          setCompanies(MOCK_COMPANIES);
          setSelectedCompanyId(MOCK_COMPANIES[0].idEmpresa);
        }
      } catch {
        setCompanies(MOCK_COMPANIES);
        setSelectedCompanyId(MOCK_COMPANIES[0].idEmpresa);
      }
    }
  }, [isRegisterMode]);

  // Clean error/message on mode toggle
  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError("");
    setMessage("");
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setRole("Administrador");
    setAffiliationMode("join");
    setNewCompanyName("");
    setNewCompanyEmail("");
    setNewCompanyLogo("");
  };

  const handleLogin = async () => {
    try {
      // 1. Try Supabase Auth check
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (authErr) {
        console.warn("Supabase auth login failed, trying local fallback:", authErr.message);
      } else if (authData?.user) {
        // Fetch matching row from public.users where IDUser = session.user.id
        const userId = authData.user.id;
        let dbUser: any = null;
        
        const { data: userById, error: dbErr } = await supabase
          .from("users")
          .select("*")
          .eq("IDUser", userId)
          .maybeSingle();
        
        if (userById && !dbErr) {
          dbUser = userById;
        } else {
          // Fallback: search by email
          const userEmail = email.trim().toLowerCase();
          const { data: userByMail } = await supabase
            .from("users")
            .select("*")
            .eq("mail", userEmail)
            .maybeSingle();
          
          if (userByMail) {
            dbUser = userByMail;
            // Update IDUser so future logins find the user directly
            await supabase
              .from("users")
              .update({ IDUser: userId })
              .eq("mail", userEmail);
          }
        }

        if (dbUser) {
          // Fetch their associated company
          let companyName = "Empresa Asociada";
          let companyLogo = "";
          if (dbUser.IDEmpresa) {
            const { data: dbCompany } = await supabase
              .from("Empresa")
              .select("NombreEmpresa, logoEmpresa")
              .eq("idEmpresa", dbUser.IDEmpresa)
              .maybeSingle();
            if (dbCompany) {
              companyName = dbCompany.NombreEmpresa || "Empresa Asociada";
              companyLogo = dbCompany.logoEmpresa || "";
            }
          }

          // Save user profile details
          localStorage.setItem("reparto_logged_in", "true");
          localStorage.setItem(
            "reparto_user_profile",
            JSON.stringify({ 
              name: dbUser.name, 
              role: dbUser.Rol, 
              email: dbUser.mail, 
              companyName,
              companyLogo,
              IDEmpresa: dbUser.IDEmpresa,
              superAdmin: dbUser.superAdmin,
              authProvider: "supabase"
            })
          );
          router.push("/dashboard");
          return;
        } else {
          console.warn("Supabase user authenticated, but no public.users row found by IDUser or email. Falling back to local storage.");
        }
      }
    } catch (err) {
      console.warn("Offline auth check activated.", err);
    }

    // 2. Local Fallback Auth check (LocalStorage + Demo accounts)
    const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
    const matchedLocal = localUsers.find(
      (u: LocalUser) => u.mail.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    if (matchedLocal) {
      // Load company name from local list or mock list
      let companyName = "Reparto Express Local";
      let companyLogo = "";
      const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
      const matchedCompany = [...localCompanies, ...MOCK_COMPANIES].find(
        (c: LocalCompany) => c.idEmpresa === matchedLocal.IDEmpresa
      );
      if (matchedCompany) {
        companyName = matchedCompany.Nombre_Empresa;
        companyLogo = matchedCompany.foto_empresa || "";
      }

      localStorage.setItem("reparto_logged_in", "true");
      localStorage.setItem(
        "reparto_user_profile",
        JSON.stringify({ 
          name: matchedLocal.name, 
          role: matchedLocal.Rol, 
          email: matchedLocal.mail, 
          companyName,
          companyLogo,
          IDEmpresa: matchedLocal.IDEmpresa,
          superAdmin: matchedLocal.superAdmin,
          authProvider: "local"
        })
      );
      router.push("/dashboard");
      return;
    }

    setError("Credenciales incorrectas. Regístrate para iniciar sesión.");
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Por favor, llena todos los campos obligatorios.");
      setIsLoading(false);
      return;
    }

    if (affiliationMode === "create" && !newCompanyName.trim()) {
      setError("Por favor, ingresa el nombre de la empresa a crear.");
      setIsLoading(false);
      return;
    }

    const companyId = affiliationMode === "create" ? `emp-${Date.now()}` : selectedCompanyId;
    let registeredInDb = false;
    let authUser = null;

    // Upload company logo to Supabase storage general bucket first (so it's available for both online & local fallbacks)
    let finalLogoUrl = "https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?w=100&auto=format&fit=crop";
    if (affiliationMode === "create" && logoFile) {
      try {
        const fileName = `logos/${Date.now()}_${logoFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, logoFile, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          finalLogoUrl = urlData.publicUrl;
        } else {
          console.warn("Storage logo upload failed, using local base64:", uploadErr);
          finalLogoUrl = newCompanyLogo;
        }
      } catch (err) {
        console.warn("Supabase logo storage upload failed, using local base64:", err);
        finalLogoUrl = newCompanyLogo;
      }
    } else if (newCompanyLogo) {
      finalLogoUrl = newCompanyLogo;
    }

    // 1. Attempt writing to Supabase (using circular reference bypass sequence)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            role: role
          }
        }
      });

      if (authErr) {
        throw authErr;
      }

      if (authData?.user) {
        authUser = authData.user;
        const userId = authUser.id; // auth UUID
        
        // Parse phone to numeric (strip non-digits, if empty save null)
        const cleanedPhone = phone.trim().replace(/\D/g, "");
        const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;

        // User profile object using exact schema column names
        const newUserProfile = {
          IDUser: userId,
          name: name.trim(),
          mail: email.trim().toLowerCase(),
          isAdmin: role === "Repartidor" ? false : true,
          superAdmin: false,
          Rol: role,
          phone: phoneVal,
          IDEmpresa: companyId
        };

        const newCompany = affiliationMode === "create" ? {
          idEmpresa: companyId,
          NombreEmpresa: newCompanyName.trim(),
          mailEmpresa: newCompanyEmail.trim() || email.trim().toLowerCase(),
          logoEmpresa: finalLogoUrl,
          PropietarioEmpresaNombre: name.trim()
        } : null;

        if (affiliationMode === "create" && newCompany) {
          // Step A: Upsert user first with IDEmpresa = null
          const { error: userErr } = await supabase.from("users").upsert({
            ...newUserProfile,
            IDEmpresa: null
          }, { onConflict: "IDUser" });

          if (userErr) throw userErr;

          // Step B: Insert the new company referencing the user
          const { error: compErr } = await supabase.from("Empresa").insert(newCompany);
          if (compErr) throw compErr;

          // Step C: Update the user to reference the newly created company
          const { error: updateErr } = await supabase
            .from("users")
            .update({ IDEmpresa: companyId })
            .eq("IDUser", userId);

          if (updateErr) throw updateErr;
          
          registeredInDb = true;
        } else {
          // Join Mode: Simple direct upsert linking to selected company ID
          const { error: dbErr } = await supabase.from("users").upsert(newUserProfile, { onConflict: "IDUser" });
          if (dbErr) throw dbErr;

          registeredInDb = true;
        }
      }
    } catch (err) {
      console.warn("Supabase database registration failed or offline:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("already registered") || errMsg.includes("User already exists")) {
        setError("Este correo electrónico ya está registrado en Supabase.");
        setIsLoading(false);
        return;
      }
    }

    // 2. Always back up user and company locally in localStorage so login works offline
    const localUserId = authUser ? authUser.id : crypto.randomUUID();
    const localCompanyId = companyId;
    const cleanedPhone = phone.trim().replace(/\D/g, "");
    const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;

    const localUserObj = {
      IDUser: localUserId,
      name: name.trim(),
      mail: email.trim().toLowerCase(),
      password: password,
      isAdmin: role === "Repartidor" ? false : true,
      superAdmin: false,
      Rol: role,
      phone: phoneVal,
      IDEmpresa: localCompanyId
    };

    const localCompanyObj = affiliationMode === "create" ? {
      idEmpresa: localCompanyId,
      Nombre_Empresa: newCompanyName.trim(),
      mailEmpresa: newCompanyEmail.trim() || email.trim().toLowerCase(),
      foto_empresa: finalLogoUrl,
      Afiliado_empresa: localUserId
    } : null;

    try {
      // Save local users
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      if (localUsers.some((u: LocalUser) => u.mail === localUserObj.mail) && !registeredInDb) {
        setError("Este correo electrónico ya está registrado localmente.");
        setIsLoading(false);
        return;
      }
      localUsers.push(localUserObj);
      localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));

      // Save local company details
      if (affiliationMode === "create" && localCompanyObj) {
        const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
        localCompanies.push(localCompanyObj);
        localStorage.setItem("reparto_local_companies", JSON.stringify(localCompanies));
      }
    } catch (err) {
      console.error("Local storage error:", err);
    }

    // Show success details
    setMessage(
      registeredInDb
        ? "¡Registro exitoso en Supabase! Ya puedes iniciar sesión."
        : "Registro exitoso en modo local (sin tablas Supabase). Ya puedes iniciar sesión."
    );
    
    // Auto switch to login after 2.5 seconds
    setTimeout(() => {
      setIsRegisterMode(false);
      setMessage("");
      setError("");
      // Pre-fill login email
      setEmail(localUserObj.mail);
      setPassword("");
      setIsLoading(false);
    }, 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setError("El logo debe tener proporciones cuadradas 1:1.");
          setNewCompanyLogo("");
          setLogoFile(null);
          return;
        }
        if (img.width > 900 || img.height > 900) {
          setError(`El logo no debe exceder un tamaño de 900x900 píxeles. El tuyo mide ${img.width}x${img.height}px.`);
          setNewCompanyLogo("");
          setLogoFile(null);
          return;
        }
        setNewCompanyLogo(event.target?.result as string);
        setLogoFile(file);
        setError(""); // Clear error
      };
      img.onerror = () => {
        setError("Error al procesar la imagen cargada.");
        setNewCompanyLogo("");
        setLogoFile(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    if (isRegisterMode) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <div className={styles.container}>
      {/* Decorative Glow Grid */}
      <div className={styles.background}>
        <div className={styles.glowBall1} />
        <div className={styles.glowBall2} />
      </div>

      <div className={`glass-panel ${styles.card}`} style={{
        width: "100%",
        maxWidth: "460px",
        padding: "40px",
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--glass-shadow)",
        border: "var(--glass-border)",
        background: "var(--glass-bg)",
        margin: "auto"
      }}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Shield size={36} />
          </div>
          <h2 className={styles.title}>Reparto Control</h2>
          <p className={styles.subtitle}>
            {isRegisterMode ? "Crear Nueva Cuenta de Operador" : "Gestor de Entregas & Monitoreo GPS"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div style={{ color: "var(--success)", background: "var(--success-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500, borderLeft: "3px solid var(--success)" }}>{message}</div>}

          {/* Email field */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Correo Electrónico *</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="correo@reparto.mx"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password field */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Contraseña *</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputIcon}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {isRegisterMode && (
            <>
              {/* Name field */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nombre Completo *</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Phone field */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Teléfono (Opcional)</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <Phone size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. +52 55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Role select */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Rol de Usuario *</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <Briefcase size={18} />
                  </span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "Administrador" | "gestor" | "Repartidor" | "Mesero")}
                    className={styles.input}
                    style={{ background: "none", color: "var(--text-primary)", border: "none", width: "100%", outline: "none", cursor: "pointer" }}
                    disabled={isLoading}
                  >
                    <option value="Administrador" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>Administrador</option>
                    <option value="gestor" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>Gestor de Rutas</option>
                    <option value="Repartidor" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>Repartidor</option>
                    <option value="Mesero" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>Mesero</option>
                  </select>
                </div>
              </div>

              {/* Affiliation mode toggle */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Afiliación de Empresa *</label>
                <div style={{ display: "flex", gap: "8px", margin: "4px 0" }}>
                  <button
                    type="button"
                    onClick={() => setAffiliationMode("join")}
                    className={styles.button}
                    style={{
                      flex: 1,
                      margin: 0,
                      height: "36px",
                      fontSize: "0.8rem",
                      background: affiliationMode === "join" ? "var(--primary)" : "rgba(0,0,0,0.03)",
                      color: affiliationMode === "join" ? "white" : "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      boxShadow: "none"
                    }}
                  >
                    Unirse a existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setAffiliationMode("create")}
                    className={styles.button}
                    style={{
                      flex: 1,
                      margin: 0,
                      height: "36px",
                      fontSize: "0.8rem",
                      background: affiliationMode === "create" ? "var(--primary)" : "rgba(0,0,0,0.03)",
                      color: affiliationMode === "create" ? "white" : "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                      boxShadow: "none"
                    }}
                  >
                    Crear nueva
                  </button>
                </div>
              </div>

              {/* Affiliation conditional fields */}
              {affiliationMode === "join" ? (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Selecciona tu Empresa *</label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>
                      <Building size={18} />
                    </span>
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                      className={styles.input}
                      style={{ background: "none", color: "var(--text-primary)", border: "none", width: "100%", outline: "none", cursor: "pointer" }}
                      disabled={isLoading}
                    >
                      {companies.map((comp) => (
                        <option key={comp.idEmpresa} value={comp.idEmpresa} style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                          {comp.Nombre_Empresa}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "10px", background: "rgba(0,0,0,0.01)", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "0.72rem" }}>Nombre de la Empresa *</label>
                    <div className={styles.inputWrapper} style={{ height: "40px" }}>
                      <span className={styles.inputIcon}><Building size={16} /></span>
                      <input
                        type="text"
                        placeholder="Ej. Reparto Express CDMX"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        className={styles.input}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "0.72rem" }}>Correo de la Empresa (Opcional)</label>
                    <div className={styles.inputWrapper} style={{ height: "40px" }}>
                      <span className={styles.inputIcon}><Mail size={16} /></span>
                      <input
                        type="email"
                        placeholder="contacto@empresa.com"
                        value={newCompanyEmail}
                        onChange={(e) => setNewCompanyEmail(e.target.value)}
                        className={styles.input}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} style={{ fontSize: "0.72rem" }}>Subir Logo de la Empresa (Cuadrado 1:1, máx 900x900) *</label>
                    <div className={styles.inputWrapper} style={{ height: "40px", padding: "8px 16px" }}>
                      <span className={styles.inputIcon}><Building size={16} /></span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className={styles.input}
                        style={{ outline: "none", cursor: "pointer", fontSize: "0.8rem", width: "100%", opacity: 1, padding: "4px 0" }}
                        disabled={isLoading}
                        required={!newCompanyLogo}
                      />
                    </div>
                    {newCompanyLogo && (
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", background: "var(--success-glow)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(5, 150, 105, 0.15)" }}>
                        <img 
                          src={newCompanyLogo} 
                          alt="Vista previa" 
                          style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} 
                        />
                        <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 500 }}>Logo cuadrado cargado con éxito</span>
                        <button 
                          type="button" 
                          onClick={() => setNewCompanyLogo("")} 
                          style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Procesando..." : (
              <>
                {isRegisterMode ? "Crear Cuenta & Afiliar" : "Ingresar al Dashboard"} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {isRegisterMode ? (
            <span>
              ¿Ya tienes cuenta?{" "}
              <button onClick={toggleMode} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>
                Inicia sesión aquí
              </button>
            </span>
          ) : (
            <span>
              ¿No tienes cuenta?{" "}
              <button onClick={toggleMode} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>
                Regístrate gratis
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
