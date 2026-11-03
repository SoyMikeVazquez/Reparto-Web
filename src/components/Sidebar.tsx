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
  CreditCard,
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  Globe
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  superAdmin?: boolean;
  isAdmin?: boolean;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  superAdmin: superAdminProp, 
  isAdmin: isAdminProp,
  userRole: userRoleProp 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userName, setUserName] = useState("Admin Demo");
  const [userRole, setUserRole] = useState(userRoleProp || "Administrador");
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    if (userRoleProp) {
      setUserRole(userRoleProp);
    }
  }, [userRoleProp]);

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

  const isBroker = userRole?.toLowerCase().includes("broker");
  const isRepartidor = userRole === "Repartidor" || !isAdmin;

  // Determine nav items based on role: SuperAdmin -> Broker -> Repartidor -> Merchant / Cliente
  let navItems: { id: string; label: string; icon: any }[] = [];

  if (superAdmin) {
    navItems = [
      { id: "admin-earnings", label: "Gestor de ganancias", icon: DollarSign },
      { id: "create-company", label: "Creador de empresas", icon: Building },
      { id: "create-broker", label: "Creador de Brokers", icon: Users },
      { id: "broker-earnings", label: "Gestor de ingresos de Brokers", icon: TrendingUp },
      { id: "driver-earnings", label: "Gestor de ingresos de Repartidores", icon: Truck },
    ];
  } else if (isBroker) {
    navItems = [
      { id: "broker-my-earnings", label: "Gestión de ingresos", icon: TrendingUp },
      { id: "broker-drivers", label: "Gestión de repartidores", icon: Truck },
      { id: "broker-order-history", label: "Historial de pedidos", icon: ClipboardList },
      { id: "broker-companies", label: "Gestión de sucursales", icon: Store },
    ];
  } else if (isRepartidor) {
    navItems = [
      { id: "overview", label: "Resumen", icon: Compass },
      { id: "deliveries", label: "Gestionar Órdenes", icon: ClipboardList },
    ];
  } else {
    // Cliente / Comercio (Punto de venta, productos, Pedidos enviados, Personalización de web, Sucursales, Personal)
    navItems = [
      { id: "orders", label: "Punto de venta", icon: Store },
      { id: "products", label: "Productos", icon: Package },
      { id: "deliveries", label: "Pedidos enviados", icon: ClipboardList },
      { id: "web-customization", label: "Personalización de web", icon: Globe },
      { id: "branches", label: "Sucursales", icon: Building },
      { id: "personnel", label: "Personal", icon: Users },
    ];
  }

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      <div className={styles.brand}>
        {!superAdmin && companyLogo && !logoError ? (
          <img 
            src={companyLogo} 
            alt="Logo Empresa" 
            className={styles.companyLogoImg} 
            onError={() => setLogoError(true)}
          />
        ) : (
          <img 
            src="/logo oficial.png" 
            alt="Reparto Logo" 
            className={styles.platformLogoImg} 
          />
        )}
        <span className={styles.brandName}>
          {superAdmin ? "Reparto Global" : isBroker ? "Broker Console" : (companyName || "Reparto Control")}
        </span>
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

