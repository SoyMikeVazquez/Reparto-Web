"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";

// Interfaces
export interface Driver {
  id: string;
  name: string;
  status: "online" | "on_delivery" | "offline";
  vehicle: "Motocicleta" | "Bicicleta" | "Automóvil" | "Van";
  phone: string;
  lat: number;
  lng: number;
  speed: number;
  rating: number;
  battery: number;
  currentRoute: [number, number][];
  routeIndex: number;
  color: string;
  activeDeliveryId?: string;
  idEmpresa?: string;
  modelo?: string;
  placas?: string;
  sucursales?: string[];
  fotosVehiculo?: string[];
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  address: string;
  phone?: string;
  total: number;
  status: 'creada' | 'en_preparacion' | 'lista' | 'en_camino' | 'entregada' | 'cancelada';
  idEmpresa: string;
  idSucursal: string;
  products: { id: string; name: string; quantity: number; price: number }[];
  tipoEntrega?: 'a_domicilio' | 'para_llevar' | 'para_comer_aqui' | 'para_recoger' | 'por_app';
  repartidorId?: string | null;
  lat?: number;
  lng?: number;
}

export interface Delivery {
  id: string;
  customer: string;
  address: string;
  status: "pending" | "assigned" | "transit" | "delivered" | "canceled";
  lat: number;
  lng: number;
  driverId: string | null;
  items: string;
  createdTime: string;
  deliveredTime: string | null;
  idEmpresa?: string;
  orderId?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  idEmpresa?: string;
  idSucursales?: string[];
  fotos?: string[];
}

export interface TarifaItem {
  min_km?: number;
  max_km?: number;
  precio?: number;
  km_extra?: boolean;
  precio_por_km?: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: "active" | "inactive";
  idEmpresa?: string;
  telefonos?: string[];
  fotos?: string[];
  disponibilidad?: boolean;
  tarifas?: TarifaItem[];
  lat?: number | null;
  lng?: number | null;
  mapLink?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  status: "active" | "inactive";
  shift?: "Matutino" | "Vespertino" | "Nocturno";
  phone?: number | string | null;
  foto?: string | null;
  sucursales?: string[];
  vehicle?: "Motocicleta" | "Bicicleta" | "Automóvil" | "Van";
  modelo?: string;
  placas?: string;
  fotosVehiculo?: string[];
}

export interface DbUserRow {
  IDUser: string;
  name: string;
  Rol?: string;
  mail: string;
  phone?: string | number | null;
  foto?: string | null;
  IDEmpresa?: string | null;
}

export interface Settings {
  mapboxToken: string;
  simulationSpeed: number;
  isSimulating: boolean;
  mapCenter: [number, number];
  mapZoom: number;
}

interface DashboardContextType {
  drivers: Driver[];
  deliveries: Delivery[];
  personnel: Staff[];
  products: Product[];
  branches: Branch[];
  orders: Order[];
  settings: Settings;
  currentCompanyId: string;
  setCurrentCompanyId: (id: string) => void;
  setMapboxToken: (token: string) => void;
  toggleSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  addDelivery: (delivery: Omit<Delivery, "id" | "status" | "createdTime" | "deliveredTime" | "driverId" | "idEmpresa"> & { driverId?: string | null }) => void;
  assignDelivery: (deliveryId: string, driverId: string) => void;
  addDriver: (driver: { name: string; phone: string; vehicle: "Motocicleta" | "Bicicleta" | "Automóvil" | "Van"; modelo?: string; placas?: string; sucursales?: string[]; fotosVehiculo?: string[] }) => void;
  removeDriver: (driverId: string) => void;
  toggleDriverStatus: (driverId: string) => void;
  triggerDriverIncident: (driverId: string) => void;
  addPersonnel: (staff: Staff) => void;
  removePersonnel: (staffId: string) => void;
  updatePersonnel: (staff: Staff) => void;
  addProduct: (product: Omit<Product, "id" | "idEmpresa">) => void;
  removeProduct: (productId: string) => void;
  updateProduct: (product: Product) => void;
  addBranch: (branch: Omit<Branch, "id" | "idEmpresa">) => void;
  updateBranch: (branch: Branch) => void;
  removeBranch: (branchId: string) => void;
  addOrder: (order: Omit<Order, "id" | "createdAt" | "idEmpresa" | "status">) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderDriver: (orderId: string, driverId: string | null) => void;
  removeOrder: (orderId: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Helper function: Interpolate coordinates to create a route path
const generateRoute = (start: [number, number], end: [number, number], segments = 30): [number, number][] => {
  const route: [number, number][] = [];
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  const midLat = startLat + (endLat - startLat) * 0.4;
  const midLng = startLng + (endLng - startLng) * 0.6;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let lat = startLat;
    let lng = startLng;

    if (t < 0.5) {
      const segmentT = t * 2;
      lat = startLat + (midLat - startLat) * segmentT;
      lng = startLng + (midLng - startLng) * (segmentT * 0.3);
    } else {
      const segmentT = (t - 0.5) * 2;
      lat = midLat + (endLat - midLat) * segmentT;
      lng = (startLng + (midLng - startLng) * 0.3) + (endLng - (startLng + (midLng - startLng) * 0.3)) * segmentT;
    }

    const jitterLat = (Math.random() - 0.5) * 0.0001;
    const jitterLng = (Math.random() - 0.5) * 0.0001;

    route.push([lat + jitterLat, lng + jitterLng]);
  }
  return route;
};

// Database Model Mappers
const mapDbUserToDriver = (row: any): Driver => {
  let fotos: string[] = [];
  if (row.FotosDelVehiculo) {
    try {
      fotos = typeof row.FotosDelVehiculo === 'string'
        ? JSON.parse(row.FotosDelVehiculo)
        : row.FotosDelVehiculo;
    } catch {
      fotos = row.FotosDelVehiculo.split(',').filter(Boolean);
    }
  }

  let sucursales: string[] = [];
  if (row.Sucursales) {
    try {
      sucursales = typeof row.Sucursales === 'string'
        ? JSON.parse(row.Sucursales)
        : row.Sucursales;
    } catch {
      if (typeof row.Sucursales === 'string') {
        sucursales = row.Sucursales.split(',').filter(Boolean);
      }
    }
  }

  const colors = ["#F7340C", "#0d9488", "#059669", "#ec4899", "#a855f7", "#eab308"];
  let colorIndex = 0;
  if (row.IDUser) {
    let sum = 0;
    for (let i = 0; i < row.IDUser.length; i++) {
      sum += row.IDUser.charCodeAt(i);
    }
    colorIndex = sum % colors.length;
  }
  const color = colors[colorIndex];

  return {
    id: row.IDUser,
    name: row.name,
    status: row.status || "online",
    vehicle: row.TipoVehiculo || "Motocicleta",
    phone: row.phone ? String(row.phone) : "",
    lat: row.latitud ? Number(row.latitud) : 19.4250 + (Math.random() - 0.5) * 0.02,
    lng: row.longitud ? Number(row.longitud) : -99.1650 + (Math.random() - 0.5) * 0.02,
    speed: 0,
    rating: 5.0,
    battery: 100,
    color,
    currentRoute: [],
    routeIndex: 0,
    idEmpresa: row.IDEmpresa,
    modelo: row.ModeloVehiculo || "",
    placas: row.Placas || "",
    sucursales: Array.isArray(sucursales) ? sucursales : [],
    fotosVehiculo: fotos
  };
};

const mapDriverToDbUser = (driver: Driver): any => ({
  IDUser: driver.id,
  name: driver.name,
  status: driver.status,
  TipoVehiculo: driver.vehicle,
  phone: driver.phone ? Number(driver.phone.replace(/\D/g, '')) : null,
  latitud: driver.lat,
  longitud: driver.lng,
  IDEmpresa: driver.idEmpresa,
  ModeloVehiculo: driver.modelo || "",
  Placas: driver.placas || "",
  Sucursales: driver.sucursales || [],
  FotosDelVehiculo: driver.fotosVehiculo || [],
  Rol: "Conductor"
});

interface DbDeliveryRow {
  id: string;
  customer: string;
  address: string;
  status: "pending" | "assigned" | "transit" | "delivered" | "canceled";
  lat: number;
  lng: number;
  driver_id: string | null;
  items: string;
  created_time: string;
  delivered_time: string | null;
  idEmpresa?: string;
  order_id?: string | null;
}

const mapDeliveryToDb = (del: Delivery): DbDeliveryRow => ({
  id: del.id,
  customer: del.customer,
  address: del.address,
  status: del.status,
  lat: del.lat,
  lng: del.lng,
  driver_id: del.driverId || null,
  items: del.items,
  created_time: del.createdTime,
  delivered_time: del.deliveredTime || null,
  idEmpresa: del.idEmpresa,
  order_id: del.orderId || null
});

const mapDbToDelivery = (row: DbDeliveryRow): Delivery => ({
  id: row.id,
  customer: row.customer,
  address: row.address,
  status: row.status,
  lat: row.lat,
  lng: row.lng,
  driverId: row.driver_id || null,
  items: row.items,
  createdTime: row.created_time,
  deliveredTime: row.delivered_time || null,
  idEmpresa: row.idEmpresa,
  orderId: row.order_id || undefined
});

const mapProductToDb = (prod: Product): any => ({
  id: prod.id,
  name: prod.name,
  description: prod.description,
  price: prod.price,
  category: prod.category,
  idEmpresa: prod.idEmpresa,
  IDSucursal: prod.idSucursales || [],
  FotosProducto: prod.fotos || []
});

const mapDbToProduct = (row: any): Product => {
  let idSucursales: string[] = [];
  if (row.IDSucursal) {
    try {
      idSucursales = typeof row.IDSucursal === "string" ? JSON.parse(row.IDSucursal) : row.IDSucursal;
    } catch {
      // Fallback
    }
  }

  let fotos: string[] = [];
  if (row.FotosProducto) {
    try {
      fotos = typeof row.FotosProducto === "string" ? JSON.parse(row.FotosProducto) : row.FotosProducto;
    } catch {
      // Fallback
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: Number(row.price || 0),
    category: row.category || "Otros",
    idEmpresa: row.idEmpresa,
    idSucursales: Array.isArray(idSucursales) ? idSucursales : [],
    fotos: Array.isArray(fotos) ? fotos : []
  };
};

const mapBranchToDb = (branch: Branch): any => ({
  IDSucursal: branch.id,
  NombreSucursal: branch.name,
  DireccionSucursal: branch.address,
  IDEmpresa: branch.idEmpresa,
  Telefonos: branch.telefonos || (branch.phone ? [branch.phone] : []),
  FotosSucursales: branch.fotos || [],
  Disponibilidad: branch.disponibilidad !== undefined ? branch.disponibilidad : (branch.status === "active"),
  DisponibleSucursal: branch.disponibilidad !== undefined ? branch.disponibilidad : (branch.status === "active"),
  Tarifas: branch.tarifas || [],
  Latitud: branch.lat,
  Longitud: branch.lng,
  LinkGoogleMaps: branch.mapLink || ""
});

const mapDbToBranch = (row: any): Branch => {
  let telefonos: string[] = [];
  if (row.Telefonos) {
    try {
      telefonos = typeof row.Telefonos === "string" ? JSON.parse(row.Telefonos) : row.Telefonos;
    } catch {
      telefonos = [row.phone || row.Telefonos].filter(Boolean);
    }
  } else if (row.phone) {
    telefonos = [row.phone];
  }

  let fotos: string[] = [];
  const rawFotos = row.FotosSucursal || row.FotosSucursales;
  if (rawFotos) {
    try {
      fotos = typeof rawFotos === "string" ? JSON.parse(rawFotos) : rawFotos;
    } catch {
      // Fallback
    }
  }

  const disponibilidad = row.Disponibilidad !== undefined ? row.Disponibilidad :
    row.DisponibleSucursal !== undefined ? row.DisponibleSucursal :
      (row.status === "active" || row.status === undefined);

  let tarifas: TarifaItem[] = [];
  if (row.Tarifas) {
    try {
      tarifas = typeof row.Tarifas === "string" ? JSON.parse(row.Tarifas) : row.Tarifas;
    } catch {
      // Fallback
    }
  }

  return {
    id: row.IDSucursal || row.id,
    name: row.NombreSucursal || row.name,
    address: row.DireccionSucursal || row.address,
    phone: telefonos[0] || row.phone || "",
    status: disponibilidad ? "active" : "inactive",
    idEmpresa: row.IDEmpresa || row.idEmpresa,
    telefonos: Array.isArray(telefonos) ? telefonos : [],
    fotos: Array.isArray(fotos) ? fotos : [],
    disponibilidad: !!disponibilidad,
    tarifas: Array.isArray(tarifas) ? tarifas : [],
    lat: row.Latitud || row.lat || null,
    lng: row.Longitud || row.lng || null,
    mapLink: row.LinkGoogleMaps || ""
  };
};

const mapDbToOrder = (row: any): Order => ({
  id: row.id,
  createdAt: row.created_at,
  customerName: row.cliente_nombre,
  address: row.direccion,
  phone: row.telefono || "",
  total: Number(row.total || 0),
  status: row.estado || "creada",
  idEmpresa: row.id_empresa,
  idSucursal: row.id_sucursal,
  products: Array.isArray(row.productos) ? row.productos : [],
  tipoEntrega: row.tipo_entrega || "a_domicilio",
  repartidorId: row.repartidor_id || null,
  lat: row.lat ? Number(row.lat) : undefined,
  lng: row.lng ? Number(row.lng) : undefined
});

const mapOrderToDb = (order: Order) => ({
  id: order.id,
  cliente_nombre: order.customerName,
  direccion: order.address,
  telefono: order.phone || null,
  total: order.total,
  estado: order.status,
  id_empresa: order.idEmpresa,
  id_sucursal: order.idSucursal,
  productos: order.products,
  tipo_entrega: order.tipoEntrega || 'a_domicilio',
  repartidor_id: order.repartidorId || null,
  lat: order.lat || null,
  lng: order.lng || null
});

// Initial local states as fallback
const INITIAL_DRIVERS: Driver[] = [
  {
    id: "d75c1274-128a-4467-bc18-b2a6136d8591",
    name: "Carlos Mendoza",
    status: "offline",
    vehicle: "Motocicleta",
    phone: "+52 81 1234 5678",
    lat: 25.6866,
    lng: -100.3161,
    speed: 0,
    rating: 4.8,
    battery: 88,
    color: "#6366f1",
    currentRoute: [],
    routeIndex: 0,
    activeDeliveryId: undefined,
    idEmpresa: "emp-mock-1"
  },
  {
    id: "e2bb7a8b-dfcf-4279-8d77-c992d9d97ee1",
    name: "Sofía Rodríguez",
    status: "offline",
    vehicle: "Bicicleta",
    phone: "+52 81 8765 4321",
    lat: 25.6766,
    lng: -100.3061,
    speed: 0,
    rating: 4.9,
    battery: 95,
    color: "#06b6d4",
    currentRoute: [],
    routeIndex: 0,
    idEmpresa: "emp-mock-1"
  },
  {
    id: "f5e27a94-ea46-4cb3-91cf-22d718b2ab43",
    name: "Alejandro Ruiz",
    status: "offline",
    vehicle: "Automóvil",
    phone: "+52 81 1122 3344",
    lat: 25.6966,
    lng: -100.3261,
    speed: 0,
    rating: 4.7,
    battery: 72,
    color: "#10b981",
    currentRoute: [],
    routeIndex: 0,
    activeDeliveryId: undefined,
    idEmpresa: "emp-mock-1"
  }
];

const INITIAL_DELIVERIES: Delivery[] = [
  {
    id: "del-1",
    customer: "Restaurante El Cardenal",
    address: "Calle de la Palma 23, Centro Histórico",
    status: "pending",
    lat: 25.6866,
    lng: -100.3161,
    driverId: null,
    items: "Caja de alimentos gourmet x2, Bebidas x4",
    createdTime: "11:05 AM",
    deliveredTime: null,
    idEmpresa: "emp-mock-1"
  },
  {
    id: "del-2",
    customer: "Oficinas Reforma 222",
    address: "Paseo de la Reforma 222, Juárez",
    status: "pending",
    lat: 25.6780,
    lng: -100.3120,
    driverId: null,
    items: "Documentos notariales urgentes, Paquete de oficina",
    createdTime: "11:15 AM",
    deliveredTime: null,
    idEmpresa: "emp-mock-1"
  },
  {
    id: "del-3",
    customer: "Hospital Ángeles Roma",
    address: "Querétaro 58, Roma Norte",
    status: "pending",
    lat: 25.6910,
    lng: -100.3210,
    driverId: null,
    items: "Suministros médicos de primera necesidad",
    createdTime: "11:20 AM",
    deliveredTime: null,
    idEmpresa: "emp-mock-1"
  }
];

const INITIAL_PERSONNEL: Staff[] = [
  {
    id: "stf-1",
    name: "Eduardo Torres",
    role: "Dispatcher",
    email: "eduardo@reparto.com",
    status: "active",
    shift: "Matutino"
  },
  {
    id: "stf-2",
    name: "Ana Gabriela López",
    role: "Administrador",
    email: "ana.lopez@reparto.com",
    status: "active",
    shift: "Vespertino"
  }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Hamburguesa Clásica",
    description: "Deliciosa hamburguesa con queso, lechuga y tomate.",
    price: 120,
    category: "Comida",
    idEmpresa: "emp-mock-1"
  },
  {
    id: "prod-2",
    name: "Refresco de Cola",
    description: "Bebida refrescante de 600ml.",
    price: 25,
    category: "Bebidas",
    idEmpresa: "emp-mock-1"
  }
];

const INITIAL_BRANCHES: Branch[] = [
  {
    id: "branch-1",
    name: "Sucursal Centro",
    address: "Av. Principal 123, Centro",
    phone: "555-1234",
    status: "active",
    idEmpresa: "emp-mock-1",
    telefonos: ["555-1234", "555-5678"],
    fotos: [
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=60"
    ],
    disponibilidad: true
  },
  {
    id: "branch-2",
    name: "Sucursal Norte",
    address: "Blvd. Norte 456, Valle",
    phone: "555-5678",
    status: "active",
    idEmpresa: "emp-mock-1",
    telefonos: ["555-5678"],
    fotos: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60"
    ],
    disponibilidad: true
  }
];

// Helper: Call server-side Resend Email Router
const sendNotificationEmail = async (to: string, subject: string, html: string) => {
  const emailApiUrl = process.env.NEXT_PUBLIC_EMAIL_API_URL || "/api/send-email";

  console.log(`[Notificación por Correo] Destinatario: ${to} | Asunto: ${subject}`);

  try {
    const res = await fetch(emailApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.warn("Failed to dispatch email notification via API:", data.error || data || res.statusText);
    } else {
      console.log("Email notification sent successfully.");
    }
  } catch (err) {
    console.warn("Could not connect to email notification endpoint. This is expected in static export mode if no NEXT_PUBLIC_EMAIL_API_URL is configured.", err);
  }
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [personnel, setPersonnel] = useState<Staff[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSupabaseEnabled, setIsSupabaseEnabled] = useState(false);
  const isSupabaseEnabledRef = useRef(false);

  useEffect(() => {
    isSupabaseEnabledRef.current = isSupabaseEnabled;
  }, [isSupabaseEnabled]);

  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const profile = localStorage.getItem("reparto_user_profile");
        if (profile) {
          const parsed = JSON.parse(profile);
          const companyId = parsed.IDEmpresa || parsed.idEmpresa;
          if (companyId) return companyId;
        }
      } catch { }
    }
    return "emp-mock-1";
  });


  const [settings, setSettings] = useState<Settings>({
    mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
    simulationSpeed: 1,
    isSimulating: true,
    mapCenter: [25.6866, -100.3161], // Centered around Monterrey, Nuevo León
    mapZoom: 12
  });

  const stateRef = useRef({ drivers, deliveries, settings, orders, branches });

  useEffect(() => {
    stateRef.current = { drivers, deliveries, settings, orders, branches };
  }, [drivers, deliveries, settings, orders, branches]);

  // 1. On Mount/Company Change: Fetch state from Supabase or fallback to seed
  useEffect(() => {
    // Sync Mapbox token
    const savedToken = localStorage.getItem("reparto_mapbox_token");
    if (savedToken) {
      setTimeout(() => {
        setSettings((prev) => ({ ...prev, mapboxToken: savedToken }));
      }, 0);
    } else {
      const defaultToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
      localStorage.setItem("reparto_mapbox_token", defaultToken);
      setTimeout(() => {
        setSettings((prev) => ({ ...prev, mapboxToken: defaultToken }));
      }, 0);
    }

    loadInitialData();

    async function loadInitialData() {
      // Auto-resolve company ID if not in localStorage
      let resolvedCompanyId = currentCompanyId;
      if (resolvedCompanyId === "emp-mock-1") {
        try {
          const profileStr = localStorage.getItem("reparto_user_profile");
          if (profileStr) {
            const profile = JSON.parse(profileStr);
            const userEmail = profile.email;
            if (userEmail) {
              const { data: dbUser } = await supabase
                .from("users")
                .select("IDEmpresa")
                .eq("mail", userEmail)
                .maybeSingle();
              if (dbUser?.IDEmpresa) {
                resolvedCompanyId = dbUser.IDEmpresa;
                // Update localStorage and state — this will re-trigger the useEffect
                const updatedProfile = { ...profile, IDEmpresa: resolvedCompanyId };
                localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
                setCurrentCompanyId(resolvedCompanyId);
                console.log("Auto-resolved company ID:", resolvedCompanyId);
                return; // useEffect will re-run with the correct ID
              }
            }
          }
        } catch { }
        // If we couldn't resolve, don't load with mock data
        console.warn("Could not resolve company ID, skipping data load");
        return;
      }

      try {
        // A. Load Drivers (from users table where Rol = 'Conductor')
        let loadedDrivers: Driver[] = [];
        try {
          const { data: dbDrivers, error: drvErr } = await supabase
            .from("users")
            .select("*")
            .eq("IDEmpresa", currentCompanyId)
            .eq("Rol", "Conductor");
          if (!drvErr && dbDrivers && dbDrivers.length > 0) {
            loadedDrivers = dbDrivers.map(mapDbUserToDriver);
          } else if (currentCompanyId === "emp-mock-1") {
            // Seed a fallback set in users only for the mock company
            const seededDrivers = INITIAL_DRIVERS.map(d => ({
              IDUser: d.id,
              name: d.name,
              mail: `${d.name.toLowerCase().replace(/\s+/g, '')}@reparto.mx`,
              Rol: "Conductor",
              IDEmpresa: currentCompanyId,
              phone: d.phone ? Number(d.phone.replace(/\D/g, '')) : null,
              isAdmin: false,
              superAdmin: false,
              status: d.status,
              TipoVehiculo: d.vehicle,
              ModeloVehiculo: d.modelo || "",
              Placas: d.placas || "",
              Sucursales: d.sucursales || "",
              FotosDelVehiculo: d.fotosVehiculo || []
            }));
            const { error: seedErr } = await supabase.from("users").insert(seededDrivers);
            if (seedErr) console.warn("Failed to seed drivers in users table:", seedErr);
            loadedDrivers = INITIAL_DRIVERS.map(d => ({ ...d, idEmpresa: currentCompanyId }));
          } else {
            loadedDrivers = [];
          }
        } catch (err) {
          console.warn("Failed to load drivers from users table:", err);
          if (currentCompanyId === "emp-mock-1") {
            loadedDrivers = INITIAL_DRIVERS.map(d => ({ ...d, idEmpresa: currentCompanyId }));
          } else {
            loadedDrivers = [];
          }
        }

        // B. Load Deliveries
        const { data: dbDeliveries, error: delErr } = await supabase
          .from("deliveries")
          .select("*")
          .eq("idEmpresa", currentCompanyId);
        if (delErr) throw delErr;

        let loadedDeliveries: Delivery[] = [];
        if (dbDeliveries && dbDeliveries.length > 0) {
          loadedDeliveries = dbDeliveries.map(mapDbToDelivery);
        } else if (currentCompanyId === "emp-mock-1") {
          // Seed Deliveries only for mock company
          const seededDeliveries = INITIAL_DELIVERIES.map(d => ({ ...d, idEmpresa: currentCompanyId }));
          const dbReady = seededDeliveries.map(mapDeliveryToDb);
          const { error: seedErr } = await supabase.from("deliveries").insert(dbReady);
          if (seedErr) console.warn("Failed to seed deliveries in Supabase:", seedErr);
          loadedDeliveries = seededDeliveries;
        } else {
          loadedDeliveries = [];
        }

        // C. Load Staff Personnel from public.users table
        let loadedStaff: Staff[] = [];
        try {
          const { data: dbStaff, error: stfErr } = await supabase
            .from("users")
            .select("*")
            .eq("IDEmpresa", currentCompanyId);

          if (!stfErr && dbStaff && dbStaff.length > 0) {
            loadedStaff = dbStaff.map((u: any) => {
              let sucursales: string[] = [];
              if (u.Sucursales) {
                try {
                  sucursales = typeof u.Sucursales === 'string' ? JSON.parse(u.Sucursales) : u.Sucursales;
                } catch {
                  if (typeof u.Sucursales === 'string') {
                    sucursales = u.Sucursales.split(',').filter(Boolean);
                  }
                }
              }

              let fotosVehiculo: string[] = [];
              if (u.FotosDelVehiculo) {
                try {
                  fotosVehiculo = typeof u.FotosDelVehiculo === 'string' ? JSON.parse(u.FotosDelVehiculo) : u.FotosDelVehiculo;
                } catch {
                  // Fallback
                }
              }

              return {
                id: u.IDUser,
                name: u.name,
                role: u.Rol || "Dispatcher",
                email: u.mail,
                status: u.status || "active",
                shift: u.shift || "Matutino",
                phone: u.phone,
                foto: u.foto || null,
                sucursales: Array.isArray(sucursales) ? sucursales : [],
                vehicle: u.TipoVehiculo,
                modelo: u.ModeloVehiculo,
                placas: u.Placas,
                fotosVehiculo: Array.isArray(fotosVehiculo) ? fotosVehiculo : []
              };
            });
          } else {
            // Load local fallback
            const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
            const filteredLocal = localUsers.filter((u: any) => u.IDEmpresa === currentCompanyId);
            if (filteredLocal.length > 0) {
              loadedStaff = filteredLocal.map((u: any) => {
                let sucursales: string[] = [];
                if (u.Sucursales) {
                  try {
                    sucursales = typeof u.Sucursales === 'string' ? JSON.parse(u.Sucursales) : u.Sucursales;
                  } catch {
                    if (typeof u.Sucursales === 'string') {
                      sucursales = u.Sucursales.split(',').filter(Boolean);
                    }
                  }
                }

                let fotosVehiculo: string[] = [];
                if (u.FotosDelVehiculo) {
                  try {
                    fotosVehiculo = typeof u.FotosDelVehiculo === 'string' ? JSON.parse(u.FotosDelVehiculo) : u.FotosDelVehiculo;
                  } catch {
                    // Fallback
                  }
                }

                return {
                  id: u.IDUser,
                  name: u.name,
                  role: u.Rol || "Dispatcher",
                  email: u.mail,
                  status: u.status || "active",
                  shift: u.shift || "Matutino",
                  phone: u.phone,
                  foto: u.foto || null,
                  sucursales: Array.isArray(sucursales) ? sucursales : [],
                  vehicle: u.TipoVehiculo,
                  modelo: u.ModeloVehiculo,
                  placas: u.Placas,
                  fotosVehiculo: Array.isArray(fotosVehiculo) ? fotosVehiculo : []
                };
              });
            } else if (currentCompanyId === "emp-mock-1") {
              loadedStaff = INITIAL_PERSONNEL;
            } else {
              loadedStaff = [];
            }
          }
        } catch (err) {
          console.warn("Failed to query users table, using initial personnel fallback", err);
          if (currentCompanyId === "emp-mock-1") {
            loadedStaff = INITIAL_PERSONNEL;
          } else {
            loadedStaff = [];
          }
        }

        // D. Load Products
        const { data: dbProducts, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("idEmpresa", currentCompanyId);
        if (prodErr) throw prodErr;

        let loadedProducts: Product[] = [];
        if (dbProducts && dbProducts.length > 0) {
          loadedProducts = dbProducts.map(mapDbToProduct);
        } else if (currentCompanyId === "emp-mock-1") {
          const seededProducts = INITIAL_PRODUCTS.map(p => ({ ...p, idEmpresa: currentCompanyId }));
          const dbReady = seededProducts.map(mapProductToDb);
          const { error: seedErr } = await supabase.from("products").insert(dbReady);
          if (seedErr) console.warn("Failed to seed products in Supabase:", seedErr);
          loadedProducts = seededProducts;
        } else {
          loadedProducts = [];
        }

        // E. Load Branches
        let loadedBranches: Branch[] = [];
        try {
          const { data: dbSucursales, error: sucErr } = await supabase
            .from("Sucursales")
            .select("*")
            .eq("IDEmpresa", currentCompanyId);
          if (!sucErr && dbSucursales && dbSucursales.length > 0) {
            loadedBranches = dbSucursales.map(mapDbToBranch);
          } else if (currentCompanyId === "emp-mock-1") {
            if (sucErr) {
              console.warn("Error loading Sucursales:", sucErr.message);
            }
            // No branches found, seed Sucursales table only for mock company
            const seededBranches = INITIAL_BRANCHES.map(b => {
              const dbBranch = mapBranchToDb(b);
              dbBranch.IDEmpresa = currentCompanyId;
              return dbBranch;
            });
            const { error: seedErr } = await supabase.from("Sucursales").insert(seededBranches);
            if (seedErr) {
              console.warn("Failed to seed Sucursales table:", seedErr.message);
            }
            loadedBranches = INITIAL_BRANCHES.map(b => ({ ...b, idEmpresa: currentCompanyId }));
          } else {
            loadedBranches = [];
          }
        } catch (err) {
          console.warn("Failed to load branches from Sucursales or branches table:", err);
          if (currentCompanyId === "emp-mock-1") {
            loadedBranches = INITIAL_BRANCHES.map(b => ({ ...b, idEmpresa: currentCompanyId }));
          } else {
            loadedBranches = [];
          }
        }

        // F. Load Orders
        let loadedOrders: Order[] = [];
        try {
          const { data: dbOrders, error: ordErr } = await supabase
            .from("ordenes")
            .select("*")
            .eq("id_empresa", currentCompanyId);
          if (!ordErr && dbOrders) {
            loadedOrders = dbOrders.map(mapDbToOrder);
          } else {
            console.warn("Could not load from ordenes table:", ordErr?.message);
          }
        } catch (err) {
          console.warn("ordenes table load failed", err);
        }

        // Enable real-time syncing if all tables exist
        setDrivers(loadedDrivers);
        setDeliveries(loadedDeliveries);
        setPersonnel(loadedStaff);
        setProducts(loadedProducts);
        setBranches(loadedBranches);
        setOrders(loadedOrders);
        setIsSupabaseEnabled(true);
        console.log("Supabase connected and tables verified. Real-time syncing enabled for company", currentCompanyId);

      } catch (err) {
        console.warn("Supabase connection failed or tables do not exist. Running in offline/mock mode.", err);
        setIsSupabaseEnabled(false);
        // Fallback to local memory values
        if (currentCompanyId === "emp-mock-1") {
          setDrivers(INITIAL_DRIVERS.map(d => ({ ...d, idEmpresa: currentCompanyId })));
          setDeliveries(INITIAL_DELIVERIES.map(d => ({ ...d, idEmpresa: currentCompanyId })));
          setPersonnel(INITIAL_PERSONNEL);
          setProducts(INITIAL_PRODUCTS.map(p => ({ ...p, idEmpresa: currentCompanyId })));
          setBranches(INITIAL_BRANCHES.map(b => ({ ...b, idEmpresa: currentCompanyId })));
        } else {
          setDrivers([]);
          setDeliveries([]);
          let fallbackStaff: Staff[] = [];
          try {
            const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
            const filteredLocal = localUsers.filter((u: any) => u.IDEmpresa === currentCompanyId);
            fallbackStaff = filteredLocal.map((u: any) => ({
              id: u.IDUser,
              name: u.name,
              role: u.Rol || "Dispatcher",
              email: u.mail,
              status: u.status || "active",
              shift: u.shift || "Matutino",
              phone: u.phone,
              foto: u.foto || null,
              sucursales: [],
              vehicle: u.TipoVehiculo,
              modelo: u.ModeloVehiculo,
              placas: u.Placas,
              fotosVehiculo: []
            }));
          } catch { }
          setPersonnel(fallbackStaff);
          setProducts([]);
          setBranches([]);
        }
        setOrders([]);
      }
    }
  }, [currentCompanyId]);

  const setMapboxToken = (token: string) => {
    localStorage.setItem("reparto_mapbox_token", token);
    setSettings((prev) => ({ ...prev, mapboxToken: token }));
  };

  const toggleSimulation = () => {
    setSettings((prev) => ({ ...prev, isSimulating: !prev.isSimulating }));
  };

  const setSimulationSpeed = (speed: number) => {
    setSettings((prev) => ({ ...prev, simulationSpeed: speed }));
  };

  // 2. Simulation loop synced to Supabase
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (settings.isSimulating) {
      interval = setInterval(() => {
        const currentData = stateRef.current;
        const currentSpeed = currentData.settings.simulationSpeed;

        // Move drivers
        setDrivers((prevDrivers) =>
          prevDrivers.map((driver) => {
            if (driver.status !== "on_delivery" || driver.currentRoute.length === 0) {
              return driver;
            }

            const newIndex = driver.routeIndex + currentSpeed;

            // Route finished
            if (newIndex >= driver.currentRoute.length - 1) {
              const activeDelId = driver.activeDeliveryId;
              if (activeDelId) {
                const delTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                // A. Update delivery status locally and in Supabase
                setDeliveries((prevDels) =>
                  prevDels.map((del) =>
                    del.id === activeDelId
                      ? { ...del, status: "delivered", deliveredTime: delTime }
                      : del
                  )
                );

                const completedDel = currentData.deliveries.find(d => d.id === activeDelId);
                if (completedDel) {
                  // Write to Supabase asynchronously (non-blocking)
                  if (isSupabaseEnabledRef.current) {
                    supabase.from("deliveries").update({
                      status: "delivered",
                      delivered_time: delTime
                    }).eq("id", activeDelId).then(({ error }) => {
                      if (error) console.error("Error updating delivery status in Supabase:", error);
                    });
                  }

                  // Sync order status if associated
                  if (completedDel.orderId) {
                    if (isSupabaseEnabledRef.current) {
                      supabase.from("ordenes").update({
                        estado: "entregada"
                      }).eq("id", completedDel.orderId).then(({ error }) => {
                        if (error) console.error("Error updating order to entregada in Supabase:", error);
                      });
                    }
                    setOrders(prev => prev.map(o => o.id === completedDel.orderId ? { ...o, status: 'entregada' } : o));
                  }

                  // Trigger Resend email receipt
                  const recipient = "admin@reparto.mx";
                  const emailHtml = `
                    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; max-width: 600px;">
                      <h2 style="color: #F7340C; border-bottom: 2px solid #F7340C; padding-bottom: 10px; margin-top:0;">📦 Entrega Completada Exitosamente</h2>
                      <p>Hola Dispatcher,</p>
                      <p>Te informamos que el pedido de <strong>${completedDel.customer}</strong> ha sido entregado correctamente.</p>
                      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <strong>Detalles de Entrega:</strong><br/>
                        • Dirección: ${completedDel.address}<br/>
                        • Artículos: ${completedDel.items}<br/>
                        • Entregado por: ${driver.name}<br/>
                        • Hora de Finalización: ${delTime}
                      </div>
                      <p style="font-size: 0.85rem; color: #666;">Sistema de Notificación Automática Reparto Control.</p>
                    </div>
                  `;
                  sendNotificationEmail(recipient, `✅ Pedido Entregado - ${completedDel.customer}`, emailHtml);
                }
              }

              const destCoords = driver.currentRoute[driver.currentRoute.length - 1];
              const updatedDriver: Driver = {
                ...driver,
                status: "online",
                speed: 0,
                lat: destCoords[0],
                lng: destCoords[1],
                currentRoute: [],
                routeIndex: 0,
                activeDeliveryId: undefined,
                battery: Math.max(driver.battery - Math.floor(Math.random() * 5) - 2, 5)
              };

              // Write updated driver status to Supabase (non-blocking)
              if (isSupabaseEnabledRef.current) {
                supabase.from("users").update({
                  status: "online",
                  latitud: updatedDriver.lat,
                  longitud: updatedDriver.lng
                }).eq("IDUser", driver.id).then(({ error }) => {
                  if (error) console.error("Error updating finished driver status in users table:", error.message || error);
                });
              }

              return updatedDriver;
            }

            const newCoords = driver.currentRoute[newIndex];
            const baseSpeed = driver.vehicle === "Motocicleta" ? 35 : driver.vehicle === "Bicicleta" ? 15 : driver.vehicle === "Automóvil" ? 40 : 30;
            const speedVariance = (Math.random() - 0.5) * 10;
            const newSpeed = Math.max(Math.floor(baseSpeed + speedVariance), 5);
            const newBattery = Math.max(driver.battery - (Math.random() > 0.8 ? 1 : 0), 1);

            const updatedDriver: Driver = {
              ...driver,
              lat: newCoords[0],
              lng: newCoords[1],
              routeIndex: newIndex,
              speed: newSpeed,
              battery: newBattery
            };

            // Sync driver coordinates in database (non-blocking updates to users table)
            if (isSupabaseEnabledRef.current) {
              supabase.from("users").update({
                latitud: updatedDriver.lat,
                longitud: updatedDriver.lng,
                status: updatedDriver.status
              }).eq("IDUser", driver.id).then(({ error }) => {
                if (error) console.error("Error updating simulation coordinates in users table:", error.message || error);
              });
            }

            return updatedDriver;
          })
        );

        // Sync assigned orders transition to transit
        setDeliveries((prevDels) =>
          prevDels.map((del) => {
            if (del.status === "assigned" && del.driverId) {
              const assignedDriver = currentData.drivers.find((d) => d.id === del.driverId);
              if (assignedDriver) {
                // Update driver route locally and in DB
                // Determine starting coordinates based on branch location if available
                let startLat = assignedDriver.lat;
                let startLng = assignedDriver.lng;
                if (del.orderId) {
                  const order = currentData.orders.find(o => o.id === del.orderId);
                  if (order && order.idSucursal) {
                    const branch = currentData.branches.find(b => b.id === order.idSucursal);
                    if (branch && branch.lat !== undefined && branch.lat !== null && branch.lng !== undefined && branch.lng !== null) {
                      startLat = branch.lat;
                      startLng = branch.lng;
                    }
                  }
                }

                const route = generateRoute([startLat, startLng], [del.lat, del.lng]);
                setDrivers((prevDrivers) =>
                  prevDrivers.map((drv) =>
                    drv.id === del.driverId
                      ? {
                        ...drv,
                        status: "on_delivery",
                        activeDeliveryId: del.id,
                        currentRoute: route,
                        routeIndex: 0
                      }
                      : drv
                  )
                );

                if (isSupabaseEnabledRef.current) {
                  supabase.from("users").update({
                    status: "on_delivery",
                    latitud: assignedDriver.lat,
                    longitud: assignedDriver.lng
                  }).eq("IDUser", del.driverId).then(({ error }) => {
                    if (error) console.error("Error setting driver routing in users table:", error);
                  });

                  // Update order to transit in DB
                  supabase.from("deliveries").update({
                    status: "transit"
                  }).eq("id", del.id).then(({ error }) => {
                    if (error) console.error("Error updating order to transit in Supabase:", error);
                  });

                  // Sync order status if associated
                  if (del.orderId) {
                    supabase.from("ordenes").update({
                      estado: "en_camino"
                    }).eq("id", del.orderId).then(({ error }) => {
                      if (error) console.error("Error updating order to en_camino in Supabase:", error);
                    });
                    setOrders(prev => prev.map(o => o.id === del.orderId ? { ...o, status: 'en_camino' } : o));
                  }
                }

                return { ...del, status: "transit" };
              }
            }
            return del;
          })
        );
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.isSimulating]);

  // Actions Synced with Supabase
  const addDelivery = async (delivery: Omit<Delivery, "id" | "status" | "createdTime" | "deliveredTime" | "driverId" | "idEmpresa"> & { driverId?: string | null }) => {
    const { driverId, ...rest } = delivery;
    const newDelivery: Delivery = {
      ...rest,
      id: `del-${Date.now()}`,
      status: "pending",
      driverId: null,
      createdTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      deliveredTime: null,
      idEmpresa: currentCompanyId
    };

    // 1. Update State
    setDeliveries((prev) => [newDelivery, ...prev]);

    // 2. Write to Supabase
    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("deliveries").insert(mapDeliveryToDb(newDelivery));
        if (error) throw error;
      } catch (err) {
        console.error("Error inserting delivery in Supabase:", err);
      }
    }

    // 3. Auto-assign driver if selected
    if (driverId) {
      setTimeout(() => {
        assignDelivery(newDelivery.id, driverId);
      }, 100);
    }

    // 3. Dispatch Email Alert via Resend
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; max-width: 600px;">
        <h2 style="color: #F7340C; border-bottom: 2px solid #F7340C; padding-bottom: 10px; margin-top: 0;">📦 Nuevo Pedido Registrado</h2>
        <p>Hola Dispatcher,</p>
        <p>Se ha registrado una nueva entrega en la plataforma esperando asignación:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Información del Envío:</strong><br/>
          • Cliente: ${newDelivery.customer}<br/>
          • Dirección: ${newDelivery.address}<br/>
          • Items: ${newDelivery.items}<br/>
          • Estatus: <span style="color: #d97706; font-weight: bold;">Pendiente por Asignar</span>
        </div>
        <p style="font-size: 0.85rem; color: #666;">Sistema de Notificación Automática Reparto Control.</p>
      </div>
    `;
    sendNotificationEmail("admin@reparto.mx", `📦 Nuevo Envío Registrado - ${newDelivery.customer}`, emailHtml);
  };

  const assignDelivery = async (deliveryId: string, driverId: string) => {
    const targetDel = deliveries.find(d => d.id === deliveryId);
    const targetDrv = drivers.find(d => d.id === driverId);

    if (!targetDel || !targetDrv) return;

    // Determine starting coordinates based on branch location if available
    let startLat = targetDrv.lat;
    let startLng = targetDrv.lng;
    if (targetDel.orderId) {
      const order = orders.find(o => o.id === targetDel.orderId);
      if (order && order.idSucursal) {
        const branch = branches.find(b => b.id === order.idSucursal);
        if (branch && branch.lat !== undefined && branch.lat !== null && branch.lng !== undefined && branch.lng !== null) {
          startLat = branch.lat;
          startLng = branch.lng;
        }
      }
    }

    const updatedRoute = generateRoute([startLat, startLng], [targetDel.lat, targetDel.lng]);

    // 1. Update State
    setDeliveries((prev) =>
      prev.map((del) => (del.id === deliveryId ? { ...del, status: "assigned", driverId } : del))
    );
    setDrivers((prev) =>
      prev.map((drv) =>
        drv.id === driverId
          ? {
            ...drv,
            status: "on_delivery",
            activeDeliveryId: deliveryId,
            currentRoute: updatedRoute,
            routeIndex: 0
          }
          : drv
      )
    );

    // 2. Write to Supabase
    if (isSupabaseEnabledRef.current) {
      try {
        const { error: delErr } = await supabase.from("deliveries").update({
          status: "assigned",
          driver_id: driverId
        }).eq("id", deliveryId);
        if (delErr) throw delErr;

        const { error: drvErr } = await supabase.from("users").update({
          status: "on_delivery",
          latitud: targetDrv.lat,
          longitud: targetDrv.lng
        }).eq("IDUser", driverId);
        if (drvErr) throw drvErr;
      } catch (err) {
        console.error("Error writing assigned delivery to Supabase:", err);
      }
    }
  };

  const addDriver = async (driver: { name: string; phone: string; vehicle: "Motocicleta" | "Bicicleta" | "Automóvil" | "Van"; modelo?: string; placas?: string; sucursales?: string[]; fotosVehiculo?: string[] }) => {
    const colors = ["#F7340C", "#0d9488", "#059669", "#ec4899", "#a855f7", "#eab308"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const lat = 19.4250 + (Math.random() - 0.5) * 0.02;
    const lng = -99.1650 + (Math.random() - 0.5) * 0.02;
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() :
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    const newDriver: Driver = {
      id,
      name: driver.name,
      status: "online",
      vehicle: driver.vehicle,
      phone: driver.phone,
      lat,
      lng,
      speed: 0,
      rating: 5.0,
      battery: 100,
      color: randomColor,
      currentRoute: [],
      routeIndex: 0,
      idEmpresa: currentCompanyId,
      modelo: driver.modelo || "",
      placas: driver.placas || "",
      sucursales: driver.sucursales || [],
      fotosVehiculo: driver.fotosVehiculo || []
    };

    setDrivers((prev) => [...prev, newDriver]);

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("users").insert({
          IDUser: newDriver.id,
          name: newDriver.name,
          mail: `${newDriver.name.toLowerCase().replace(/\s+/g, '')}@reparto.mx`,
          Rol: "Conductor",
          IDEmpresa: currentCompanyId,
          phone: newDriver.phone ? Number(newDriver.phone.replace(/\D/g, '')) : null,
          isAdmin: false,
          superAdmin: false,
          status: "online",
          TipoVehiculo: newDriver.vehicle,
          ModeloVehiculo: newDriver.modelo,
          Placas: newDriver.placas,
          Sucursales: newDriver.sucursales,
          FotosDelVehiculo: newDriver.fotosVehiculo
        });
        if (error) throw error;
      } catch (err) {
        console.error("Error adding driver in Supabase users table:", err);
      }
    }
  };

  const removeDriver = async (driverId: string) => {
    setDrivers((prev) => prev.filter((drv) => drv.id !== driverId));
    setDeliveries((prev) =>
      prev.map((del) => (del.driverId === driverId ? { ...del, status: "pending", driverId: null } : del))
    );

    if (isSupabaseEnabledRef.current) {
      try {
        const { error: drvErr } = await supabase.from("users").delete().eq("IDUser", driverId);
        if (drvErr) throw drvErr;

        await supabase.from("deliveries").update({
          status: "pending",
          driver_id: null
        }).eq("driver_id", driverId);
      } catch (err) {
        console.error("Error deleting driver in Supabase:", err);
      }
    }
  };

  const toggleDriverStatus = async (driverId: string) => {
    let updatedDriver: Driver | null = null;

    setDrivers((prev) =>
      prev.map((drv) => {
        if (drv.id === driverId) {
          const newStatus = drv.status === "offline" ? "online" : "offline";
          updatedDriver = {
            ...drv,
            status: newStatus,
            speed: 0,
            currentRoute: [],
            routeIndex: 0,
            activeDeliveryId: undefined
          };
          return updatedDriver;
        }
        return drv;
      })
    );

    if (updatedDriver && isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("users").update({
          status: (updatedDriver as Driver).status
        }).eq("IDUser", driverId);
        if (error) throw error;
      } catch (err) {
        console.error("Error toggling driver status in Supabase:", err);
      }
    }
  };

  const triggerDriverIncident = async (driverId: string) => {
    let updatedDriver: Driver | null = null;
    const driverName = drivers.find(d => d.id === driverId)?.name || "Repartidor";

    setDrivers((prev) =>
      prev.map((drv) => {
        if (drv.id === driverId) {
          updatedDriver = {
            ...drv,
            status: "offline",
            speed: 0,
            battery: Math.floor(Math.random() * 10) + 2, // Critical battery level
            currentRoute: [],
            routeIndex: 0
          };
          return updatedDriver;
        }
        return drv;
      })
    );

    setDeliveries((prev) =>
      prev.map((del) =>
        del.driverId === driverId && del.status !== "delivered"
          ? { ...del, status: "pending", driverId: null }
          : del
      )
    );

    if (isSupabaseEnabledRef.current) {
      try {
        const { error: drvErr } = await supabase.from("users").update({
          status: "offline"
        }).eq("IDUser", driverId);
        if (drvErr) throw drvErr;

        const { error: delErr } = await supabase.from("deliveries").update({
          status: "pending",
          driver_id: null
        }).eq("driver_id", driverId).neq("status", "delivered");
        if (delErr) throw delErr;
      } catch (err) {
        console.error("Error writing driver incident to Supabase:", err);
      }
    }

    // Send critical email alert via Resend
    if (updatedDriver) {
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #dc2626; border-radius: 10px; max-width: 600px;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-top: 0;">🚨 Alerta Crítica de Incidencia en Ruta</h2>
          <p>Atención Dispatchers / Soporte,</p>
          <p>Se ha reportado una falla en ruta para el siguiente repartidor:</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #fca5a5;">
            <strong>Detalles del Conductor:</strong><br/>
            • Nombre: ${driverName}<br/>
            • Vehículo: ${(updatedDriver as Driver).vehicle}<br/>
            • Teléfono: ${(updatedDriver as Driver).phone}<br/>
            • Nivel de Batería: <span style="color: #dc2626; font-weight: bold;">${(updatedDriver as Driver).battery}%</span><br/>
            • Estado: Fuera de servicio (Desconectado)
          </div>
          <p style="font-weight: bold; color: #475569;">Las órdenes activas que llevaba asignadas se han liberado y regresado a estado Pendiente para re-asignación.</p>
          <p style="font-size: 0.85rem; color: #666; margin-top: 20px;">Reparto Control GPS - Alerta de Sistema.</p>
        </div>
      `;
      sendNotificationEmail("admin@reparto.mx", `🚨 ALERTA: Falla en Ruta - ${driverName}`, emailHtml);
    }
  };

  const addPersonnel = async (staff: Staff) => {
    setPersonnel((prev) => {
      if (prev.some(p => p.id === staff.id)) {
        return prev.map(p => p.id === staff.id ? staff : p);
      }
      return [...prev, staff];
    });
  };

  const removePersonnel = async (staffId: string) => {
    setPersonnel((prev) => prev.filter((stf) => stf.id !== staffId));

    try {
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      const updatedLocal = localUsers.filter((u: DbUserRow) => u.IDUser !== staffId);
      localStorage.setItem("reparto_local_users", JSON.stringify(updatedLocal));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("users").delete().eq("IDUser", staffId);
        if (error) throw error;
      } catch (err) {
        console.error("Error deleting staff user in Supabase:", err);
      }
    }
  };

  const updatePersonnel = async (staff: Staff) => {
    setPersonnel((prev) => prev.map((stf) => (stf.id === staff.id ? staff : stf)));

    try {
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      const updatedLocal = localUsers.map((u: any) => {
        if (u.IDUser === staff.id) {
          return {
            ...u,
            name: staff.name,
            mail: staff.email,
            Rol: staff.role,
            phone: staff.phone ? Number(String(staff.phone).replace(/\D/g, '')) : null,
            foto: staff.foto,
            status: staff.status || "active",
            shift: staff.shift || "Matutino",
            Sucursales: staff.sucursales || [],
            TipoVehiculo: staff.role === "Repartidor" ? staff.vehicle : null,
            ModeloVehiculo: staff.role === "Repartidor" ? staff.modelo : null,
            Placas: staff.role === "Repartidor" ? staff.placas : null,
            FotosDelVehiculo: staff.role === "Repartidor" ? staff.fotosVehiculo || [] : []
          };
        }
        return u;
      });
      localStorage.setItem("reparto_local_users", JSON.stringify(updatedLocal));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase
          .from("users")
          .update({
            name: staff.name,
            mail: staff.email,
            Rol: staff.role,
            phone: staff.phone ? Number(String(staff.phone).replace(/\D/g, '')) : null,
            foto: staff.foto,
            status: staff.status || "active",
            shift: staff.shift || "Matutino",
            Sucursales: staff.sucursales || [],
            TipoVehiculo: staff.role === "Repartidor" ? staff.vehicle : null,
            ModeloVehiculo: staff.role === "Repartidor" ? staff.modelo : null,
            Placas: staff.role === "Repartidor" ? staff.placas : null,
            FotosDelVehiculo: staff.role === "Repartidor" ? staff.fotosVehiculo || [] : []
          })
          .eq("IDUser", staff.id);
        if (error) throw error;
      } catch (err) {
        console.error("Error updating staff user in Supabase:", err);
      }
    }
  };

  const addProduct = async (product: Omit<Product, "id" | "idEmpresa">) => {
    let companyId = "";
    const profileStr = localStorage.getItem("reparto_user_profile");
    if (profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        companyId = profile.IDEmpresa || profile.idEmpresa || "";
        if (!companyId && profile.email) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("IDEmpresa")
            .eq("mail", profile.email)
            .maybeSingle();
          if (dbUser?.IDEmpresa) {
            companyId = dbUser.IDEmpresa;
            const updatedProfile = { ...profile, IDEmpresa: companyId };
            localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
            setCurrentCompanyId(companyId);
          }
        }
      } catch { }
    }
    if (!companyId) {
      companyId = currentCompanyId;
    }

    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() :
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    const newProduct: Product = {
      ...product,
      id,
      idEmpresa: companyId
    };

    setProducts((prev) => [...prev, newProduct]);

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("products").insert(mapProductToDb(newProduct));
        if (error) throw error;
      } catch (err) {
        console.error("Error inserting product in Supabase:", err);
      }
    }
  };

  const removeProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) throw error;
      } catch (err) {
        console.error("Error deleting product in Supabase:", err);
      }
    }
  };

  const updateProduct = async (product: Product) => {
    let companyId: string = product.idEmpresa || "";
    if (!companyId || companyId === "emp-mock-1") {
      const profileStr = localStorage.getItem("reparto_user_profile");
      if (profileStr) {
        try {
          const profile = JSON.parse(profileStr);
          companyId = profile.IDEmpresa || profile.idEmpresa || "";
          if (!companyId && profile.email) {
            const { data: dbUser } = await supabase
              .from("users")
              .select("IDEmpresa")
              .eq("mail", profile.email)
              .maybeSingle();
            if (dbUser?.IDEmpresa) {
              companyId = dbUser.IDEmpresa;
              const updatedProfile = { ...profile, IDEmpresa: companyId };
              localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
              setCurrentCompanyId(companyId);
            }
          }
        } catch { }
      }
      if (!companyId) {
        companyId = currentCompanyId;
      }
    }

    const updatedProduct = {
      ...product,
      idEmpresa: companyId
    };

    setProducts((prev) => prev.map((p) => p.id === product.id ? updatedProduct : p));

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase
          .from("products")
          .update(mapProductToDb(updatedProduct))
          .eq("id", product.id);
        if (error) throw error;
      } catch (err) {
        console.error("Error updating product in Supabase:", err);
      }
    }
  };

  const addBranch = async (branch: Omit<Branch, "id" | "idEmpresa">) => {
    // 1. Get company ID - localStorage first, then query Supabase
    let companyId = "";
    const profileStr = localStorage.getItem("reparto_user_profile");
    if (profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        companyId = profile.IDEmpresa || profile.idEmpresa || "";

        // If still no company ID, fetch from Supabase by email
        if (!companyId && profile.email) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("IDEmpresa")
            .eq("mail", profile.email)
            .maybeSingle();
          if (dbUser?.IDEmpresa) {
            companyId = dbUser.IDEmpresa;
            // Save it to localStorage so next time it's instant
            const updatedProfile = { ...profile, IDEmpresa: companyId };
            localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
            setCurrentCompanyId(companyId);
          }
        }
      } catch { }
    }
    if (!companyId) {
      companyId = currentCompanyId;
    }

    // 2. Generate a secure unique ID for the branch
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() :
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    const newBranch: Branch = {
      ...branch,
      id,
      idEmpresa: companyId
    };

    setBranches((prev) => [...prev, newBranch]);

    if (isSupabaseEnabledRef.current) {
      try {
        const payload = mapBranchToDb(newBranch);
        console.log("Inserting branch into Sucursales:", JSON.stringify(payload));
        const { error } = await supabase.from("Sucursales").insert(payload);
        if (error) {
          console.error("Error inserting branch into Sucursales:", error.message, error.details, error.hint);
        } else {
          console.log("Branch inserted successfully into Sucursales");
        }
      } catch (err: any) {
        console.error("Exception inserting branch in Supabase:", err?.message || err);
      }
    }
  };

  const updateBranch = async (updatedBranch: Branch) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === updatedBranch.id ? updatedBranch : b))
    );

    if (isSupabaseEnabledRef.current) {
      try {
        const payload = mapBranchToDb(updatedBranch);
        const { error } = await supabase
          .from("Sucursales")
          .update(payload)
          .eq("IDSucursal", updatedBranch.id);
        if (error) {
          console.error("Error updating branch in Sucursales:", error.message);
        }
      } catch (err) {
        console.error("Exception updating branch in Supabase:", err);
      }
    }
  };

  const removeBranch = async (branchId: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== branchId));

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("Sucursales").delete().eq("IDSucursal", branchId);
        if (error) {
          console.error("Error deleting branch from Sucursales:", error.message, error.details);
        }
      } catch (err) {
        console.error("Exception deleting branch in Supabase:", err);
      }
    }
  };

  const addOrder = async (orderData: Omit<Order, "id" | "createdAt" | "idEmpresa" | "status">) => {
    let companyId = "";
    const profileStr = localStorage.getItem("reparto_user_profile");
    if (profileStr) {
      try {
        const profile = JSON.parse(profileStr);
        companyId = profile.IDEmpresa || profile.idEmpresa || "";
        if (!companyId && profile.email) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("IDEmpresa")
            .eq("mail", profile.email)
            .maybeSingle();
          if (dbUser?.IDEmpresa) {
            companyId = dbUser.IDEmpresa;
            const updatedProfile = { ...profile, IDEmpresa: companyId };
            localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
            setCurrentCompanyId(companyId);
          }
        }
      } catch { }
    }
    if (!companyId) {
      companyId = currentCompanyId;
    }

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "creada",
      idEmpresa: companyId
    };

    setOrders((prev) => [newOrder, ...prev]);

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("ordenes").insert(mapOrderToDb(newOrder));
        if (error) throw error;
      } catch (err) {
        console.error("Error inserting order in Supabase:", err);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase
          .from("ordenes")
          .update({ estado: newStatus })
          .eq("id", orderId);
        if (error) throw error;
      } catch (err) {
        console.error("Error updating order status in Supabase:", err);
      }
    }
  };

  const updateOrderDriver = async (orderId: string, driverId: string | null) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, repartidorId: driverId } : o))
    );

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase
          .from("ordenes")
          .update({ repartidor_id: driverId })
          .eq("id", orderId);
        if (error) throw error;
      } catch (err) {
        console.error("Error updating order driver in Supabase:", err);
      }
    }
  };

  const removeOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    if (isSupabaseEnabledRef.current) {
      try {
        const { error } = await supabase.from("ordenes").delete().eq("id", orderId);
        if (error) throw error;
      } catch (err) {
        console.error("Error deleting order in Supabase:", err);
      }
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        drivers,
        deliveries,
        personnel,
        products,
        branches,
        orders,
        settings,
        currentCompanyId,
        setCurrentCompanyId,
        setMapboxToken,
        toggleSimulation,
        setSimulationSpeed,
        addDelivery,
        assignDelivery,
        addDriver,
        removeDriver,
        toggleDriverStatus,
        triggerDriverIncident,
        addPersonnel,
        removePersonnel,
        updatePersonnel,
        addProduct,
        removeProduct,
        updateProduct,
        addBranch,
        updateBranch,
        removeBranch,
        addOrder,
        updateOrderStatus,
        updateOrderDriver,
        removeOrder
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
