"use client";

import React from "react";
import styles from "./Navbar.module.css";
import { useDashboard } from "../context/DashboardContext";

interface NavbarProps {
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab }) => {
  const tabTitles: { [key: string]: { title: string; subtitle: string } } = {
    // Cliente / Comercio
    orders: {
      title: "Punto de Venta",
      subtitle: "Toma y generación de nuevos pedidos directos y de sucursal"
    },
    products: {
      title: "Productos",
      subtitle: "Catálogo de alimentos, bebidas y productos disponibles para venta"
    },
    deliveries: {
      title: "Pedidos Enviados",
      subtitle: "Listado, seguimiento de estados y asignación de órdenes de despacho"
    },
    "web-customization": {
      title: "Personalización de Web",
      subtitle: "Configuración de marca, logotipo, colores y tienda en línea propia"
    },
    branches: {
      title: "Sucursales",
      subtitle: "Administración de puntos de venta y zonas de cobertura"
    },
    personnel: {
      title: "Personal",
      subtitle: "Directorio de colaboradores, meseros y administradores de tu negocio"
    },

    // SuperAdmin
    "admin-earnings": {
      title: "Gestor de Ganancias Globales",
      subtitle: "Métricas consolidadas de facturación, comisiones y volumen de toda la red"
    },
    "create-company": {
      title: "Creador de Empresas",
      subtitle: "Registro, parametrización y catálogo general de empresas cliente"
    },
    "create-broker": {
      title: "Creador de Brokers",
      subtitle: "Alta y asignación de gestores de flotilla multi-empresa"
    },
    "broker-earnings": {
      title: "Gestor de Ingresos de Brokers",
      subtitle: "Control de comisiones, balances y dispersiones por red de brokers"
    },
    "driver-earnings": {
      title: "Gestor de Ingresos de Repartidores",
      subtitle: "Tarifas de envío devengadas, propinas acumuladas y balance por conductor"
    },

    // Broker
    "broker-my-earnings": {
      title: "Gestión de Ingresos",
      subtitle: "Monitoreo de comisiones devengadas, balances y desglose por repartidor"
    },
    "broker-drivers": {
      title: "Gestión de Repartidores de la Red",
      subtitle: "Directorio, asignación y estado operativo de repartidores vinculados al broker"
    },
    "broker-earnings-mgmt": {
      title: "Gestión de Ingresos de la Red",
      subtitle: "Control financiero detallado, desglose por pedidos y dispersiones"
    },
    "broker-order-history": {
      title: "Historial de Pedidos",
      subtitle: "Registro y seguimiento de todas las órdenes y entregas gestionadas por tu red"
    },
    "broker-companies": {
      title: "Gestión de Sucursales y Tarifas",
      subtitle: "Administración de ubicación, link de Google Maps, fotos y tarifas de envío por sucursal"
    },

    // Repartidor
    overview: {
      title: "Resumen Operativo",
      subtitle: "Vista general y mapa de rutas de reparto"
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

