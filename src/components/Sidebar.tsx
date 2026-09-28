"use client";

import React, { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";
import { 
  Compass, 
  MapPin, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Truck,
  Shield,
  Package,
  Store,
  ClipboardList,
  Building,
  CreditCard
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  superAdmin?: boolean;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, superAdmin: superAdminProp, isAdmin: isAdminProp }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin Demo");
  const [userRole, setUserRole] = useState("Administrador");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    if (superAdminProp !== undefined) {
      setSuperAdmin(superAdminProp);
    }
  }, [superAdminProp]);

  useEffect(() => {
    if (isAdminProp !== undefined) {
      setIsAdmin(isAdminProp);
    }
  }, [isAdminProp]);

  // Load user profile details on mount
  useEffect(() => {
    const profile = localStorage.getItem("reparto_user_profile");
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        setTimeout(() => {
          if (parsed.name) setUserName(parsed.name);
          if (parsed.role) setUserRole(parsed.role);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.companyLogo) setCompanyLogo(parsed.companyLogo);
          
          const isSuper = parsed.superAdmin === true || parsed.superAdmin === "true" || parsed.superAdmin === 1 || parsed.superAdmin === "1";
          setSuperAdmin(isSuper);

          const isAdm = parsed.isAdmin !== false && parsed.isAdmin !== "false" && parsed.isAdmin !== 0 && parsed.isAdmin !== "0";
          setIsAdmin(isAdm);
        }, 0);
      } catch {
        console.error("Error reading profile details");
      }
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD";
  };

  const showAllTabs = isAdmin && userRole !== "Repartidor";

  const navItems = [
    { id: "overview", label: "Resumen", icon: Compass },
    ...(showAllTabs ? [
      { id: "orders", label: "Crear Órdenes", icon: Store }
    ] : []),
    { id: "deliveries", label: "Gestionar Órdenes", icon: ClipboardList },
    ...(showAllTabs ? [
      { id: "drivers", label: "Gestión de Repartos", icon: Truck },
      { id: "personnel", label: "Gestionar Personal", icon: Users },
      { id: "products", label: "Gestionar Productos", icon: Package },
      { id: "branches", label: "Gestionar Sucursales", icon: Store },
      { id: "payment-config", label: "Pasarelas de Pago", icon: CreditCard }
    ] : []),
    ...(superAdmin && showAllTabs ? [
      { id: "create-company", label: "Crear Empresa", icon: Building },
      { id: "super-admins", label: "Crear SuperAdmin", icon: Shield },
      { id: "create-broker", label: "Crear Broker", icon: Users }
    ] : []),
  ];

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      <div className={styles.brand}>
        {companyLogo && !logoError ? (
          <img 
            src={companyLogo} 
            alt="Logo Empresa" 
            className={styles.companyLogoImg} 
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className={styles.logo}>
            <Shield size={24} />
          </div>
        )}
        <span className={styles.brandName}>{companyName || "Reparto Control"}</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
              style={(item.id === "create-company" || item.id === "super-admins") ? {
                background: isActive ? 'var(--primary)' : 'rgba(13, 148, 136, 0.15)',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                borderRadius: 'var(--radius-md)',
                margin: '4px 8px',
                color: isActive ? 'white' : 'var(--primary)',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.1)'
              } : {}}
            >
              {isActive && <div className={styles.activeIndicator} />}
              <Icon size={20} />
              <span className={styles.linkLabel}>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        className={styles.toggleBtn}
        aria-label="Toggle Sidebar"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className={styles.footer}>
        <div className={styles.avatar}>{getInitials(userName)}</div>
        <div className={styles.footerInfo}>
          <span className={styles.userName}>{userName}</span>
          <span className={styles.userRole} style={{ whiteSpace: "normal" }}>
            {userRole} {companyName ? `• ${companyName}` : ""}
          </span>
        </div>
        <button 
          onClick={onLogout} 
          style={{ marginLeft: "auto", color: "var(--danger)", padding: "4px" }}
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};
