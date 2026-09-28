"use client";

import React from "react";
import styles from "./Navbar.module.css";
import { useDashboard } from "../context/DashboardContext";
import { Play, Pause, AlertCircle, MapPin, Truck } from "lucide-react";

interface NavbarProps {
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab }) => {
  const { drivers, deliveries, settings, toggleSimulation, setSimulationSpeed } = useDashboard();

  // Compute values
  const activeDrivers = drivers.filter(d => d.status !== "offline").length;
  const transitDeliveries = deliveries.filter(d => d.status === "transit" || d.status === "assigned").length;
  const pendingDeliveries = deliveries.filter(d => d.status === "pending").length;

  const tabTitles: { [key: string]: { title: string; subtitle: string } } = {
    overview: {
      title: "Resumen Operativo",
      subtitle: "Vista general del estado de tus entregas y personal"
    },
    orders: {
      title: "Crear Órdenes",
      subtitle: "Menú de ventas y toma de pedidos"
    },
    deliveries: {
      title: "Gestionar Órdenes",
      subtitle: "Listado de pedidos del sistema y su estado actual"
    },
    drivers: {
      title: "Monitorear Conductores",
      subtitle: "Ubicación en tiempo real y estado de los repartidores"
    },
    personnel: {
      title: "Gestión de Personal",
      subtitle: "Directorio de despachadores y administradores del sistema"
    },
    products: {
      title: "Gestión de Productos",
      subtitle: "Catálogo de alimentos, bebidas y productos disponibles"
    },
    branches: {
      title: "Gestión de Sucursales",
      subtitle: "Administración de puntos de venta y sucursales operativas"
    },
    settings: {
      title: "Configuración de Parámetros",
      subtitle: "Establecer llaves de Mapbox y ajustar parámetros de la simulación"
    },
    superadmin: {
      title: "Panel de Super Administrador",
      subtitle: "Administración global de empresas y cuentas de usuario"
    }
  };

  const currentTabInfo = tabTitles[activeTab] || {
    title: "Panel de Control",
    subtitle: "Consola de Administración"
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>{currentTabInfo.title}</h1>
        <p className={styles.subtitle}>{currentTabInfo.subtitle}</p>
      </div>

      <div className={styles.controlsSection}>
        <div className={styles.versionBadge}>
          <span className={styles.versionLabel}>Versión</span>
          <span className={styles.versionValue}>0.0.2</span>
        </div>
      </div>
    </header>
  );
};
