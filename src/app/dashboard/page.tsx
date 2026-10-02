"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { supabase } from "../../utils/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { Sidebar } from "../../components/Sidebar";
import { Navbar } from "../../components/Navbar";
import { StatsCard } from "../../components/StatsCard";
import { MapContainer } from "../../components/MapContainer";
import { useDashboard, Order, Branch, Product, Staff, TarifaItem } from "../../context/DashboardContext";
import {
  MapPin, 
  Truck, 
  CheckCircle, 
  Battery, 
  Plus, 
  Trash2, 
  UserPlus, 
  Activity,
  ShieldAlert,
  Shield,
  Building,
  ClipboardList,
  Upload,
  Image as ImageIcon,
  Edit2,
  Package,
  Store,
  Smartphone,
  Users,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Globe,
  Save,
  Camera,
  Palette,
  Check,
  ArrowUp,
  ArrowDown,
  Percent,
  Wallet,
  Search,
  TrendingUp,
  DollarSign,
  Filter
} from "lucide-react";
import { OrderRouteMap } from "../../components/OrderRouteMap";

interface RouteDetails {
  distanceKm: number;
  coordinates: [number, number][];
}

const calculateHaversineDistance = (p1: [number, number], p2: [number, number]): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const mockRouteCoordinates = (start: [number, number], end: [number, number]): [number, number][] => {
  const points: [number, number][] = [];
  const segments = 15;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t
    ]);
  }
  return points;
};

const fetchRouteDetails = async (
  start: [number, number],
  end: [number, number],
  token: string
): Promise<RouteDetails> => {
  const startLngLat = `${start[1]},${start[0]}`;
  const endLngLat = `${end[1]},${end[0]}`;
  
  if (token && token.trim().startsWith("pk.")) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLngLat};${endLngLat}?access_token=${token}&geometries=geojson&overview=full`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distanceKm = route.distance / 1000;
          const coordinates = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          return { distanceKm, coordinates };
        }
      }
    } catch (err) {
      console.warn("Failed to fetch route from Mapbox Directions:", err);
    }
  }
  
  const distanceKm = calculateHaversineDistance(start, end);
  const coordinates = mockRouteCoordinates(start, end);
  return { distanceKm, coordinates };
};

const calculateShippingCost = (distance: number, tarifas: TarifaItem[]): number => {
  if (!tarifas || tarifas.length === 0) return 0;
  
  const regularRates = tarifas.filter(t => !t.km_extra);
  const matchingRate = regularRates.find(t => {
    const min = t.min_km ?? 0;
    const max = t.max_km ?? Infinity;
    return distance >= min && distance <= max;
  });
  
  if (matchingRate && matchingRate.precio !== undefined) {
    return matchingRate.precio;
  }
  
  const extraRate = tarifas.find(t => t.km_extra);
  const extraPricePerKm = extraRate?.precio_por_km ?? 10;
  
  if (regularRates.length > 0) {
    const sortedRates = [...regularRates].sort((a, b) => (b.max_km ?? 0) - (a.max_km ?? 0));
    const maxLimitRate = sortedRates[0];
    const maxLimitKm = maxLimitRate.max_km ?? 0;
    const basePrice = maxLimitRate.precio ?? 0;
    
    if (distance > maxLimitKm) {
      const extraDistance = distance - maxLimitKm;
      return basePrice + (extraDistance * extraPricePerKm);
    }
  }
  
  return distance * extraPricePerKm;
};

interface WelcomeEmailParams {
  name: string;
  email: string;
  role: string;
  password?: string;
  companyName?: string;
  shift?: string;
  phone?: string;
}

const sendWelcomeEmail = async (params: WelcomeEmailParams) => {
  try {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://reparto.mx";
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Reparto</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0b0f19;
      color: #f3f4f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.05em;
    }
    .content {
      padding: 40px 30px;
    }
    .welcome-text {
      font-size: 16px;
      line-height: 1.6;
      color: #e5e7eb;
      margin-bottom: 24px;
    }
    .card {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .card-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
      margin-top: 0;
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #374151;
      padding: 8px 0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #9ca3af;
      font-size: 13px;
    }
    .info-value {
      color: #f3f4f6;
      font-weight: 500;
      font-size: 13px;
    }
    .credentials {
      background: rgba(249, 115, 22, 0.06);
      border: 1px dashed rgba(249, 115, 22, 0.25);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .credential-row {
      margin-bottom: 8px;
    }
    .credential-row:last-child {
      margin-bottom: 0;
    }
    .credential-label {
      color: #f97316;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .credential-value {
      font-family: monospace;
      font-size: 14px;
      color: #ffffff;
      background: #0b0f19;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }
    .btn-container {
      text-align: center;
      margin-top: 30px;
    }
    .btn {
      background-color: #f97316;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      display: inline-block;
    }
    .footer {
      background: #0b0f19;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #1f2937;
      font-size: 11px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Tortas Purísima - Reparto</h1>
    </div>
    <div class="content">
      <div class="welcome-text">
        Hola <strong>${params.name}</strong>,<br><br>
        Te damos la bienvenida al equipo. Has sido dado de alta exitosamente en la plataforma de control de reparto de Tortas Purísima.
      </div>
      <div class="card">
        <h3 class="card-title">Detalles del Perfil</h3>
        <div class="info-row">
          <span class="info-label">Rol Asignado:</span>
          <span class="info-value">${params.role}</span>
        </div>
        ${params.companyName ? `
        <div class="info-row">
          <span class="info-label">Empresa:</span>
          <span class="info-value">${params.companyName}</span>
        </div>
        ` : ''}
        ${params.shift ? `
        <div class="info-row">
          <span class="info-label">Turno:</span>
          <span class="info-value">${params.shift}</span>
        </div>
        ` : ''}
        ${params.phone ? `
        <div class="info-row">
          <span class="info-label">Teléfono:</span>
          <span class="info-value">${params.phone}</span>
        </div>
        ` : ''}
      </div>
      
      ${params.password ? `
      <div class="credentials">
        <h3 class="card-title" style="color: #f97316; margin-bottom: 12px; font-size: 13px;">Credenciales de Acceso</h3>
        <div class="credential-row">
          <div class="credential-label">Correo Electrónico</div>
          <div class="credential-value">${params.email}</div>
        </div>
        <div class="credential-row" style="margin-top: 12px;">
          <div class="credential-label">Contraseña Temporal</div>
          <div class="credential-value">${params.password}</div>
        </div>
      </div>

      <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-bottom: 24px;">
        * Por razones de seguridad, te sugerimos cambiar tu contraseña una vez que ingreses al sistema por primera vez.
      </p>
      ` : ''}

      <div class="btn-container">
        <a href="${appUrl}" class="btn" style="color: #ffffff;">Acceder al Panel</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Tortas Purísima. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
    `;

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: params.email,
        subject: params.role === "SuperAdmin" || params.role === "Super Administrador" 
          ? "¡Bienvenido! Has sido registrado como Super Administrador"
          : "¡Bienvenido al equipo! Has sido registrado en Tortas Purísima",
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Failed to send welcome email:", errorData.error);
    } else {
      console.log("Welcome email sent successfully to:", params.email);
    }
  } catch (err) {
    console.error("Error sending welcome email request:", err);
  }
};

export default function Dashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // State Context
  const { 
    drivers, 
    deliveries, 
    personnel, 
    settings, 
    setMapboxToken, 
    addDelivery, 
    assignDelivery, 
    addDriver, 
    removeDriver, 
    toggleDriverStatus, 
    triggerDriverIncident, 
    addPersonnel, 
    removePersonnel,
    updatePersonnel,
    products,
    branches,
    orders,
    addOrder,
    updateOrderStatus,
    updateOrderDriver,
    removeOrder,
    addProduct,
    removeProduct,
    updateProduct,
    addBranch,
    updateBranch,
    removeBranch,
    currentCompanyId
  } = useDashboard();

  // Selected Order for map highlighting
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "transit" | "delivered">("all");

  // Form states
  const [newOrderCustomer, setNewOrderCustomer] = useState("");
  const [newOrderAddress, setNewOrderAddress] = useState("");
  const [newOrderItems, setNewOrderItems] = useState("");
  const [newOrderZone, setNewOrderZone] = useState("Roma");

  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverVehicle, setNewDriverVehicle] = useState<"Motocicleta" | "Bicicleta" | "Automóvil" | "Van">("Motocicleta");
  const [newDriverModel, setNewDriverModel] = useState("");
  const [newDriverPlates, setNewDriverPlates] = useState("");
  const [newDriverBranches, setNewDriverBranches] = useState<string[]>([]);
  const [newDriverPhotos, setNewDriverPhotos] = useState<string[]>([]);
  const [newDriverPhotoFiles, setNewDriverPhotoFiles] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<string | null>(null);

  // New Orders form states
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderBranchId, setOrderBranchId] = useState("");
  const [orderZone, setOrderZone] = useState("Roma");
  const [orderSelectedProducts, setOrderSelectedProducts] = useState<{ id: string; name: string; quantity: number; price: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProductQty, setSelectedProductQty] = useState(1);
  const [orderTipoEntrega, setOrderTipoEntrega] = useState<'a_domicilio' | 'para_llevar' | 'para_comer_aqui'>("a_domicilio");
  const [orderRepartidorId, setOrderRepartidorId] = useState("");
  const addressSelectedFromListRef = useRef(false);
  const newBranchAddressSelectedFromListRef = useRef(false);
  const editBranchAddressSelectedFromListRef = useRef(false);
  const [ordersSubTab, setOrdersSubTab] = useState<"pos" | "monitor">("pos");
  const [posSubTab, setPosSubTab] = useState<"menu" | "checkout">("menu");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState("Todos");

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<string>("Dispatcher");
  const [newStaffShift, setNewStaffShift] = useState<"Matutino" | "Vespertino" | "Nocturno">("Matutino");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffCompanyId, setNewStaffCompanyId] = useState("");
  const [newStaffPhoto, setNewStaffPhoto] = useState("");
  const [newStaffPhotoFile, setNewStaffPhotoFile] = useState<File | null>(null);

  const [staffError, setStaffError] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [staffIsLoading, setStaffIsLoading] = useState(false);
  const [newStaffBranches, setNewStaffBranches] = useState<string[]>([]);
  const [newStaffVehicle, setNewStaffVehicle] = useState<"Motocicleta" | "Bicicleta" | "Automóvil" | "Van">("Motocicleta");
  const [newStaffVehicleModel, setNewStaffVehicleModel] = useState("");
  const [newStaffVehiclePlates, setNewStaffVehiclePlates] = useState("");
  const [newStaffVehiclePhotoFiles, setNewStaffVehiclePhotoFiles] = useState<File[]>([]);
  const [newStaffVehiclePhotoPreviews, setNewStaffVehiclePhotoPreviews] = useState<string[]>([]);
  const [staffUploadingVehiclePhotos, setStaffUploadingVehiclePhotos] = useState(false);

  // SuperAdmin screen fields
  const [newSaName, setNewSaName] = useState("");
  const [newSaEmail, setNewSaEmail] = useState("");
  const [newSaPassword, setNewSaPassword] = useState("");
  const [newSaPhone, setNewSaPhone] = useState("");
  const [newSaPhoto, setNewSaPhoto] = useState("");
  const [newSaPhotoFile, setNewSaPhotoFile] = useState<File | null>(null);
  const [saError, setSaError] = useState("");
  const [saMessage, setSaMessage] = useState("");
  const [saIsLoading, setSaIsLoading] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<Staff[]>([]);

  // Broker creation states
  const [newBrokerName, setNewBrokerName] = useState("");
  const [newBrokerEmail, setNewBrokerEmail] = useState("");
  const [newBrokerPhone, setNewBrokerPhone] = useState("");
  const [newBrokerPassword, setNewBrokerPassword] = useState("");
  const [newBrokerCompanies, setNewBrokerCompanies] = useState<string[]>([]);
  const [brokerIsLoading, setBrokerIsLoading] = useState(false);
  const [brokerError, setBrokerError] = useState("");
  const [brokerMessage, setBrokerMessage] = useState("");
  const [brokersList, setBrokersList] = useState<any[]>([]);
  const [editingBroker, setEditingBroker] = useState<any | null>(null);
  const [editBrokerStatus, setEditBrokerStatus] = useState<string>("active");

  // Repartidores (Direct Supabase CRUD on table 'repartidores')
  const [isRepartidorModalOpen, setIsRepartidorModalOpen] = useState(false);
  const [editingRepartidor, setEditingRepartidor] = useState<any | null>(null);
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [repPassword, setRepPassword] = useState("");
  const [showRepPassword, setShowRepPassword] = useState(false);
  const [repBrokerId, setRepBrokerId] = useState("");
  const [repDriverPhotos, setRepDriverPhotos] = useState<string[]>([]);
  const [repVehiclePhotos, setRepVehiclePhotos] = useState<string[]>([]);
  const [repDriverPhotoFiles, setRepDriverPhotoFiles] = useState<File[]>([]);
  const [repVehiclePhotoFiles, setRepVehiclePhotoFiles] = useState<File[]>([]);
  const [repDriverPhotoPreviews, setRepDriverPhotoPreviews] = useState<string[]>([]);
  const [repVehiclePhotoPreviews, setRepVehiclePhotoPreviews] = useState<string[]>([]);
  const [repIsLoading, setRepIsLoading] = useState(false);
  const [repError, setRepError] = useState("");
  const [repSuccess, setRepSuccess] = useState("");
  const [viewingRepartidorGallery, setViewingRepartidorGallery] = useState<any | null>(null);

  // Sucursales & Tarifas (Broker Management on 'Sucursales' table)
  const [brokerSucursalesList, setBrokerSucursalesList] = useState<any[]>([]);
  const [editingSucursal, setEditingSucursal] = useState<any | null>(null);
  const [sucursalModalOpen, setSucursalModalOpen] = useState(false);
  const [sucursalFormDireccion, setSucursalFormDireccion] = useState("");
  const [sucursalFormLatitud, setSucursalFormLatitud] = useState<string>("");
  const [sucursalFormLongitud, setSucursalFormLongitud] = useState<string>("");
  const [sucursalFormLinkGoogleMaps, setSucursalFormLinkGoogleMaps] = useState("");
  const [sucursalFormFotos, setSucursalFormFotos] = useState<string[]>([]);
  const [sucursalFormPhotoFiles, setSucursalFormPhotoFiles] = useState<File[]>([]);
  const [sucursalFormPhotoPreviews, setSucursalFormPhotoPreviews] = useState<string[]>([]);
  const [sucursalFormTarifas, setSucursalFormTarifas] = useState<{ min_km: number; max_km: number; precio: number }[]>([]);
  const [sucursalKmExtraEnabled, setSucursalKmExtraEnabled] = useState(false);
  const [sucursalKmExtraPrecio, setSucursalKmExtraPrecio] = useState(10);
  const [sucursalIsLoading, setSucursalIsLoading] = useState(false);
  const [sucursalError, setSucursalError] = useState("");
  const [sucursalSuccess, setSucursalSuccess] = useState("");
  const [sucursalShowRawJson, setSucursalShowRawJson] = useState(false);
  const [sucursalRawJsonText, setSucursalRawJsonText] = useState("");

  // Broker Fleet & Deliveries states
  const [saDriversList, setSaDriversList] = useState<any[]>([]);
  const [saDeliveriesList, setSaDeliveriesList] = useState<any[]>([]);
  const [saLoadingEarnings, setSaLoadingEarnings] = useState(false);
  const [selectedDriverForDeliveries, setSelectedDriverForDeliveries] = useState<any | null>(null);

  // Broker Order History states
  const [orderHistorySearch, setOrderHistorySearch] = useState("");
  const [orderHistoryStatusFilter, setOrderHistoryStatusFilter] = useState("all");
  const [orderHistoryDriverFilter, setOrderHistoryDriverFilter] = useState("all");
  const [selectedOrderHistoryDetail, setSelectedOrderHistoryDetail] = useState<any | null>(null);

  // Broker Sucursales states
  const [brokerSucursalSearch, setBrokerSucursalSearch] = useState("");
  const [brokerSucursalCompanyFilter, setBrokerSucursalCompanyFilter] = useState("all");



  // Staff edit modal states
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Mapbox Autocomplete suggestions states
  const [orderLat, setOrderLat] = useState<number | null>(null);
  const [orderLng, setOrderLng] = useState<number | null>(null);
  const [orderShippingCost, setOrderShippingCost] = useState<number>(0);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const calculatedOrderTotal = orderSelectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const finalOrderTotal = calculatedOrderTotal + (orderTipoEntrega === "a_domicilio" ? orderShippingCost : 0);

  // Mapbox Autocomplete suggestions states (Branches)
  const [newBranchLat, setNewBranchLat] = useState<number | null>(null);
  const [newBranchLng, setNewBranchLng] = useState<number | null>(null);
  const [newBranchSuggestions, setNewBranchSuggestions] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [showNewBranchSuggestions, setShowNewBranchSuggestions] = useState(false);
  const [isLoadingNewBranchSuggestions, setIsLoadingNewBranchSuggestions] = useState(false);

  const [editBranchLat, setEditBranchLat] = useState<number | null>(null);
  const [editBranchLng, setEditBranchLng] = useState<number | null>(null);
  const [editBranchSuggestions, setEditBranchSuggestions] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [showEditBranchSuggestions, setShowEditBranchSuggestions] = useState(false);
  const [isLoadingEditBranchSuggestions, setIsLoadingEditBranchSuggestions] = useState(false);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("Dispatcher");
  const [editStaffShift, setEditStaffShift] = useState<"Matutino" | "Vespertino" | "Nocturno">("Matutino");
  const [editStaffBranches, setEditStaffBranches] = useState<string[]>([]);
  const [editStaffStatus, setEditStaffStatus] = useState<"active" | "inactive">("active");
  const [editStaffVehicle, setEditStaffVehicle] = useState<"Motocicleta" | "Bicicleta" | "Automóvil" | "Van">("Motocicleta");
  const [editStaffVehicleModel, setEditStaffVehicleModel] = useState("");
  const [editStaffVehiclePlates, setEditStaffVehiclePlates] = useState("");

  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Comida");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductBranches, setNewProductBranches] = useState<string[]>([]);
  const [hasInitializedBranches, setHasInitializedBranches] = useState(false);
  const [newProductPhotoFiles, setNewProductPhotoFiles] = useState<File[]>([]);
  const [newProductPhotoPreviews, setNewProductPhotoPreviews] = useState<string[]>([]);
  const [productUploadingPhotos, setProductUploadingPhotos] = useState(false);

  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchMapLink, setNewBranchMapLink] = useState("");
  const [newBranchPhone, setNewBranchPhone] = useState("");
  const [newBranchPhones, setNewBranchPhones] = useState<string[]>([""]);
  const [newBranchPhotoFiles, setNewBranchPhotoFiles] = useState<File[]>([]);
  const [newBranchPhotoPreviews, setNewBranchPhotoPreviews] = useState<string[]>([]);
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<Branch | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [branchUploadingPhotos, setBranchUploadingPhotos] = useState(false);

  // Branch rates configuration state (Creation)
  const [newBranchRates, setNewBranchRates] = useState<TarifaItem[]>([
    { min_km: 0, max_km: 3, precio: 40 }
  ]);
  const [newBranchExtraKmPrice, setNewBranchExtraKmPrice] = useState<string>("10");

  // Branch editing state (in Details Modal)
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchMapLink, setEditBranchMapLink] = useState("");
  const [editBranchPhones, setEditBranchPhones] = useState<string[]>([""]);
  const [editBranchRates, setEditBranchRates] = useState<TarifaItem[]>([]);
  const [editBranchExtraKmPrice, setEditBranchExtraKmPrice] = useState("");
  const [editBranchStatus, setEditBranchStatus] = useState<"active" | "inactive">("active");

  const [localMapboxToken, setLocalMapboxToken] = useState(settings.mapboxToken);

  // Platform visits state
  const [platformVisits, setPlatformVisits] = useState<number>(0);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedVisits = localStorage.getItem("reparto_platform_visits");
      const currentVisits = savedVisits ? parseInt(savedVisits, 10) : 1248;
      // Increment visits on mount
      const newVisits = currentVisits + 1;
      localStorage.setItem("reparto_platform_visits", newVisits.toString());
      setPlatformVisits(newVisits);
    }
  }, []);

  // Admin and SuperAdmin states
  const [isAdmin, setIsAdmin] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState("Administrador");
  const isBroker = userRole?.toLowerCase().includes("broker");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [brokerSearch, setBrokerSearch] = useState("");
  const [brokerTimeframe, setBrokerTimeframe] = useState<"day" | "week" | "month" | "year">("month");
  const [brokerViewMode, setBrokerViewMode] = useState<"drivers" | "deliveries">("drivers");
  const [superAdminCompanies, setSuperAdminCompanies] = useState<any[]>([]);
  
  // Special Create Company Screen fields
  const [newCompId, setNewCompId] = useState("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompOwner, setNewCompOwner] = useState("");
  const [newCompEmail, setNewCompEmail] = useState("");
  const [newCompPassword, setNewCompPassword] = useState("");
  const [newCompUsers, setNewCompUsers] = useState<{ id?: string; email: string; password?: string; name?: string }[]>([
    { email: "", password: "", name: "" }
  ]);

  const handleAddCompUser = () => {
    if (newCompUsers.length < 3) {
      setNewCompUsers(prev => [...prev, { email: "", password: "", name: "" }]);
    }
  };

  const handleRemoveCompUser = (idx: number) => {
    if (newCompUsers.length > 1) {
      setNewCompUsers(prev => {
        const filtered = prev.filter((_, i) => i !== idx);
        if (filtered[0]?.email) {
          setNewCompEmail(filtered[0].email);
        }
        return filtered;
      });
    }
  };

  const handleUpdateCompUser = (idx: number, field: string, val: string) => {
    setNewCompUsers(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
    if (idx === 0 && field === "email") {
      setNewCompEmail(val);
    }
  };
  const [newCompUrl, setNewCompUrl] = useState("");
  const [newCompLogoPreview, setNewCompLogoPreview] = useState("");
  const [newCompLogoFile, setNewCompLogoFile] = useState<File | null>(null);
  const [newCompPhones, setNewCompPhones] = useState<string[]>([""]);
  const [newCompDesc, setNewCompDesc] = useState("");
  const [newCompAddress, setNewCompAddress] = useState("");
  const [compIsLoading, setCompIsLoading] = useState(false);
  const [compError, setCompError] = useState("");
  const [compMessage, setCompMessage] = useState("");
  const [editingCompany, setEditingCompany] = useState<any | null>(null);

  // Payment Gateway Configuration States
  const [payMpPublicKeyTest, setPayMpPublicKeyTest] = useState("");
  const [payMpAccessTokenTest, setPayMpAccessTokenTest] = useState("");
  const [payMpPublicKeyProd, setPayMpPublicKeyProd] = useState("");
  const [payMpAccessTokenProd, setPayMpAccessTokenProd] = useState("");
  const [payClipApiKeyTest, setPayClipApiKeyTest] = useState("");
  const [payClipApiKeyProd, setPayClipApiKeyProd] = useState("");
  const [paymentMode, setPaymentMode] = useState<"test" | "production">("test");
  const [payIsLoading, setPayIsLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [payMessage, setPayMessage] = useState("");
  const [payShowMpPublicKeyTest, setPayShowMpPublicKeyTest] = useState(false);
  const [payShowMpAccessTokenTest, setPayShowMpAccessTokenTest] = useState(false);
  const [payShowMpPublicKeyProd, setPayShowMpPublicKeyProd] = useState(false);
  const [payShowMpAccessTokenProd, setPayShowMpAccessTokenProd] = useState(false);
  const [payShowClipApiKeyTest, setPayShowClipApiKeyTest] = useState(false);
  const [payShowClipApiKeyProd, setPayShowClipApiKeyProd] = useState(false);
  const [payConfigLoaded, setPayConfigLoaded] = useState(false);

  // Web Customization (personalizacion_web) States
  const [webRowId, setWebRowId] = useState<number | null>(null);
  const [webLogo, setWebLogo] = useState("");
  const [webPortada, setWebPortada] = useState("");
  const [webGaleria, setWebGaleria] = useState<string[]>([]);
  const [webColorTexto, setWebColorTexto] = useState("#0f172a");
  const [webColorTitulos, setWebColorTitulos] = useState("#F7340C");
  const [webColorFondo, setWebColorFondo] = useState("#ffffff");
  const [webNumeroWhatsapp, setWebNumeroWhatsapp] = useState<string>("");
  const [webCorreoGeneral, setWebCorreoGeneral] = useState("");
  const [webInstagram, setWebInstagram] = useState("");
  const [webFacebook, setWebFacebook] = useState("");
  const [webTiktok, setWebTiktok] = useState("");
  const [webMetaTitulo, setWebMetaTitulo] = useState("");
  const [webMetaDescripcion, setWebMetaDescripcion] = useState("");
  const [webOrdenWeb, setWebOrdenWeb] = useState<string[]>([
    "hero",
    "sucursales",
    "productos",
    "galeria",
    "contacto"
  ]);
  const [webSucursalesActivas, setWebSucursalesActivas] = useState<string[]>([]);
  const [webConfigLoaded, setWebConfigLoaded] = useState(false);
  const [webIsLoading, setWebIsLoading] = useState(false);
  const [webIsSaving, setWebIsSaving] = useState(false);
  const [webError, setWebError] = useState("");
  const [webMessage, setWebMessage] = useState("");
  const [webLogoUploading, setWebLogoUploading] = useState(false);
  const [webPortadaUploading, setWebPortadaUploading] = useState(false);
  const [webGaleriaUploading, setWebGaleriaUploading] = useState(false);

  // CDMX Predefined coordinates zones for simple ordering
  const ZONES_COORDS: { [key: string]: [number, number] } = {
    Roma: [19.4172, -99.1601],
    Condesa: [19.4124, -99.1704],
    Polanco: [19.4326, -99.2001],
    Centro: [19.4326, -99.1332],
    Juárez: [19.4270, -99.1620]
  };

  // Fetch companies for SuperAdmin select list
  const fetchSaCompanies = async () => {
    let dbCompanies: any[] = [];
    try {
      const { data, error } = await supabase
        .from("Empresa")
        .select("*");
      if (!error && data) {
        dbCompanies = data.map(item => ({
          ...item,
          Nombre_Empresa: item.NombreEmpresa || item.Nombre_Empresa || "",
          foto_empresa: item.logoEmpresa || item.foto_empresa || "",
          NombreEmpresa: item.NombreEmpresa || item.Nombre_Empresa || "",
          logoEmpresa: item.logoEmpresa || item.foto_empresa || "",
          PropietarioEmpresa: item.PropietarioEmpresa || item.PropietarioEmpres || "",
          TelefonosEmpresa: item.TelefonosEmpresa || []
        }));
      }
    } catch (err) {
      console.warn("Offline or missing Empresa table:", err);
    }

    try {
      const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
      const mockFallback = [
        { 
          idEmpresa: "emp-mock-1", 
          NombreEmpresa: "Reparto Express Local", 
          Nombre_Empresa: "Reparto Express Local",
          logoEmpresa: "https://images.unsplash.com/photo-1526367790999-015078648c7e?w=120&auto=format&fit=crop",
          foto_empresa: "https://images.unsplash.com/photo-1526367790999-015078648c7e?w=120&auto=format&fit=crop",
          PropietarioEmpresa: "Juan Gabriel",
          mailEmpresa: "contacto@expresslocal.com",
          urlEmpresaUnico: "reparto-express-local",
          TelefonosEmpresa: ["5512345678", "5587654321"]
        },
        { 
          idEmpresa: "emp-mock-2", 
          NombreEmpresa: "Fast Food CDMX Delivery", 
          Nombre_Empresa: "Fast Food CDMX Delivery",
          logoEmpresa: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120&auto=format&fit=crop",
          foto_empresa: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=120&auto=format&fit=crop",
          PropietarioEmpresa: "Sofía Ruiz",
          mailEmpresa: "info@fastfoodcdmx.com",
          urlEmpresaUnico: "fast-food-cdmx",
          TelefonosEmpresa: ["5599887766"]
        },
        { 
          idEmpresa: "emp-mock-3", 
          NombreEmpresa: "Logística Nacional S.A.", 
          Nombre_Empresa: "Logística Nacional S.A.",
          logoEmpresa: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop",
          foto_empresa: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120&auto=format&fit=crop",
          PropietarioEmpresa: "Carlos Slim",
          mailEmpresa: "corp@logistica.com",
          urlEmpresaUnico: "logistica-nacional",
          TelefonosEmpresa: ["5544332211", "5511223344", "5599008877"]
        }
      ];
      const normalizedLocal = localCompanies.map((item: any) => ({
        ...item,
        Nombre_Empresa: item.NombreEmpresa || item.Nombre_Empresa || "",
        foto_empresa: item.logoEmpresa || item.foto_empresa || "",
        NombreEmpresa: item.NombreEmpresa || item.Nombre_Empresa || "",
        logoEmpresa: item.logoEmpresa || item.foto_empresa || "",
        PropietarioEmpresa: item.PropietarioEmpresa || item.PropietarioEmpres || "",
        TelefonosEmpresa: item.TelefonosEmpresa || []
      }));
      const merged: any[] = [];
      const seenIds = new Set<string>();
      dbCompanies.forEach((c: any) => {
        if (c.idEmpresa && !seenIds.has(c.idEmpresa)) {
          seenIds.add(c.idEmpresa);
          merged.push(c);
        }
      });
      normalizedLocal.forEach((c: any) => {
        if (c.idEmpresa && !seenIds.has(c.idEmpresa)) {
          seenIds.add(c.idEmpresa);
          merged.push(c);
        }
      });
      const finalCompanies = merged.length > 0 ? merged : mockFallback;
      setSuperAdminCompanies(finalCompanies);
    } catch {
      console.error("Error loading fallback companies");
    }
  };

  // Fetch SuperAdmins from users table where superAdmin = true
  const fetchSuperAdmins = async () => {
    let dbSa: any[] = [];
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("superAdmin", true);
      if (!error && data) {
        dbSa = data;
      } else if (error) {
        console.warn("Error fetching superAdmins from DB:", error.message);
      }
    } catch (err) {
      console.warn("Offline or failed to fetch superAdmins:", err);
    }

    try {
      // Merge with local storage fallback if any local users are superAdmin
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      const localSa = localUsers.filter((u: any) => u.superAdmin === true || u.superAdmin === "true" || u.superAdmin === 1 || u.superAdmin === "1");
      
      const merged: any[] = [];
      const seenIds = new Set<string>();
      
      dbSa.forEach((u: any) => {
        if (u.IDUser && !seenIds.has(u.IDUser)) {
          seenIds.add(u.IDUser);
          merged.push(u);
        }
      });
      
      localSa.forEach((u: any) => {
        if (u.IDUser && !seenIds.has(u.IDUser)) {
          seenIds.add(u.IDUser);
          merged.push(u);
        }
      });
      
      const mappedSa: Staff[] = merged.map((u: any) => ({
        id: u.IDUser,
        name: u.name || "",
        email: u.mail || "",
        role: u.Rol || "Administrador",
        status: u.status || "active",
        phone: u.phone || "",
        foto: u.foto || null,
        sucursales: []
      }));
      
      setSuperAdmins(mappedSa);
    } catch (err) {
      console.error("Error setting superAdmins:", err);
    }
  };

  // Trigger loading companies when personnel or create-company tab is active
  useEffect(() => {
    if (activeTab === "personnel" || activeTab === "create-company") {
      const timer = setTimeout(() => {
        fetchSaCompanies();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Trigger loading superAdmins when super-admins tab is active
  useEffect(() => {
    if (activeTab === "super-admins" && isSuperAdmin) {
      const timer = setTimeout(() => {
        fetchSuperAdmins();
      }, 0);
      return () => clearTimeout(timer);
    } else if (isBroker) {
      fetchBrokerSucursales();
      fetchBrokers();
      fetchSaCompanies();
      fetchSaEarningsData();
    }
  }, [activeTab, isSuperAdmin, isBroker]);

  // Sync currentCompanyId to staff registration company select
  useEffect(() => {
    if (currentCompanyId) {
      const timer = setTimeout(() => {
        setNewStaffCompanyId(currentCompanyId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentCompanyId]);

  // By default, select all branches when creating a new product
  useEffect(() => {
    if (branches.length > 0 && !editingProduct && newProductBranches.length === 0 && !hasInitializedBranches) {
      setNewProductBranches(branches.map(b => b.id));
      setHasInitializedBranches(true);
    }
  }, [branches, editingProduct, hasInitializedBranches, newProductBranches]);

  // Auth protection check & Load superAdmin/admin profile details
  useEffect(() => {
    const checkAuthAndProfile = async () => {
      const isLoggedIn = localStorage.getItem("reparto_logged_in");
      if (isLoggedIn !== "true") {
        router.push("/");
        return;
      }

      // Load from localStorage first as instant fallback
      const profile = localStorage.getItem("reparto_user_profile");
      let isLocalUser = false;
      let parsedProfile: any = null;

      if (profile) {
        try {
          parsedProfile = JSON.parse(profile);
          if (parsedProfile.authProvider === "local") {
            isLocalUser = true;
          }
          const isSuper = parsedProfile.superAdmin === true || parsedProfile.superAdmin === "true" || parsedProfile.superAdmin === 1 || parsedProfile.superAdmin === "1";
          setIsSuperAdmin(isSuper);
          const isAdm = parsedProfile.isAdmin !== false && parsedProfile.isAdmin !== "false" && parsedProfile.isAdmin !== 0 && parsedProfile.isAdmin !== "0";
          setIsAdmin(isAdm);
          if (parsedProfile.role) {
            setUserRole(parsedProfile.role);
          }
          if (parsedProfile.email || parsedProfile.mail) {
            setCurrentUserEmail(parsedProfile.email || parsedProfile.mail);
          }
          if (parsedProfile.name) {
            setCurrentUserName(parsedProfile.name);
          }
        } catch {
          console.error("Error reading profile details from local storage");
        }
      }

      if (isLocalUser) {
        setAuthorized(true);
        return;
      }

      // Fetch fresh value from database to prevent stale state issues and confirm session
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthorized(true);
          if (user.email) {
            setCurrentUserEmail(user.email);
          }
          
          const { data: dbUser, error: dbErr } = await supabase
            .from("users")
            .select("superAdmin, isAdmin, Rol, name, mail")
            .eq("IDUser", user.id)
            .maybeSingle();

          if (dbUser && !dbErr) {
            const isSuper = dbUser.superAdmin === true || dbUser.superAdmin === "true" || dbUser.superAdmin === 1 || dbUser.superAdmin === "1";
            setIsSuperAdmin(isSuper);
            const isAdm = dbUser.isAdmin !== false && dbUser.isAdmin !== "false" && dbUser.isAdmin !== 0 && dbUser.isAdmin !== "0";
            setIsAdmin(isAdm);
            if (dbUser.Rol) {
              setUserRole(dbUser.Rol);
            }
            if (dbUser.name) {
              setCurrentUserName(dbUser.name);
            }
            if (dbUser.mail) {
              setCurrentUserEmail(dbUser.mail);
            }
            
            // Sync back to local storage if changed
            if (parsedProfile) {
              let changed = false;
              if (parsedProfile.superAdmin !== isSuper) {
                parsedProfile.superAdmin = isSuper;
                changed = true;
              }
              if (parsedProfile.isAdmin !== isAdm) {
                parsedProfile.isAdmin = isAdm;
                changed = true;
              }
              if (dbUser.Rol && parsedProfile.role !== dbUser.Rol) {
                parsedProfile.role = dbUser.Rol;
                changed = true;
              }
              if (changed) {
                localStorage.setItem("reparto_user_profile", JSON.stringify(parsedProfile));
              }
            }
          }
        } else {
          // If we had a local profile, allow staying logged in as a fallback
          if (parsedProfile) {
            console.warn("No active Supabase session, but profile exists. Keeping user logged in.");
            setAuthorized(true);
          } else {
            console.warn("No active Supabase session, redirecting to login.");
            localStorage.removeItem("reparto_logged_in");
            localStorage.removeItem("reparto_user_profile");
            router.push("/");
          }
        }
      } catch (err) {
        console.warn("Could not fetch fresh user profile from database:", err);
        // If we have a local fallback profile, still authorize the user
        if (parsedProfile) {
          setAuthorized(true);
        } else {
          localStorage.removeItem("reparto_logged_in");
          localStorage.removeItem("reparto_user_profile");
          router.push("/");
        }
      }
    };

    checkAuthAndProfile();
  }, [router]);

  // Redirect non-admins if they try to access restricted tabs
  useEffect(() => {
    const isRepartidor = !isAdmin || userRole === "Repartidor";
    const restrictedTabs = ["orders", "drivers", "personnel", "products", "branches", "payment-config", "create-company", "super-admins"];
    if (isBroker && (activeTab === "overview" || !["broker-my-earnings", "broker-drivers", "broker-order-history", "broker-companies"].includes(activeTab))) {
      setActiveTab("broker-my-earnings");
    }
    if (isRepartidor && restrictedTabs.includes(activeTab)) {
      setActiveTab("overview");
    }
    // Redirect non-superadmins if they try to access superadmin restricted tabs
    if (!isSuperAdmin && (activeTab === "super-admins" || activeTab === "create-company")) {
      setActiveTab("overview");
    }
  }, [activeTab, isAdmin, userRole, isSuperAdmin]);

  useEffect(() => {
    setTimeout(() => {
      setLocalMapboxToken(settings.mapboxToken);
    }, 0);
  }, [settings.mapboxToken]);

  // Calculate Shipping Cost and Route when branch and destination are set
  useEffect(() => {
    const isDelivery = orderTipoEntrega === "a_domicilio";
    if (!isDelivery || !orderBranchId || orderLat === null || orderLng === null) {
      setOrderShippingCost(0);
      setRouteDistance(null);
      setRouteCoordinates([]);
      return;
    }

    const branch = branches.find(b => b.id === orderBranchId);
    if (!branch || branch.lat === undefined || branch.lat === null || branch.lng === undefined || branch.lng === null) {
      setOrderShippingCost(0);
      setRouteDistance(null);
      setRouteCoordinates([]);
      return;
    }

    const start: [number, number] = [branch.lat, branch.lng];
    const end: [number, number] = [orderLat, orderLng];

    const getRoute = async () => {
      setIsCalculatingRoute(true);
      try {
        const details = await fetchRouteDetails(start, end, settings.mapboxToken);
        setRouteDistance(details.distanceKm);
        setRouteCoordinates(details.coordinates);
        
        // Calculate price based on tabulator
        const cost = calculateShippingCost(details.distanceKm, branch.tarifas || []);
        setOrderShippingCost(cost);
      } catch (err) {
        console.error("Error calculating route details:", err);
      } finally {
        setIsCalculatingRoute(false);
      }
    };

    getRoute();
  }, [orderTipoEntrega, orderBranchId, orderLat, orderLng, branches, settings.mapboxToken]);

  // Fetch Mapbox Geocoding suggestions for checkout address input
  useEffect(() => {
    if (addressSelectedFromListRef.current) {
      setAddressSuggestions([]);
      addressSelectedFromListRef.current = false;
      return;
    }

    if (!orderAddress || orderAddress.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const token = settings.mapboxToken;
      if (!token || !token.trim().startsWith("pk.")) return;

      setIsLoadingSuggestions(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(orderAddress)}.json?access_token=${token}&country=mx&limit=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features) {
            const suggestions = data.features.map((feat: any) => ({
              place_name: feat.place_name,
              center: feat.center // [lng, lat]
            }));
            setAddressSuggestions(suggestions);
            setShowSuggestions(true);
          }
        }
      } catch (err) {
        console.error("Error fetching Mapbox suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [orderAddress, settings.mapboxToken]);

  // Fetch Mapbox Geocoding suggestions for new branch address input
  useEffect(() => {
    if (newBranchAddressSelectedFromListRef.current) {
      setNewBranchSuggestions([]);
      newBranchAddressSelectedFromListRef.current = false;
      return;
    }

    if (!newBranchAddress || newBranchAddress.trim().length < 3) {
      setNewBranchSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const token = settings.mapboxToken;
      if (!token || !token.trim().startsWith("pk.")) return;

      setIsLoadingNewBranchSuggestions(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(newBranchAddress)}.json?access_token=${token}&country=mx&limit=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features) {
            const suggestions = data.features.map((feat: any) => ({
              place_name: feat.place_name,
              center: feat.center // [lng, lat]
            }));
            setNewBranchSuggestions(suggestions);
            setShowNewBranchSuggestions(true);
          }
        }
      } catch (err) {
        console.error("Error fetching Mapbox suggestions for branch:", err);
      } finally {
        setIsLoadingNewBranchSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [newBranchAddress, settings.mapboxToken]);

  // Fetch Mapbox Geocoding suggestions for edit branch address input
  useEffect(() => {
    if (editBranchAddressSelectedFromListRef.current) {
      setEditBranchSuggestions([]);
      editBranchAddressSelectedFromListRef.current = false;
      return;
    }

    if (!editBranchAddress || editBranchAddress.trim().length < 3) {
      setEditBranchSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const token = settings.mapboxToken;
      if (!token || !token.trim().startsWith("pk.")) return;

      setIsLoadingEditBranchSuggestions(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(editBranchAddress)}.json?access_token=${token}&country=mx&limit=5`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.features) {
            const suggestions = data.features.map((feat: any) => ({
              place_name: feat.place_name,
              center: feat.center // [lng, lat]
            }));
            setEditBranchSuggestions(suggestions);
            setShowEditBranchSuggestions(true);
          }
        }
      } catch (err) {
        console.error("Error fetching Mapbox suggestions for edit branch:", err);
      } finally {
        setIsLoadingEditBranchSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [editBranchAddress, settings.mapboxToken]);

  const generateRandomCompanyId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_-";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/\s+/g, '-') // replace spaces with -
      .replace(/[^\w\-]+/g, '') // remove all non-word chars
      .replace(/\-\-+/g, '-') // replace multiple - with single -
      .replace(/^-+/, '') // trim - from start
      .replace(/-+$/, ''); // trim - from end
  };

  useEffect(() => {
    if (activeTab === "create-company" && isSuperAdmin && !newCompId) {
      setNewCompId(generateRandomCompanyId());
    }
  }, [activeTab, isSuperAdmin, newCompId]);

  // Listen to Supabase auth changes to auto-logout on disconnect
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        const profileStr = localStorage.getItem("reparto_user_profile");
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            if (profile.authProvider === "supabase") {
              // Instead of logging out immediately on SIGNED_OUT (which can be caused by transient network
              // failure or session refresh timeouts), we preserve the local session.
              console.warn("Supabase auth SIGNED_OUT event triggered, but preserving local session to prevent disconnection.");
            }
          } catch {}
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Auto-load payment config when tab is active
  useEffect(() => {
    if (activeTab === "payment-config" && !payConfigLoaded) {
      loadPaymentConfig();
    }
  }, [activeTab, payConfigLoaded, currentCompanyId]);

  // Reset payment config loaded state when company changes
  useEffect(() => {
    setPayConfigLoaded(false);
  }, [currentCompanyId]);

  // Auto-load web customization when tab is active
  useEffect(() => {
    if (activeTab === "web-customization" && !webConfigLoaded) {
      loadWebCustomization();
    }
  }, [activeTab, webConfigLoaded, currentCompanyId]);

  // Reset web customization loaded state when company changes
  useEffect(() => {
    setWebConfigLoaded(false);
  }, [currentCompanyId]);

  const handleLogout = async () => {
    localStorage.removeItem("reparto_logged_in");
    localStorage.removeItem("reparto_user_profile");
    await supabase.auth.signOut().catch(() => {});
    router.push("/");
  };

  
  const fetchSaEarningsData = async () => {
    setSaLoadingEarnings(true);
    try {
      // 1. Fetch real deliveries from 'deliveries' table
      const { data: dbDeliveries, error: delivErr } = await supabase
        .from("deliveries")
        .select("*")
        .order("created_at", { ascending: false });

      if (!delivErr && dbDeliveries && dbDeliveries.length > 0) {
        setSaDeliveriesList(dbDeliveries);
      } else {
        if (delivErr) console.warn("Deliveries fetch note:", delivErr.message);
        const { data: dbOrders } = await supabase
          .from("pedidos")
          .select("*")
          .order("created_at", { ascending: false });
        if (dbOrders) {
          setSaDeliveriesList(dbOrders.map((o: any) => ({
            id: o.id || o.IDPedido,
            id_repartidor: o.repartidorId || o.id_repartidor,
            monto_envio: Number(o.shippingCost || o.total || 0),
            status: o.status || "entregado",
            created_at: o.created_at,
            idEmpresa: o.idEmpresa
          })));
        }
      }

      // 2. Fetch all drivers from 'repartidores' table
      const { data: dbDrivers, error: driversErr } = await supabase
        .from("repartidores")
        .select("*")
        .order("created_at", { ascending: false });

      if (!driversErr && dbDrivers) {
        const normalized = dbDrivers.map((d: any) => ({
          ...d,
          id: d.id_repartidor || d.id
        }));
        setSaDriversList(normalized);
      } else if (driversErr) {
        console.warn("Error fetching repartidores table:", driversErr.message);
        setSaDriversList([]);
      }

      // 3. Fetch brokers, companies and sucursales
      await fetchBrokers();
      await fetchSaCompanies();
      await fetchBrokerSucursales();
    } catch (err) {
      console.warn("Error in fetchSaEarningsData:", err);
    } finally {
      setSaLoadingEarnings(false);
    }
  };

  const fetchBrokerSucursales = async () => {
    try {
      const { data, error } = await supabase
        .from("Sucursales")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setBrokerSucursalesList(data);
      }
    } catch (err) {
      console.warn("Error fetching broker sucursales:", err);
    }
  };

  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase.from("brokers").select("*");
      if (!error && data) {
        const brokerIds = data.map((b: any) => b.id);
        const statusMap = new Map();
        if (brokerIds.length > 0) {
          try {
            const { data: usersData } = await supabase
              .from("users")
              .select("IDUser, status")
              .in("IDUser", brokerIds);

            (usersData || []).forEach((u: any) => statusMap.set(u.IDUser, u.status));
          } catch (uErr) {
            console.warn("Could not fetch broker user status:", uErr);
          }
        }

        const merged = data.map((b: any) => ({
          ...b,
          status: b.status || statusMap.get(b.id) || "active"
        }));

        setBrokersList(merged);
      }
    } catch (err) {
      console.warn("Error fetching brokers:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "create-broker" && isSuperAdmin) {
      fetchBrokers();
      fetchSaCompanies();
    }
  }, [activeTab, isSuperAdmin]);

  if (!authorized) {
    return (
      <div style={{
        display: "flex", 
        height: "100vh", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-secondary)"
      }}>
        Cargando Panel de Control...
      </div>
    );
  }

  // Calculation variables
  const activeDrivers = drivers.filter(d => d.status !== "offline").length;
  const transitDeliveries = deliveries.filter(d => d.status === "transit" || d.status === "assigned").length;
  const deliveredDeliveries = deliveries.filter(d => d.status === "delivered").length;
  const batteryAlerts = drivers.filter(d => d.battery < 20).length;
  const totalDeliveries = deliveries.length;
  const completionRate = totalDeliveries > 0 ? Math.round((deliveredDeliveries / totalDeliveries) * 100) : 0;

  const activeStaff = personnel.filter(p => p.status === "active").length;
  const activeMembers = activeDrivers + activeStaff;

  // Add delivery order form handler
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer || !newOrderAddress || !newOrderItems) return;

    // Default to Monterrey center
    const coords = [25.6866, -100.3161];
    // Add tiny randomized offset so markers don't overlap perfectly
    const lat = coords[0] + (Math.random() - 0.5) * 0.005;
    const lng = coords[1] + (Math.random() - 0.5) * 0.005;

    addDelivery({
      customer: newOrderCustomer,
      address: newOrderAddress,
      lat,
      lng,
      items: newOrderItems
    });

    // Reset fields
    setNewOrderCustomer("");
    setNewOrderAddress("");
    setNewOrderItems("");
  };

  // File upload helper for driver photos gallery
  const handleDriverPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (newDriverPhotoFiles.length + files.length > 6) {
      alert("Puedes subir un máximo de 6 fotos.");
      return;
    }

    const updatedFiles = [...newDriverPhotoFiles];
    const updatedUrls = [...newDriverPhotos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updatedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updatedUrls.push(event.target.result as string);
          setNewDriverPhotos([...updatedUrls]);
        }
      };
      reader.readAsDataURL(file);
    }

    setNewDriverPhotoFiles(updatedFiles);
  };

  // Add driver form handler
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone) return;

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    for (const file of newDriverPhotoFiles) {
      try {
        const fileName = `gallery/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          console.warn("Storage gallery upload failed:", uploadErr);
        }
      } catch (err) {
        console.error("Error uploading gallery file:", err);
      }
    }

    addDriver({
      name: newDriverName,
      phone: newDriverPhone,
      vehicle: newDriverVehicle,
      modelo: newDriverModel,
      placas: newDriverPlates,
      sucursales: newDriverBranches,
      fotosVehiculo: uploadedUrls
    });

    setNewDriverName("");
    setNewDriverPhone("");
    setNewDriverVehicle("Motocicleta");
    setNewDriverModel("");
    setNewDriverPlates("");
    setNewDriverBranches([]);
    setNewDriverPhotoFiles([]);
    setNewDriverPhotos([]);
    setUploadingPhotos(false);
  };

  // Create order form handler
  const handleCreateOrderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDelivery = orderTipoEntrega === "a_domicilio";
    const requiredAddress = isDelivery ? orderAddress : (orderAddress || "Consumo en Local");
    
    if (!orderCustomerName || !orderBranchId || orderSelectedProducts.length === 0 || (isDelivery && !orderAddress)) {
      alert("Por favor llena los campos requeridos y agrega al menos un producto.");
      return;
    }

    try {
      await addOrder({
        customerName: orderCustomerName,
        address: requiredAddress,
        phone: orderPhone,
        total: finalOrderTotal,
        idSucursal: orderBranchId,
        products: orderSelectedProducts,
        tipoEntrega: orderTipoEntrega,
        repartidorId: isDelivery && orderRepartidorId ? orderRepartidorId : null,
        lat: isDelivery && orderLat ? orderLat : undefined,
        lng: isDelivery && orderLng ? orderLng : undefined
      } as any);

      alert("¡Orden creada con éxito!");

      setOrderCustomerName("");
      setOrderAddress("");
      setOrderPhone("");
      setOrderBranchId("");
      setOrderSelectedProducts([]);
      setOrderTipoEntrega("a_domicilio");
      setOrderRepartidorId("");
      setOrderLat(null);
      setOrderLng(null);
      setOrderShippingCost(0);
      setRouteDistance(null);
      setRouteCoordinates([]);
      setAddressSuggestions([]);
      setPosSubTab("menu");
    } catch (err: any) {
      alert("Error al crear la orden: " + (err.message || err));
    }
  };

  // Dispatch order to delivery
  const handleDispatchOrder = (order: Order) => {
    const coords = [25.6866, -100.3161]; // Default to Monterrey
    // Use precise coordinates if they were set in the order, otherwise use Monterrey coords fallback
    const lat = order.lat || (coords[0] + (Math.random() - 0.5) * 0.005);
    const lng = order.lng || (coords[1] + (Math.random() - 0.5) * 0.005);

    addDelivery({
      customer: order.customerName,
      address: order.address,
      lat,
      lng,
      driverId: order.repartidorId || null,
      items: order.products.map(p => `${p.quantity}x ${p.name}`).join(', '),
      orderId: order.id
    });

    updateOrderStatus(order.id, 'en_camino');
    alert(`¡Orden despachada! Se ha creado una entrega en la pestaña "Gestionar Órdenes".`);
  };

  // Staff vehicle photo upload (up to 5)
  const handleStaffVehiclePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newStaffVehiclePhotoFiles.length + files.length > 5) {
      alert("Puedes subir un máximo de 5 fotos del vehículo.");
      return;
    }

    const updatedFiles = [...newStaffVehiclePhotoFiles];
    const updatedPreviews = [...newStaffVehiclePhotoPreviews];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updatedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        updatedPreviews.push(event.target?.result as string);
        if (updatedPreviews.length === updatedFiles.length) {
          setNewStaffVehiclePhotoPreviews(updatedPreviews);
        }
      };
      reader.readAsDataURL(file);
    }
    setNewStaffVehiclePhotoFiles(updatedFiles);
  };

  const handleRemoveStaffVehiclePhotoPreview = (index: number) => {
    setNewStaffVehiclePhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    setNewStaffVehiclePhotoPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add personnel form handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim() || !newStaffCompanyId) {
      setStaffError("Por favor, llena los campos obligatorios (*).");
      return;
    }

    setStaffIsLoading(true);
    setStaffError("");
    setStaffMessage("");

    // Upload photo to Supabase general bucket if provided
    let finalPhotoUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop"; // Default placeholder
    if (newStaffPhotoFile) {
      try {
        /* eslint-disable-next-line react-hooks/purity */
        const fileName = `avatars/${Date.now()}_${newStaffPhotoFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, newStaffPhotoFile, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          finalPhotoUrl = urlData.publicUrl;
        } else {
          console.warn("Storage avatar upload failed, using local fallback preview:", uploadErr);
          if (newStaffPhoto) finalPhotoUrl = newStaffPhoto;
        }
      } catch (err) {
        console.warn("Supabase storage error while uploading avatar:", err);
        if (newStaffPhoto) finalPhotoUrl = newStaffPhoto;
      }
    } else if (newStaffPhoto) {
      finalPhotoUrl = newStaffPhoto;
    }

    // Upload vehicle photos if Repartidor
    const uploadedVehicleUrls: string[] = [];
    if (newStaffRole === "Repartidor" && newStaffVehiclePhotoFiles.length > 0) {
      setStaffUploadingVehiclePhotos(true);
      for (const file of newStaffVehiclePhotoFiles) {
        try {
          const fileName = `vehiculos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("general")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false
            });

          if (!uploadErr && uploadData) {
            const { data: urlData } = supabase.storage
              .from("general")
              .getPublicUrl(fileName);
            uploadedVehicleUrls.push(urlData.publicUrl);
          }
        } catch (err) {
          console.error("Error uploading vehicle photo:", err);
        }
      }
      setStaffUploadingVehiclePhotos(false);
    }

    const userId = crypto.randomUUID();

    // 1. Attempt to register in Supabase Auth using a raw HTTP fetch request to avoid library-level session synchronization
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey
        },
        body: JSON.stringify({
          email: newStaffEmail.trim().toLowerCase(),
          password: newStaffPassword
        })
      });

      const resData = await response.json();

      if (!response.ok || resData.error) {
        const errorMsg = resData.msg || resData.message || resData.error?.message || resData.error_description || resData.error || "Unknown error";
        console.warn("Supabase Auth sign up failed, registering locally/public only:", errorMsg);
      } else {
        const finalUserId = resData.id || resData.user?.id;
        if (finalUserId) {
          const cleanedPhone = newStaffPhone.trim().replace(/\D/g, "");
          const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;

          const newUserProfile = {
            IDUser: finalUserId,
            name: newStaffName.trim(),
            mail: newStaffEmail.trim().toLowerCase(),
            isAdmin: newStaffRole === "Repartidor" ? false : true,
            superAdmin: false,
            Rol: newStaffRole,
            phone: phoneVal,
            IDEmpresa: newStaffCompanyId,
            foto: finalPhotoUrl,
            Sucursales: newStaffBranches,
            TipoVehiculo: newStaffRole === "Repartidor" ? newStaffVehicle : null,
            ModeloVehiculo: newStaffRole === "Repartidor" ? newStaffVehicleModel : null,
            Placas: newStaffRole === "Repartidor" ? newStaffVehiclePlates : null,
            FotosDelVehiculo: newStaffRole === "Repartidor" ? uploadedVehicleUrls : []
          };

          const { error: dbErr } = await supabase.from("users").upsert(newUserProfile, { onConflict: "IDUser" });
          if (dbErr) {
            console.warn("Auth registered user but users profile table upsert failed:", dbErr.message);
          }
          
          // Add to local state
          addPersonnel({
            id: finalUserId,
            name: newStaffName.trim(),
            email: newStaffEmail.trim().toLowerCase(),
            role: newStaffRole,
            status: "active",
            shift: newStaffShift,
            phone: phoneVal,
            foto: finalPhotoUrl,
            sucursales: newStaffBranches,
            vehicle: newStaffRole === "Repartidor" ? newStaffVehicle : undefined,
            modelo: newStaffRole === "Repartidor" ? newStaffVehicleModel : undefined,
            placas: newStaffRole === "Repartidor" ? newStaffVehiclePlates : undefined,
            fotosVehiculo: newStaffRole === "Repartidor" ? uploadedVehicleUrls : []
          });

          // Save locally for login checks
          try {
            const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
            localUsers.push({
              ...newUserProfile,
              password: newStaffPassword.trim()
            });
            localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
          } catch (err) {
            console.error("Local storage error:", err);
          }

          const compObj = superAdminCompanies.find(c => c.idEmpresa === newStaffCompanyId);
          const companyName = compObj ? (compObj.Nombre_Empresa || compObj.NombreEmpresa) : undefined;

          sendWelcomeEmail({
            name: newStaffName.trim(),
            email: newStaffEmail.trim().toLowerCase(),
            role: newStaffRole,
            password: newStaffPassword.trim(),
            companyName: companyName,
            shift: newStaffShift,
            phone: newStaffPhone.trim() || undefined
          });

          setStaffMessage("Operador registrado y guardado con éxito.");
          resetStaffForm();
          setStaffIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Database registration failed or offline, falling back to local only registration:", err);
    }

    // 2. Offline / Fallback registration
    const cleanedPhone = newStaffPhone.trim().replace(/\D/g, "");
    const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;
    const localUserObj = {
      IDUser: userId,
      name: newStaffName.trim(),
      mail: newStaffEmail.trim().toLowerCase(),
      isAdmin: newStaffRole === "Repartidor" ? false : true,
      superAdmin: false,
      Rol: newStaffRole,
      phone: phoneVal,
      IDEmpresa: newStaffCompanyId,
      foto: finalPhotoUrl,
      Sucursales: newStaffBranches,
      TipoVehiculo: newStaffRole === "Repartidor" ? newStaffVehicle : null,
      ModeloVehiculo: newStaffRole === "Repartidor" ? newStaffVehicleModel : null,
      Placas: newStaffRole === "Repartidor" ? newStaffVehiclePlates : null,
      FotosDelVehiculo: newStaffRole === "Repartidor" ? uploadedVehicleUrls : []
    };

    try {
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      if (localUsers.some((u: { mail: string }) => u.mail.toLowerCase() === localUserObj.mail.toLowerCase())) {
        setStaffError("Este correo electrónico ya está registrado localmente.");
        setStaffIsLoading(false);
        return;
      }
      localUsers.push({
        ...localUserObj,
        password: newStaffPassword.trim()
      });
      localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
    } catch (err) {
      console.error("Local storage error:", err);
    }

    addPersonnel({
      id: userId,
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      status: "active",
      shift: newStaffShift,
      phone: phoneVal,
      foto: finalPhotoUrl,
      sucursales: newStaffBranches,
      vehicle: newStaffRole === "Repartidor" ? newStaffVehicle : undefined,
      modelo: newStaffRole === "Repartidor" ? newStaffVehicleModel : undefined,
      placas: newStaffRole === "Repartidor" ? newStaffVehiclePlates : undefined,
      fotosVehiculo: newStaffRole === "Repartidor" ? uploadedVehicleUrls : []
    });

    const compObj = superAdminCompanies.find(c => c.idEmpresa === newStaffCompanyId);
    const companyName = compObj ? (compObj.Nombre_Empresa || compObj.NombreEmpresa) : undefined;

    sendWelcomeEmail({
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      role: newStaffRole,
      password: newStaffPassword.trim(),
      companyName: companyName,
      shift: newStaffShift,
      phone: newStaffPhone.trim() || undefined
    });

    setStaffMessage("Operador registrado con éxito en modo local.");
    resetStaffForm();
    setStaffIsLoading(false);
  };

  const resetStaffForm = () => {
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPassword("");
    setNewStaffPhone("");
    setNewStaffPhoto("");
    setNewStaffPhotoFile(null);
    setNewStaffRole("Dispatcher");
    setNewStaffShift("Matutino");
    setNewStaffBranches([]);
    setNewStaffVehicle("Motocicleta");
    setNewStaffVehicleModel("");
    setNewStaffVehiclePlates("");
    setNewStaffVehiclePhotoFiles([]);
    setNewStaffVehiclePhotoPreviews([]);
  };

  // Add SuperAdmin form handler
  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaName.trim() || !newSaEmail.trim() || !newSaPassword.trim()) {
      setSaError("Por favor, llena los campos obligatorios (*).");
      return;
    }

    setSaIsLoading(true);
    setSaError("");
    setSaMessage("");

    // Upload photo to Supabase general bucket if provided
    let finalPhotoUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop"; // Default placeholder
    if (newSaPhotoFile) {
      try {
        const fileName = `avatars/${Date.now()}_${newSaPhotoFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, newSaPhotoFile, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          finalPhotoUrl = urlData.publicUrl;
        } else {
          console.warn("Storage avatar upload failed, using local fallback preview:", uploadErr);
          if (newSaPhoto) finalPhotoUrl = newSaPhoto;
        }
      } catch (err) {
        console.warn("Supabase storage error while uploading avatar:", err);
        if (newSaPhoto) finalPhotoUrl = newSaPhoto;
      }
    } else if (newSaPhoto) {
      finalPhotoUrl = newSaPhoto;
    }

    const userId = crypto.randomUUID();

    // 1. Attempt to register in Supabase Auth using a raw HTTP fetch request to avoid library-level session synchronization
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey
        },
        body: JSON.stringify({
          email: newSaEmail.trim().toLowerCase(),
          password: newSaPassword
        })
      });

      const resData = await response.json();

      if (!response.ok || resData.error) {
        const errorMsg = resData.msg || resData.message || resData.error?.message || resData.error_description || resData.error || "Unknown error";
        console.warn("Supabase Auth sign up failed, registering locally/public only:", errorMsg);
      } else {
        const finalUserId = resData.id || resData.user?.id;
        if (finalUserId) {
          const cleanedPhone = newSaPhone.trim().replace(/\D/g, "");
          const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;

          const newUserProfile = {
            IDUser: finalUserId,
            name: newSaName.trim(),
            mail: newSaEmail.trim().toLowerCase(),
            isAdmin: true,
            superAdmin: true,
            Rol: "Administrador",
            phone: phoneVal,
            IDEmpresa: null,
            foto: finalPhotoUrl,
            Sucursales: [],
            TipoVehiculo: null,
            ModeloVehiculo: null,
            Placas: null,
            FotosDelVehiculo: []
          };

          const { error: dbErr } = await supabase.from("users").upsert(newUserProfile, { onConflict: "IDUser" });
          if (dbErr) {
            console.warn("Auth registered user but users profile table upsert failed:", dbErr.message);
          }
          
          // Save locally for login checks
          try {
            const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
            localUsers.push({
              ...newUserProfile,
              password: newSaPassword.trim()
            });
            localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
          } catch (err) {
            console.error("Local storage error:", err);
          }

          sendWelcomeEmail({
            name: newSaName.trim(),
            email: newSaEmail.trim().toLowerCase(),
            role: "Super Administrador",
            password: newSaPassword.trim(),
            phone: newSaPhone.trim() || undefined
          });

          setSaMessage("Super Administrador registrado y guardado con éxito.");
          resetSaForm();
          fetchSuperAdmins();
          setSaIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Database registration failed or offline, falling back to local only registration:", err);
    }

    // 2. Offline / Fallback registration
    const cleanedPhone = newSaPhone.trim().replace(/\D/g, "");
    const phoneVal = cleanedPhone ? Number(cleanedPhone) : null;
    const localUserObj = {
      IDUser: userId,
      name: newSaName.trim(),
      mail: newSaEmail.trim().toLowerCase(),
      isAdmin: true,
      superAdmin: true,
      Rol: "Administrador",
      phone: phoneVal,
      IDEmpresa: null,
      foto: finalPhotoUrl,
      Sucursales: [],
      TipoVehiculo: null,
      ModeloVehiculo: null,
      Placas: null,
      FotosDelVehiculo: []
    };

    try {
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      if (localUsers.some((u: { mail: string }) => u.mail.toLowerCase() === localUserObj.mail.toLowerCase())) {
        setSaError("Este correo electrónico ya está registrado localmente.");
        setSaIsLoading(false);
        return;
      }
      localUsers.push({
        ...localUserObj,
        password: newSaPassword.trim()
      });
      localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
    } catch (err) {
      console.error("Local storage error:", err);
    }

    sendWelcomeEmail({
      name: newSaName.trim(),
      email: newSaEmail.trim().toLowerCase(),
      role: "Super Administrador",
      password: newSaPassword.trim(),
      phone: newSaPhone.trim() || undefined
    });

    setSaMessage("Super Administrador registrado con éxito en modo local.");
    resetSaForm();
    fetchSuperAdmins();
    setSaIsLoading(false);
  };

  const resetSaForm = () => {
    setNewSaName("");
    setNewSaEmail("");
    setNewSaPassword("");
    setNewSaPhone("");
    setNewSaPhoto("");
    setNewSaPhotoFile(null);
  };

  const handleSaPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewSaPhoto(event.target.result as string);
        setNewSaPhotoFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeSuperAdmin = async (staffId: string) => {
    setSuperAdmins((prev) => prev.filter((stf) => stf.id !== staffId));

    try {
      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      const updatedLocal = localUsers.filter((u: any) => u.IDUser !== staffId);
      localStorage.setItem("reparto_local_users", JSON.stringify(updatedLocal));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    try {
      const { error } = await supabase.from("users").delete().eq("IDUser", staffId);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting superAdmin user in Supabase:", err);
    }
    fetchSuperAdmins();
  };

  const handleStartEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setEditStaffName(staff.name);
    setEditStaffEmail(staff.email);
    setEditStaffPhone(staff.phone ? String(staff.phone) : "");
    setEditStaffRole(staff.role);
    setEditStaffShift(staff.shift || "Matutino");
    setEditStaffBranches(staff.sucursales || []);
    setEditStaffStatus(staff.status || "active");
    setEditStaffVehicle(staff.vehicle || "Motocicleta");
    setEditStaffVehicleModel(staff.modelo || "");
    setEditStaffVehiclePlates(staff.placas || "");
  };

  const handleSaveStaffEdit = () => {
    if (!editingStaff) return;
    const phoneVal = editStaffPhone.trim() ? editStaffPhone.trim() : "";
    const updatedStaff: Staff = {
      ...editingStaff,
      name: editStaffName.trim(),
      email: editStaffEmail.trim().toLowerCase(),
      phone: phoneVal,
      role: editStaffRole,
      shift: editStaffShift,
      sucursales: editStaffBranches,
      status: editStaffStatus,
      vehicle: editStaffRole === "Repartidor" ? editStaffVehicle : undefined,
      modelo: editStaffRole === "Repartidor" ? editStaffVehicleModel.trim() : undefined,
      placas: editStaffRole === "Repartidor" ? editStaffVehiclePlates.trim() : undefined,
    };
    updatePersonnel(updatedStaff);

    // Sync to current user profile if the edited user is the logged in user
    try {
      const profileStr = localStorage.getItem("reparto_user_profile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.email === updatedStaff.email || profile.mail === updatedStaff.email) {
          const updatedProfile = {
            ...profile,
            name: updatedStaff.name,
            email: updatedStaff.email,
            mail: updatedStaff.email,
            role: updatedStaff.role,
            phone: updatedStaff.phone
          };
          localStorage.setItem("reparto_user_profile", JSON.stringify(updatedProfile));
        }
      }
    } catch (e) {
      console.error("Error syncing edited profile to local storage:", e);
    }

    setEditingStaff(null);
  };

  const handleStaffPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewStaffPhoto(event.target?.result as string);
      setNewStaffPhotoFile(file);
      setStaffError("");
    };
    reader.onerror = () => {
      setStaffError("Error al procesar la imagen cargada.");
      setNewStaffPhoto("");
      setNewStaffPhotoFile(null);
    };
    reader.readAsDataURL(file);
  };

  // Product photo upload (up to 8)
  const handleProductPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newProductPhotoFiles.length + files.length > 8) {
      alert("Puedes subir un máximo de 8 fotos por producto.");
      return;
    }

    const updatedFiles = [...newProductPhotoFiles];
    const updatedPreviews = [...newProductPhotoPreviews];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updatedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        updatedPreviews.push(event.target?.result as string);
        if (updatedPreviews.length === updatedFiles.length) {
          setNewProductPhotoPreviews(updatedPreviews);
        }
      };
      reader.readAsDataURL(file);
    }
    setNewProductPhotoFiles(updatedFiles);
  };

  const handleRemoveProductPhotoPreview = (index: number) => {
    setNewProductPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    setNewProductPhotoPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add/Edit product form handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice) return;

    setProductUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    // Keep existing HTTP URLs
    const existingUrls = newProductPhotoPreviews.filter(p => p.startsWith("http"));
    uploadedUrls.push(...existingUrls);

    // Upload new files
    for (const file of newProductPhotoFiles) {
      try {
        const fileName = `productos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          console.warn("Product storage photo upload failed:", uploadErr);
        }
      } catch (err) {
        console.error("Error uploading product photo:", err);
      }
    }

    const productPayload = {
      name: newProductName,
      price: Number(newProductPrice),
      description: newProductDesc,
      category: newProductCategory,
      idSucursales: newProductBranches,
      fotos: uploadedUrls
    };

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...productPayload
      });
      setEditingProduct(null);
    } else {
      addProduct(productPayload);
    }

    setNewProductName("");
    setNewProductPrice("");
    setNewProductDesc("");
    setNewProductCategory("Comida");
    setNewProductBranches(branches.map(b => b.id));
    setNewProductPhotoFiles([]);
    setNewProductPhotoPreviews([]);
    setProductUploadingPhotos(false);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setNewProductName(product.name);
    setNewProductPrice(String(product.price));
    setNewProductDesc(product.description || "");
    setNewProductCategory(product.category || "Comida");
    setNewProductBranches(product.idSucursales || []);
    setNewProductPhotoFiles([]);
    setNewProductPhotoPreviews(product.fotos || []);
  };

  const handleCancelProductEdit = () => {
    setEditingProduct(null);
    setNewProductName("");
    setNewProductPrice("");
    setNewProductDesc("");
    setNewProductCategory("Comida");
    setNewProductBranches(branches.map(b => b.id));
    setNewProductPhotoFiles([]);
    setNewProductPhotoPreviews([]);
  };

  // Add branch phone inputs manipulation
  const handleAddBranchPhoneField = () => {
    setNewBranchPhones((prev) => [...prev, ""]);
  };

  const handleBranchPhoneChange = (index: number, value: string) => {
    const updated = [...newBranchPhones];
    updated[index] = value;
    setNewBranchPhones(updated);
  };

  const handleRemoveBranchPhoneField = (index: number) => {
    if (newBranchPhones.length > 1) {
      setNewBranchPhones((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  // File upload helper for branch photos gallery (maximum 6 photos)
  const handleBranchPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newBranchPhotoFiles.length + files.length > 6) {
      alert("Puedes subir un máximo de 6 fotos por sucursal.");
      return;
    }

    const updatedFiles = [...newBranchPhotoFiles];
    const updatedPreviews = [...newBranchPhotoPreviews];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updatedFiles.push(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updatedPreviews.push(event.target.result as string);
          setNewBranchPhotoPreviews([...updatedPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }
    setNewBranchPhotoFiles(updatedFiles);
  };

  const handleRemoveBranchPhotoPreview = (index: number) => {
    setNewBranchPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
    setNewBranchPhotoPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddBranchRate = () => {
    setNewBranchRates(prev => [...prev, { min_km: undefined, max_km: undefined, precio: undefined }]);
  };
  
  const handleRemoveBranchRate = (index: number) => {
    setNewBranchRates(prev => prev.filter((_, idx) => idx !== index));
  };
  
  const handleBranchRateChange = (index: number, field: keyof TarifaItem, value: any) => {
    const updated = [...newBranchRates];
    updated[index] = {
      ...updated[index],
      [field]: value === "" ? undefined : Number(value)
    };
    setNewBranchRates(updated);
  };

  const handleStartEditBranch = (branch: Branch) => {
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address);
    setEditBranchMapLink(branch.mapLink || "");
    setEditBranchPhones(branch.telefonos && branch.telefonos.length > 0 ? branch.telefonos : [branch.phone].filter(Boolean));
    setEditBranchLat(branch.lat || null);
    setEditBranchLng(branch.lng || null);
    
    // Separate regular rates from extra km rate
    const regularRates = (branch.tarifas || []).filter(t => !t.km_extra);
    const extraRate = (branch.tarifas || []).find(t => t.km_extra);
    
    setEditBranchRates(regularRates.length > 0 ? regularRates : [{ min_km: 0, max_km: 3, precio: 40 }]);
    setEditBranchExtraKmPrice(extraRate?.precio_por_km?.toString() || "10");
    setEditBranchStatus(branch.status);
    setIsEditingBranch(true);
  };

  const handleSaveBranchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchDetail) return;
    
    const validPhones = editBranchPhones.filter(p => p.trim() !== "");
    
    // Combine regular rates and extra rate
    const combinedTarifas: TarifaItem[] = [
      ...editBranchRates.map(r => ({
        min_km: r.min_km,
        max_km: r.max_km,
        precio: r.precio
      })),
      {
        km_extra: true,
        precio_por_km: Number(editBranchExtraKmPrice) || 0
      }
    ];
    
    const updatedBranch: Branch = {
      ...selectedBranchDetail,
      name: editBranchName,
      address: editBranchAddress,
      mapLink: editBranchMapLink.trim(),
      phone: validPhones[0] || "",
      telefonos: validPhones,
      status: editBranchStatus,
      disponibilidad: editBranchStatus === "active",
      tarifas: combinedTarifas,
      lat: editBranchLat !== null ? editBranchLat : selectedBranchDetail.lat,
      lng: editBranchLng !== null ? editBranchLng : selectedBranchDetail.lng
    };
    
    updateBranch(updatedBranch);
    setSelectedBranchDetail(updatedBranch);
    setIsEditingBranch(false);
    setEditBranchLat(null);
    setEditBranchLng(null);
    setEditBranchMapLink("");
  };

  // Add branch form handler
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchAddress) return;

    setBranchUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    // Filter out empty phone strings
    const validPhones = newBranchPhones.filter(p => p.trim() !== "");
    const primaryPhone = validPhones[0] || "";

    // Upload photos to bucket
    for (const file of newBranchPhotoFiles) {
      try {
        const fileName = `sucursales/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        } else {
          console.warn("Branch storage photo upload failed:", uploadErr);
        }
      } catch (err) {
        console.error("Error uploading branch photo:", err);
      }
    }

    // Combine regular rates and extra rate
    const combinedTarifas: TarifaItem[] = [
      ...newBranchRates.map(r => ({
        min_km: r.min_km,
        max_km: r.max_km,
        precio: r.precio
      })),
      {
        km_extra: true,
        precio_por_km: Number(newBranchExtraKmPrice) || 0
      }
    ];

    addBranch({
      name: newBranchName,
      address: newBranchAddress,
      mapLink: newBranchMapLink.trim(),
      phone: primaryPhone,
      status: "active",
      telefonos: validPhones,
      fotos: uploadedUrls,
      disponibilidad: true,
      tarifas: combinedTarifas,
      lat: newBranchLat || undefined,
      lng: newBranchLng || undefined
    });

    setNewBranchName("");
    setNewBranchAddress("");
    setNewBranchMapLink("");
    setNewBranchPhone("");
    setNewBranchPhones([""]);
    setNewBranchLat(null);
    setNewBranchLng(null);
    setNewBranchRates([{ min_km: 0, max_km: 3, precio: 40 }]);
    setNewBranchExtraKmPrice("10");
    setNewBranchPhotoFiles([]);
    setNewBranchPhotoPreviews([]);
    setBranchUploadingPhotos(false);
  };

  // Save Settings handler
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setMapboxToken(localMapboxToken);
    alert("Configuración de Mapbox guardada correctamente.");
  };




  const handleCompLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompError("");
    setCompMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== img.height) {
          setCompError("El logo debe ser una imagen cuadrada (relación de aspecto 1:1).");
          setNewCompLogoPreview("");
          setNewCompLogoFile(null);
          return;
        }
        if (img.width > 1000 || img.height > 1000) {
          setCompError(`El logo excede las dimensiones máximas permitidas (1000x1000 px). Su imagen es de ${img.width}x${img.height} px.`);
          setNewCompLogoPreview("");
          setNewCompLogoFile(null);
          return;
        }
        setNewCompLogoPreview(event.target?.result as string);
        setNewCompLogoFile(file);
      };
      img.onerror = () => {
        setCompError("Error al procesar la imagen cargada.");
        setNewCompLogoPreview("");
        setNewCompLogoFile(null);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setCompError("Error al leer el archivo de la imagen.");
      setNewCompLogoPreview("");
      setNewCompLogoFile(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCompPhone = () => {
    if (newCompPhones.length < 3) {
      setNewCompPhones([...newCompPhones, ""]);
    }
  };

  const handleRemoveCompPhone = (index: number) => {
    if (newCompPhones.length > 1) {
      setNewCompPhones(newCompPhones.filter((_, idx) => idx !== index));
    } else {
      setNewCompPhones([""]);
    }
  };

  const handleCompPhoneChange = (index: number, value: string) => {
    const updated = [...newCompPhones];
    updated[index] = value;
    setNewCompPhones(updated);
  };

  const resetCompanyForm = () => {
    setEditingCompany(null);
    setNewCompId(generateRandomCompanyId());
    setNewCompName("");
    setNewCompOwner("");
    setNewCompEmail("");
    setNewCompPassword("");
    setNewCompUsers([{ email: "", password: "", name: "" }]);
    setNewCompUrl("");
    setNewCompLogoPreview("");
    setNewCompLogoFile(null);
    setNewCompPhones([""]);
    setNewCompDesc("");
    setNewCompAddress("");
    setCompIsLoading(false);
  };

  const handleEditCompanyClick = async (comp: any) => {
    setEditingCompany(comp);
    setCompError("");
    setCompMessage("");
    setNewCompName(comp.NombreEmpresa || comp.Nombre_Empresa || "");
    setNewCompOwner(comp.PropietarioEmpresa || comp.PropietarioEmpres || comp.PropietarioEmpresaNombre || "");
    setNewCompEmail(comp.mailEmpresa || "");
    setNewCompPassword("");
    setNewCompUrl(comp.urlEmpresaUnico || "");
    setNewCompLogoPreview(comp.logoEmpresa || comp.foto_empresa || "");
    setNewCompLogoFile(null);
    setNewCompPhones(comp.TelefonosEmpresa && comp.TelefonosEmpresa.length > 0 ? comp.TelefonosEmpresa : [""]);
    setNewCompDesc(comp.DescripcionEmpresa || "");
    setNewCompAddress(comp.DireccionEmpresa || "");

    // Fetch existing users from 'users' table for this company (up to 3)
    try {
      const { data: dbUsers, error } = await supabase
        .from("users")
        .select("*")
        .eq("IDEmpresa", comp.idEmpresa);

      if (!error && dbUsers && dbUsers.length > 0) {
        // Prioritize admin users
        const adminUsers = dbUsers.filter((u: any) => u.isAdmin || u.Rol === "Administrador");
        const usersToUse = adminUsers.length > 0 ? adminUsers : dbUsers;
        const mappedUsers = usersToUse.slice(0, 3).map((u: any) => ({
          id: u.IDUser,
          email: u.mail || "",
          name: u.name || comp.PropietarioEmpresaNombre || comp.PropietarioEmpresa || "",
          password: ""
        }));
        setNewCompUsers(mappedUsers.length > 0 ? mappedUsers : [{ email: comp.mailEmpresa || "", password: "", name: comp.PropietarioEmpresaNombre || "" }]);
      } else {
        setNewCompUsers([{ email: comp.mailEmpresa || "", password: "", name: comp.PropietarioEmpresaNombre || "" }]);
      }
    } catch {
      setNewCompUsers([{ email: comp.mailEmpresa || "", password: "", name: comp.PropietarioEmpresaNombre || "" }]);
    }
  };

  const handleDeleteCompanyClick = async (idEmpresa: string, name: string) => {
    if (!isSuperAdmin) {
      alert("Acción no autorizada. Solo los SuperAdministradores pueden eliminar empresas.");
      return;
    }

    // Warning 1
    const confirm1 = window.confirm(`[AVISO 1/3] ¿Está seguro de que desea eliminar la empresa "${name}"? Esta acción borrará la empresa.`);
    if (!confirm1) return;

    // Warning 2
    const confirm2 = window.confirm(`[AVISO 2/3] ⚠️ ¡ATENCIÓN CRÍTICA! Al eliminar esta empresa se borrarán de forma PERMANENTE todas sus sucursales, productos, conductores y órdenes de entrega asociados. ¿Está absolutamente seguro de continuar?`);
    if (!confirm2) return;

    // Warning 3
    const confirm3 = window.confirm(`[AVISO 3/3] 🛑 CONFIRMACIÓN FINAL: ¿Confirma la eliminación definitiva de la empresa "${name}" y todos sus datos vinculados? Una vez ejecutado, no se podrá recuperar la información.`);
    if (!confirm3) return;

    setCompIsLoading(true);
    setCompError("");
    setCompMessage("");

    let deletedInDb = false;

    try {
      // 1. Delete associated records in Supabase
      await supabase.from("users").delete().eq("IDEmpresa", idEmpresa);
      await supabase.from("Sucursales").delete().eq("IDEmpresa", idEmpresa);
      await supabase.from("products").delete().eq("idEmpresa", idEmpresa);
      await supabase.from("deliveries").delete().eq("idEmpresa", idEmpresa);
      await supabase.from("ordenes").delete().eq("id_empresa", idEmpresa);
      
      // 2. Delete the company record
      const { error } = await supabase
        .from("Empresa")
        .delete()
        .eq("idEmpresa", idEmpresa);

      if (!error) {
        deletedInDb = true;
      } else {
        console.warn("Database deletion failed:", error.message);
        throw error;
      }
    } catch (err: any) {
      console.warn("Error deleting company in database, removing local fallback only:", err);
    }

    // 3. Delete from localStorage backup
    try {
      const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
      const filteredCompanies = localCompanies.filter((c: any) => c.idEmpresa !== idEmpresa);
      localStorage.setItem("reparto_local_companies", JSON.stringify(filteredCompanies));

      const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
      const filteredUsers = localUsers.filter((u: any) => u.IDEmpresa !== idEmpresa);
      localStorage.setItem("reparto_local_users", JSON.stringify(filteredUsers));
    } catch (e) {
      console.error("Local storage deletion error:", e);
    }

    setCompIsLoading(false);
    setCompMessage(
      deletedInDb
        ? `¡La empresa "${name}" y todos sus datos asociados fueron eliminados con éxito de la base de datos!`
        : `La empresa "${name}" fue eliminada localmente.`
    );

    // If deleting the company we are currently viewing, reset the company ID to default mock company
    const profile = localStorage.getItem("reparto_user_profile");
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        const activeCompanyId = parsed.IDEmpresa || parsed.idEmpresa;
        if (activeCompanyId === idEmpresa) {
          parsed.IDEmpresa = "emp-mock-1";
          parsed.companyName = "Reparto Express Local";
          localStorage.setItem("reparto_user_profile", JSON.stringify(parsed));
          window.location.reload(); // reload to refresh context
          return;
        }
      } catch {}
    }

    fetchSaCompanies();
  };

  const resetBrokerForm = () => {
    setEditingBroker(null);
    setEditBrokerStatus("active");
    setNewBrokerName("");
    setNewBrokerEmail("");
    setNewBrokerPhone("");
    setNewBrokerPassword("");
    setNewBrokerCompanies([]);
    setBrokerError("");
    setBrokerMessage("");
  };

  const handleEditBrokerClick = (broker: any) => {
    setEditingBroker(broker);
    setEditBrokerStatus(broker.status || "active");
    setBrokerError("");
    setBrokerMessage("");
    setNewBrokerName(broker.name || "");
    setNewBrokerEmail(broker.email || "");
    setNewBrokerPhone(broker.phone || "");
    setNewBrokerPassword("");
    setNewBrokerCompanies(broker.empresas_asociadas || []);
  };

  const handleToggleBrokerStatus = async (id: string, name: string, currentStatus: string) => {
    if (!isSuperAdmin) {
      alert("Acción no autorizada. Solo los SuperAdministradores pueden gestionar el estado de los brokers.");
      return;
    }

    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    const isSuspending = newStatus === "suspended";

    const confirm = window.confirm(
      isSuspending
        ? `¿Estás seguro de que deseas suspender al broker "${name}"? El broker quedará inhabilitado temporalmente.`
        : `¿Estás seguro de que deseas reactivar al broker "${name}"? Su cuenta volverá a estar activa.`
    );
    if (!confirm) return;

    setBrokerIsLoading(true);
    setBrokerError("");
    setBrokerMessage("");

    try {
      // 1. Update in users table
      const { error: userErr } = await supabase
        .from("users")
        .update({ status: newStatus })
        .eq("IDUser", id);

      if (userErr) {
        console.warn("Error updating user status:", userErr.message);
      }

      // 2. Try updating in brokers table if column exists
      try {
        await supabase
          .from("brokers")
          .update({ status: newStatus })
          .eq("id", id);
      } catch (err) {
        console.warn("Brokers table might not have status column:", err);
      }

      // 3. Update localStorage fallback
      try {
        const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
        const idx = localUsers.findIndex((u: any) => u.IDUser === id);
        if (idx !== -1) {
          localUsers[idx].status = newStatus;
          localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
        }
      } catch (e) {
        console.warn("Local storage update error:", e);
      }

      // 4. Update local state
      setBrokersList(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
      if (editingBroker?.id === id) {
        setEditingBroker({ ...editingBroker, status: newStatus });
        setEditBrokerStatus(newStatus);
      }

      setBrokerMessage(
        isSuspending
          ? `El broker "${name}" ha sido suspendido.`
          : `El broker "${name}" ha sido reactivado exitosamente.`
      );
    } catch (err: any) {
      console.error("Error al cambiar estado del broker:", err);
      setBrokerError(err.message || "Ocurrió un error al cambiar el estado del broker.");
    } finally {
      setBrokerIsLoading(false);
    }
  };

  const handleDeleteBroker = async (id: string, name: string, email: string) => {
    if (!isSuperAdmin) {
      alert("Acción no autorizada. Solo los SuperAdministradores pueden eliminar brokers.");
      return;
    }

    const confirm = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente al broker "${name || email}"?\n\nEsta acción borrará al broker de la base de datos y revocará sus accesos a la plataforma.`
    );
    if (!confirm) return;

    setBrokerIsLoading(true);
    setBrokerError("");
    setBrokerMessage("");

    try {
      // 1. Eliminar de la tabla brokers
      const { error: brokerDbErr } = await supabase
        .from("brokers")
        .delete()
        .eq("id", id);

      if (brokerDbErr) {
        console.warn("Could not delete from brokers table:", brokerDbErr);
      }

      // 2. Eliminar de la tabla users por IDUser o email
      const { error: userDbErr } = await supabase
        .from("users")
        .delete()
        .or(`IDUser.eq.${id},mail.eq.${(email || "").trim().toLowerCase()}`);

      if (userDbErr) {
        console.warn("Could not delete from users table:", userDbErr);
      }

      // 3. Desvincular repartidores si aplica
      try {
        await supabase
          .from("repartidores")
          .update({ id_broker: null })
          .eq("id_broker", id);
      } catch (rErr) {
        console.warn("Repartidores unbind note:", rErr);
      }

      // 4. Limpiar del fallback local
      try {
        const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
        const filteredUsers = localUsers.filter((u: any) => u.IDUser !== id && u.mail !== email);
        localStorage.setItem("reparto_local_users", JSON.stringify(filteredUsers));
      } catch (e) {
        console.warn("Local storage delete error:", e);
      }

      // 5. Actualizar estado local
      setBrokersList(prev => prev.filter(b => b.id !== id));
      if (editingBroker?.id === id) {
        resetBrokerForm();
      }

      setBrokerMessage(`El broker "${name || email}" ha sido eliminado exitosamente.`);
      fetchBrokers();
    } catch (err: any) {
      console.error("Error deleting broker:", err);
      setBrokerError(err.message || "Error al eliminar el broker.");
    } finally {
      setBrokerIsLoading(false);
    }
  };

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setBrokerError("Acción no autorizada. Solo los SuperAdministradores pueden gestionar brokers.");
      return;
    }

    if (!newBrokerName.trim() || !newBrokerEmail.trim()) {
      setBrokerError("Por favor, llena los campos obligatorios (*).");
      return;
    }

    if (!editingBroker && !newBrokerPassword.trim()) {
      setBrokerError("Por favor, ingresa una contraseña para el broker.");
      return;
    }

    setBrokerIsLoading(true);
    setBrokerError("");
    setBrokerMessage("");

    try {
      if (editingBroker) {
        // --- EDITAR BROKER EXISTENTE ---
        try {
          await supabase
            .from("brokers")
            .update({
              name: newBrokerName.trim(),
              email: newBrokerEmail.trim().toLowerCase(),
              phone: newBrokerPhone.trim(),
              empresas_asociadas: newBrokerCompanies,
              status: editBrokerStatus
            })
            .eq("id", editingBroker.id);
        } catch {
          await supabase
            .from("brokers")
            .update({
              name: newBrokerName.trim(),
              email: newBrokerEmail.trim().toLowerCase(),
              phone: newBrokerPhone.trim(),
              empresas_asociadas: newBrokerCompanies
            })
            .eq("id", editingBroker.id);
        }

        // Actualizar en tabla users
        const { error: userErr } = await supabase
          .from("users")
          .update({
            name: newBrokerName.trim(),
            mail: newBrokerEmail.trim().toLowerCase(),
            IDEmpresa: newBrokerCompanies[0] || null
          })
          .eq("IDUser", editingBroker.id);

        if (userErr) {
          console.warn("User table update note:", userErr.message);
        }

        // Actualizar en fallback local
        try {
          const cleanedPhone = newBrokerPhone.trim().replace(/\D/g, "");
          const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
          const idx = localUsers.findIndex((u: any) => u.IDUser === editingBroker.id);
          if (idx !== -1) {
            localUsers[idx].name = newBrokerName.trim();
            localUsers[idx].mail = newBrokerEmail.trim().toLowerCase();
            localUsers[idx].phone = cleanedPhone ? Number(cleanedPhone) : null;
            localUsers[idx].status = editBrokerStatus;
            if (newBrokerPassword.trim()) {
              localUsers[idx].password = newBrokerPassword.trim();
            }
            localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
          }
        } catch (e) {
          console.warn("Local storage update error:", e);
        }

        setBrokerMessage(`Broker "${newBrokerName.trim()}" actualizado exitosamente.`);
        resetBrokerForm();
        fetchBrokers();
      } else {
        // --- CREAR NUEVO BROKER ---
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        
        let newUserId = crypto.randomUUID();

        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseAnonKey
            },
            body: JSON.stringify({
              email: newBrokerEmail.trim().toLowerCase(),
              password: newBrokerPassword,
              options: {
                data: {
                  name: newBrokerName.trim(),
                  role: "Broker"
                }
              }
            })
          });

          const resData = await response.json();
          if (response.ok && !resData.error && !resData.msg) {
            newUserId = resData?.user?.id || resData?.id || newUserId;
          } else {
            const errorMsg = resData?.error_description || resData?.msg || resData?.message || resData?.error?.message;
            if (errorMsg === "User already registered") {
              throw new Error("El correo electrónico ya se encuentra registrado en la plataforma.");
            } else {
              console.warn("Supabase Auth sign up note:", errorMsg);
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes("ya se encuentra registrado")) {
            throw authErr;
          }
          console.warn("Auth signup fallback, using generated UUID:", authErr);
        }

        // Insert into brokers table
        const { error: brokerErr } = await supabase.from("brokers").insert({
          id: newUserId,
          name: newBrokerName.trim(),
          email: newBrokerEmail.trim().toLowerCase(),
          phone: newBrokerPhone.trim(),
          empresas_asociadas: newBrokerCompanies
        });

        if (brokerErr) throw brokerErr;

        // Insert into users table
        const { error: userErr } = await supabase.from("users").upsert({
          IDUser: newUserId,
          name: newBrokerName.trim(),
          mail: newBrokerEmail.trim().toLowerCase(),
          Rol: "Broker",
          isAdmin: false,
          superAdmin: false,
          IDEmpresa: newBrokerCompanies[0] || null,
          Sucursales: []
        }, { onConflict: "IDUser" });
        
        if (userErr) {
          console.warn("Users table upsert note:", userErr.message);
        }

        // Save locally for fallback login checks
        try {
          const cleanedPhone = newBrokerPhone.trim().replace(/\D/g, "");
          const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
          localUsers.push({
            IDUser: newUserId,
            name: newBrokerName.trim(),
            mail: newBrokerEmail.trim().toLowerCase(),
            Rol: "Broker",
            phone: cleanedPhone ? Number(cleanedPhone) : null,
            status: "active",
            isAdmin: false,
            superAdmin: false,
            password: newBrokerPassword.trim()
          });
          localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
        } catch (e) {
          console.error("Local storage error:", e);
        }

        await sendWelcomeEmail({
          name: newBrokerName,
          email: newBrokerEmail,
          role: "Broker de Repartidores",
          password: newBrokerPassword,
          phone: newBrokerPhone
        });

        setBrokerMessage(`Broker "${newBrokerName.trim()}" registrado exitosamente.`);
        resetBrokerForm();
        fetchBrokers();
      }
    } catch (err: any) {
      console.error(err);
      setBrokerError(err.message || "Ocurrió un error al procesar el Broker.");
    } finally {
      setBrokerIsLoading(false);
    }
  };

  // --- REPARTIDORES CRUD (Direct Supabase 'repartidores' table) ---
  const handleOpenCreateRepartidor = (defaultBrokerId?: string) => {
    setEditingRepartidor(null);
    setRepName("");
    setRepEmail("");
    setRepPhone("");
    setRepPassword("");
    setShowRepPassword(false);
    setRepBrokerId(defaultBrokerId || "");
    setRepDriverPhotos([]);
    setRepVehiclePhotos([]);
    setRepDriverPhotoFiles([]);
    setRepVehiclePhotoFiles([]);
    setRepDriverPhotoPreviews([]);
    setRepVehiclePhotoPreviews([]);
    setRepError("");
    setRepSuccess("");
    setIsRepartidorModalOpen(true);
  };

  const handleOpenEditRepartidor = (rep: any) => {
    setEditingRepartidor(rep);
    setRepName(rep.name || "");
    setRepEmail(rep.email || "");
    setRepPhone(rep.phone || "");
    setRepPassword("");
    setShowRepPassword(false);
    setRepBrokerId(rep.broker_id || "");
    
    // Existing URLs
    const driverUrls: string[] = Array.isArray(rep.driver_photos) ? rep.driver_photos : [];
    const vehicleUrls: string[] = Array.isArray(rep.vehicle_photos) ? rep.vehicle_photos : [];
    setRepDriverPhotos(driverUrls);
    setRepVehiclePhotos(vehicleUrls);
    setRepDriverPhotoPreviews(driverUrls);
    setRepVehiclePhotoPreviews(vehicleUrls);

    setRepDriverPhotoFiles([]);
    setRepVehiclePhotoFiles([]);
    setRepError("");
    setRepSuccess("");
    setIsRepartidorModalOpen(true);
  };

  const handleCloseRepartidorModal = () => {
    setIsRepartidorModalOpen(false);
    setEditingRepartidor(null);
    setRepPassword("");
    setShowRepPassword(false);
    setRepError("");
    setRepSuccess("");
  };

  const handleRepDriverPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: File[] = Array.from(files);
    setRepDriverPhotoFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setRepDriverPhotoPreviews(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveRepDriverPhoto = (index: number) => {
    if (index < repDriverPhotos.length) {
      setRepDriverPhotos(prev => prev.filter((_, idx) => idx !== index));
      setRepDriverPhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    } else {
      const fileIdx = index - repDriverPhotos.length;
      setRepDriverPhotoFiles(prev => prev.filter((_, idx) => idx !== fileIdx));
      setRepDriverPhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleRepVehiclePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: File[] = Array.from(files);
    setRepVehiclePhotoFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setRepVehiclePhotoPreviews(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveRepVehiclePhoto = (index: number) => {
    if (index < repVehiclePhotos.length) {
      setRepVehiclePhotos(prev => prev.filter((_, idx) => idx !== index));
      setRepVehiclePhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    } else {
      const fileIdx = index - repVehiclePhotos.length;
      setRepVehiclePhotoFiles(prev => prev.filter((_, idx) => idx !== fileIdx));
      setRepVehiclePhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleSaveRepartidor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repName.trim() || !repEmail.trim()) {
      setRepError("El nombre y el correo electrónico son obligatorios.");
      return;
    }

    if (!editingRepartidor && (!repPassword || repPassword.length < 6)) {
      setRepError("La contraseña debe tener al menos 6 caracteres para la autenticación del repartidor.");
      return;
    }

    setRepIsLoading(true);
    setRepError("");
    setRepSuccess("");

    try {
      // 1. Upload new driver photos if any
      const uploadedDriverUrls: string[] = [];
      for (const file of repDriverPhotoFiles) {
        try {
          const fileName = `repartidores/driver_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: upErr } = await supabase.storage
            .from("general")
            .upload(fileName, file, { cacheControl: "3600", upsert: false });
          if (!upErr && uploadData) {
            const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
            uploadedDriverUrls.push(urlData.publicUrl);
          } else {
            console.warn("Driver photo upload failed:", upErr);
          }
        } catch (fErr) {
          console.error("Error uploading driver photo file:", fErr);
        }
      }

      // 2. Upload new vehicle photos if any
      const uploadedVehicleUrls: string[] = [];
      for (const file of repVehiclePhotoFiles) {
        try {
          const fileName = `repartidores/vehicle_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: upErr } = await supabase.storage
            .from("general")
            .upload(fileName, file, { cacheControl: "3600", upsert: false });
          if (!upErr && uploadData) {
            const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
            uploadedVehicleUrls.push(urlData.publicUrl);
          } else {
            console.warn("Vehicle photo upload failed:", upErr);
          }
        } catch (fErr) {
          console.error("Error uploading vehicle photo file:", fErr);
        }
      }

      const finalDriverPhotos = [...repDriverPhotos, ...uploadedDriverUrls];
      const finalVehiclePhotos = [...repVehiclePhotos, ...uploadedVehicleUrls];

      const payload = {
        name: repName.trim(),
        email: repEmail.trim().toLowerCase(),
        phone: repPhone.trim() || null,
        broker_id: repBrokerId && repBrokerId.trim() ? repBrokerId.trim() : null,
        driver_photos: finalDriverPhotos,
        vehicle_photos: finalVehiclePhotos,
        reviews: editingRepartidor?.reviews || []
      };

      if (editingRepartidor) {
        const targetId = editingRepartidor.id_repartidor || editingRepartidor.id;
        const { error: updateErr } = await supabase
          .from("repartidores")
          .update(payload)
          .eq("id_repartidor", targetId);

        if (updateErr) throw updateErr;

        // Also update users table
        try {
          await supabase
            .from("users")
            .update({
              name: repName.trim(),
              mail: repEmail.trim().toLowerCase()
            })
            .eq("IDUser", targetId);
        } catch (uErr) {
          console.warn("User update note:", uErr);
        }

        // Update local storage fallback
        try {
          const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
          const idx = localUsers.findIndex((u: any) => u.IDUser === targetId);
          if (idx !== -1) {
            localUsers[idx].name = repName.trim();
            localUsers[idx].mail = repEmail.trim().toLowerCase();
            if (repPhone.trim()) localUsers[idx].phone = Number(repPhone.trim().replace(/\D/g, ""));
            localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
          }
        } catch (lErr) {
          console.warn("Local storage update note:", lErr);
        }

        setRepSuccess(`Repartidor "${repName.trim()}" actualizado exitosamente.`);
      } else {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        let newUserId = crypto.randomUUID();

        // 1. Create authenticated user in Supabase Auth
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseAnonKey
            },
            body: JSON.stringify({
              email: repEmail.trim().toLowerCase(),
              password: repPassword,
              options: {
                data: {
                  name: repName.trim(),
                  role: "Repartidor"
                }
              }
            })
          });

          const resData = await response.json();
          if (response.ok && !resData.error && !resData.msg) {
            newUserId = resData?.user?.id || resData?.id || newUserId;
          } else {
            const errorMsg = resData?.error_description || resData?.msg || resData?.message || resData?.error?.message;
            if (errorMsg === "User already registered") {
              throw new Error("El correo electrónico ya se encuentra registrado en la plataforma como usuario.");
            } else {
              console.warn("Supabase Auth sign up note:", errorMsg);
            }
          }
        } catch (authErr: any) {
          if (authErr.message?.includes("ya se encuentra registrado")) {
            throw authErr;
          }
          console.warn("Auth signup fallback, using generated UUID:", authErr);
        }

        // 2. Insert row in repartidores table with id_repartidor = newUserId
        const repartidorRow = {
          id_repartidor: newUserId,
          ...payload
        };

        const { error: insertErr } = await supabase
          .from("repartidores")
          .insert([repartidorRow]);

        if (insertErr) throw insertErr;

        // 3. Upsert row in users table
        const { error: userErr } = await supabase.from("users").upsert({
          IDUser: newUserId,
          name: repName.trim(),
          mail: repEmail.trim().toLowerCase(),
          Rol: "Repartidor",
          isAdmin: false,
          superAdmin: false,
          IDEmpresa: null,
          Sucursales: []
        }, { onConflict: "IDUser" });

        if (userErr) {
          console.warn("Users table upsert note:", userErr.message);
        }

        // 4. Save to local fallback storage
        try {
          const cleanedPhone = repPhone.trim().replace(/\D/g, "");
          const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
          localUsers.push({
            IDUser: newUserId,
            name: repName.trim(),
            mail: repEmail.trim().toLowerCase(),
            Rol: "Repartidor",
            phone: cleanedPhone ? Number(cleanedPhone) : null,
            status: "active",
            isAdmin: false,
            superAdmin: false,
            password: repPassword.trim()
          });
          localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
        } catch (e) {
          console.error("Local storage error:", e);
        }

        // 5. Send welcome email with login credentials
        try {
          await sendWelcomeEmail({
            name: repName.trim(),
            email: repEmail.trim().toLowerCase(),
            role: "Repartidor",
            password: repPassword,
            phone: repPhone.trim()
          });
        } catch (emailErr) {
          console.warn("Welcome email note:", emailErr);
        }

        setRepSuccess(`Repartidor "${repName.trim()}" registrado exitosamente como usuario autenticado.`);
      }

      // Refresh data
      await fetchSaEarningsData();

      setTimeout(() => {
        setIsRepartidorModalOpen(false);
        setEditingRepartidor(null);
        setRepPassword("");
      }, 700);

    } catch (err: any) {
      console.error("Error saving repartidor:", err);
      setRepError(err.message || "Error al guardar el repartidor.");
    } finally {
      setRepIsLoading(false);
    }
  };

  const handleDeleteRepartidor = async (id: string, name: string) => {
    const confirm = window.confirm(
      `¿Estás seguro de que deseas eliminar permanentemente al repartidor "${name || 'este repartidor'}" de la red?\n\nEsta acción borrará su registro de la tabla 'repartidores' de la base de datos y no se podrá deshacer.`
    );
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from("repartidores")
        .delete()
        .eq("id_repartidor", id);

      if (error) throw error;

      // Also clean up from users table
      try {
        await supabase.from("users").delete().eq("IDUser", id);
      } catch (uErr) {
        console.warn("User deletion note:", uErr);
      }

      // Clean from local storage fallback
      try {
        const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
        const filtered = localUsers.filter((u: any) => u.IDUser !== id);
        localStorage.setItem("reparto_local_users", JSON.stringify(filtered));
      } catch (lErr) {
        console.warn("Local users delete note:", lErr);
      }

      setSaDriversList(prev => prev.filter(d => (d.id_repartidor || d.id) !== id));
      await fetchSaEarningsData();
    } catch (err: any) {
      console.error("Error deleting repartidor:", err);
      alert("Error al eliminar el repartidor: " + (err.message || "Inténtalo de nuevo."));
    }
  };

  // --- SUCURSALES & TARIFAS (Broker Management on 'Sucursales' table) ---
  const handleOpenEditSucursal = (sucursal: any) => {
    setEditingSucursal(sucursal);
    setSucursalFormDireccion(sucursal.DireccionSucursal || "");
    setSucursalFormLatitud(sucursal.Latitud !== null && sucursal.Latitud !== undefined ? String(sucursal.Latitud) : "");
    setSucursalFormLongitud(sucursal.Longitud !== null && sucursal.Longitud !== undefined ? String(sucursal.Longitud) : "");
    setSucursalFormLinkGoogleMaps(sucursal.LinkGoogleMaps || "");

    const existingFotos: string[] = Array.isArray(sucursal.FotosSucursales) 
      ? sucursal.FotosSucursales 
      : (Array.isArray(sucursal.FotosSucursal) ? sucursal.FotosSucursal : []);
    setSucursalFormFotos(existingFotos);
    setSucursalFormPhotoPreviews(existingFotos);
    setSucursalFormPhotoFiles([]);

    let rawTarifas = sucursal.Tarifas;
    if (typeof rawTarifas === "string") {
      try { rawTarifas = JSON.parse(rawTarifas); } catch { rawTarifas = []; }
    }
    if (!Array.isArray(rawTarifas)) rawTarifas = [];

    const ranges: { min_km: number; max_km: number; precio: number }[] = [];
    let hasKmExtra = false;
    let extraPrecio = 10;

    rawTarifas.forEach((item: any) => {
      if (item.km_extra || item.precio_por_km !== undefined) {
        hasKmExtra = true;
        extraPrecio = Number(item.precio_por_km) || 10;
      } else if (item.precio !== undefined) {
        ranges.push({
          min_km: Number(item.min_km) || 0,
          max_km: Number(item.max_km) || 0,
          precio: Number(item.precio) || 0
        });
      }
    });

    if (ranges.length === 0) {
      ranges.push({ min_km: 0, max_km: 5, precio: 40 });
    }

    setSucursalFormTarifas(ranges);
    setSucursalKmExtraEnabled(hasKmExtra);
    setSucursalKmExtraPrecio(extraPrecio);
    setSucursalRawJsonText(JSON.stringify(rawTarifas, null, 2));
    setSucursalShowRawJson(false);
    setSucursalError("");
    setSucursalSuccess("");
    setSucursalModalOpen(true);
  };

  const handleCloseSucursalModal = () => {
    setSucursalModalOpen(false);
    setEditingSucursal(null);
    setSucursalError("");
    setSucursalSuccess("");
  };

  const handleSucursalPhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: File[] = Array.from(files);
    setSucursalFormPhotoFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSucursalFormPhotoPreviews(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveSucursalPhoto = (index: number) => {
    if (index < sucursalFormFotos.length) {
      setSucursalFormFotos(prev => prev.filter((_, idx) => idx !== index));
      setSucursalFormPhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    } else {
      const fileIdx = index - sucursalFormFotos.length;
      setSucursalFormPhotoFiles(prev => prev.filter((_, idx) => idx !== fileIdx));
      setSucursalFormPhotoPreviews(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleAddTarifaTier = () => {
    const lastTier = sucursalFormTarifas[sucursalFormTarifas.length - 1];
    const newMin = lastTier ? Number(lastTier.max_km) : 0;
    const newMax = newMin + 5;
    const newPrice = lastTier ? Number(lastTier.precio) + 15 : 40;
    setSucursalFormTarifas(prev => [...prev, { min_km: newMin, max_km: newMax, precio: newPrice }]);
  };

  const handleUpdateTarifaTier = (index: number, field: "min_km" | "max_km" | "precio", val: number) => {
    setSucursalFormTarifas(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveTarifaTier = (index: number) => {
    setSucursalFormTarifas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSucursal) return;

    setSucursalIsLoading(true);
    setSucursalError("");
    setSucursalSuccess("");

    try {
      // 1. Upload new photos to Supabase Storage if any
      const uploadedUrls: string[] = [];
      for (const file of sucursalFormPhotoFiles) {
        try {
          const fileName = `sucursales/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { data: uploadData, error: upErr } = await supabase.storage
            .from("general")
            .upload(fileName, file, { cacheControl: "3600", upsert: false });
          if (!upErr && uploadData) {
            const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
            uploadedUrls.push(urlData.publicUrl);
          } else {
            console.warn("Sucursal photo upload warning:", upErr);
          }
        } catch (fErr) {
          console.error("Error uploading photo:", fErr);
        }
      }

      const finalFotos = [...sucursalFormFotos, ...uploadedUrls];

      // 2. Build final Tarifas JSON
      let finalTarifas: any[] = [];
      if (sucursalShowRawJson) {
        try {
          finalTarifas = JSON.parse(sucursalRawJsonText);
        } catch (jsonErr: any) {
          setSucursalError("El formato JSON de Tarifas es inválido: " + jsonErr.message);
          setSucursalIsLoading(false);
          return;
        }
      } else {
        finalTarifas = sucursalFormTarifas.map(t => ({
          min_km: Number(t.min_km),
          max_km: Number(t.max_km),
          precio: Number(t.precio)
        }));
        if (sucursalKmExtraEnabled) {
          finalTarifas.push({
            km_extra: true,
            precio_por_km: Number(sucursalKmExtraPrecio)
          });
        }
      }

      const updatePayload = {
        DireccionSucursal: sucursalFormDireccion.trim() || null,
        Latitud: sucursalFormLatitud !== "" ? Number(sucursalFormLatitud) : null,
        Longitud: sucursalFormLongitud !== "" ? Number(sucursalFormLongitud) : null,
        LinkGoogleMaps: sucursalFormLinkGoogleMaps.trim() || null,
        FotosSucursales: finalFotos,
        Tarifas: finalTarifas
      };

      const { error: updateErr } = await supabase
        .from("Sucursales")
        .update(updatePayload)
        .eq("IDSucursal", editingSucursal.IDSucursal);

      if (updateErr) throw updateErr;

      setSucursalSuccess("¡Configuración de sucursal y tarifas actualizada exitosamente!");
      await fetchBrokerSucursales();

      setTimeout(() => {
        setSucursalModalOpen(false);
        setEditingSucursal(null);
      }, 700);

    } catch (err: any) {
      console.error("Error saving sucursal changes:", err);
      setSucursalError(err.message || "Error al actualizar la sucursal.");
    } finally {
      setSucursalIsLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setCompError("Acción no autorizada. Solo los SuperAdministradores pueden gestionar empresas.");
      return;
    }

    const companyIdToUse = editingCompany ? editingCompany.idEmpresa : (newCompId || generateRandomCompanyId());

    if (!companyIdToUse || !newCompName.trim() || !newCompOwner.trim() || !newCompUrl.trim()) {
      setCompError("Por favor, llena todos los campos obligatorios (*).");
      return;
    }

    // Filter valid users from newCompUsers (must have non-empty email)
    const validUsers = newCompUsers.filter(u => u.email && u.email.trim() !== "");
    if (validUsers.length === 0) {
      setCompError("Por favor, ingresa al menos un usuario administrador con correo electrónico.");
      return;
    }

    // Validate that new users (without existing id) have a password of at least 6 chars
    for (let i = 0; i < validUsers.length; i++) {
      const u = validUsers[i];
      if (!u.id && (!u.password || u.password.trim().length < 6)) {
        setCompError(`El usuario ${u.email || `#${i + 1}`} requiere una contraseña de al menos 6 caracteres.`);
        return;
      }
    }

    if (!newCompLogoFile && !newCompLogoPreview) {
      setCompError("Por favor, sube el logo de la empresa (máximo 1000x1000 px, cuadrado 1:1).");
      return;
    }

    const cleanedPhones = newCompPhones.filter(phone => phone.trim() !== "");
    const primaryEmail = validUsers[0].email.trim().toLowerCase();

    setCompIsLoading(true);
    setCompError("");
    setCompMessage("");

    let uploadedLogoUrl = newCompLogoPreview;
    
    if (newCompLogoFile) {
      try {
        const fileExt = newCompLogoFile.name.split('.').pop() || "png";
        const fileName = `logos_empresas/${Date.now()}_${companyIdToUse}.${fileExt}`;
        
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("general")
          .upload(fileName, newCompLogoFile, {
            cacheControl: "3600",
            upsert: false
          });

        if (uploadErr) {
          throw uploadErr;
        }

        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("general")
            .getPublicUrl(fileName);
          uploadedLogoUrl = urlData.publicUrl;
        }
      } catch (err: any) {
        console.warn("Storage upload failed, using preview base64 as fallback:", err);
        uploadedLogoUrl = newCompLogoPreview;
      }
    }

    const companyData = {
      idEmpresa: companyIdToUse.trim(),
      NombreEmpresa: newCompName.trim(),
      Nombre_Empresa: newCompName.trim(),
      PropietarioEmpresaNombre: newCompOwner.trim(),
      mailEmpresa: primaryEmail,
      urlEmpresaUnico: newCompUrl.trim().toLowerCase(),
      logoEmpresa: uploadedLogoUrl,
      foto_empresa: uploadedLogoUrl,
      TelefonosEmpresa: cleanedPhones,
      DescripcionEmpresa: newCompDesc.trim(),
      DireccionEmpresa: newCompAddress.trim(),
      created_at: new Date().toISOString()
    };

    let processedInDb = false;
    const processedUserIds: string[] = [];

    try {
      if (editingCompany) {
        const { error: dbErr } = await supabase
          .from("Empresa")
          .update({
            NombreEmpresa: companyData.NombreEmpresa,
            PropietarioEmpresaNombre: companyData.PropietarioEmpresaNombre,
            mailEmpresa: companyData.mailEmpresa,
            urlEmpresaUnico: companyData.urlEmpresaUnico,
            logoEmpresa: companyData.logoEmpresa,
            TelefonosEmpresa: companyData.TelefonosEmpresa,
            DescripcionEmpresa: companyData.DescripcionEmpresa,
            DireccionEmpresa: companyData.DireccionEmpresa
          })
          .eq("idEmpresa", companyIdToUse);

        if (dbErr) {
          console.warn("Database update failed: ", dbErr.message);
          throw dbErr;
        }
      } else {
        // Step 1: Insert new company
        const { error: dbErr } = await supabase
          .from("Empresa")
          .insert({
            idEmpresa: companyData.idEmpresa,
            NombreEmpresa: companyData.NombreEmpresa,
            PropietarioEmpresaNombre: companyData.PropietarioEmpresaNombre,
            mailEmpresa: companyData.mailEmpresa,
            urlEmpresaUnico: companyData.urlEmpresaUnico,
            logoEmpresa: companyData.logoEmpresa,
            TelefonosEmpresa: companyData.TelefonosEmpresa,
            DescripcionEmpresa: companyData.DescripcionEmpresa,
            DireccionEmpresa: companyData.DireccionEmpresa
          });

        if (dbErr) {
          console.warn("Database insert failed: ", dbErr.message);
          throw dbErr;
        }
      }

      // Step 2: Process up to 3 authenticated users in Supabase Auth & public.users table
      // CRITICAL: We use direct fetch to ${supabaseUrl}/auth/v1/signup with apikey
      // This DOES NOT touch localStorage or supabaseClient session, keeping SuperAdmin logged in!
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const phoneVal = cleanedPhones[0] ? Number(cleanedPhones[0].replace(/\D/g, '')) : null;

      for (const u of validUsers) {
        const userEmail = u.email.trim().toLowerCase();
        const userName = (u.name || newCompOwner).trim();
        let targetUserId = u.id;

        // If user is new (no id) OR has password provided:
        if (!targetUserId || (u.password && u.password.trim().length >= 6)) {
          try {
            const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseAnonKey
              },
              body: JSON.stringify({
                email: userEmail,
                password: u.password?.trim() || "Temp123456!",
                options: {
                  data: {
                    name: userName,
                    role: "Administrador"
                  }
                }
              })
            });

            const resData = await signupRes.json();
            if (signupRes.ok && (resData.id || resData.user?.id)) {
              targetUserId = resData.id || resData.user?.id;
            } else {
              // If already registered, find their IDUser from public.users or retain existing
              console.warn(`Auth signup response note for ${userEmail}:`, resData.msg || resData.message || resData.error?.message);
              if (!targetUserId) {
                const { data: existingUser } = await supabase
                  .from("users")
                  .select("IDUser")
                  .eq("mail", userEmail)
                  .maybeSingle();

                if (existingUser?.IDUser) {
                  targetUserId = existingUser.IDUser;
                } else {
                  targetUserId = crypto.randomUUID();
                }
              }
            }
          } catch (authErr) {
            console.warn(`Auth signup fetch failed for ${userEmail}:`, authErr);
            if (!targetUserId) targetUserId = crypto.randomUUID();
          }
        }

        if (targetUserId) {
          processedUserIds.push(targetUserId);

          // Upsert in public.users table linked to IDEmpresa
          const { error: userErr } = await supabase
            .from("users")
            .upsert({
              IDUser: targetUserId,
              name: userName,
              mail: userEmail,
              isAdmin: true,
              superAdmin: false,
              Rol: "Administrador",
              phone: phoneVal,
              IDEmpresa: companyIdToUse.trim(),
              foto: null,
              Sucursales: []
            }, { onConflict: "IDUser" });

          if (userErr) {
            console.warn(`Failed upserting user ${userEmail} in public.users:`, userErr.message);
          }
        }
      }

      // If editing company, unbind any existing admin users that were removed in the form
      if (editingCompany && processedUserIds.length > 0) {
        try {
          const { data: currentDbUsers } = await supabase
            .from("users")
            .select("IDUser")
            .eq("IDEmpresa", companyIdToUse);

          if (currentDbUsers && currentDbUsers.length > 0) {
            const usersToUnlink = currentDbUsers
              .map((u: any) => u.IDUser)
              .filter((uid: string) => !processedUserIds.includes(uid));

            for (const unlinkId of usersToUnlink) {
              await supabase
                .from("users")
                .update({ IDEmpresa: null, isAdmin: false })
                .eq("IDUser", unlinkId);
            }
          }
        } catch (unlinkErr) {
          console.warn("Error unlinking removed users:", unlinkErr);
        }
      }

      // Step 3: Automatically ensure unique row in personalizacion_web for this company
      try {
        // Consultar sucursales existentes para activarlas automáticamente si existen
        let activeBranchIds: string[] = [];
        try {
          const { data: compBranches } = await supabase
            .from("Sucursales")
            .select("id")
            .eq("IDEmpresa", companyIdToUse.trim());
          if (compBranches && compBranches.length > 0) {
            activeBranchIds = compBranches.map((b: any) => String(b.id));
          }
        } catch (bErr) {
          console.warn("Could not query branches for web customization:", bErr);
        }

        const { data: existingWebConfig } = await supabase
          .from("personalizacion_web")
          .select("id, logo")
          .eq("ID_Empresa", companyIdToUse.trim())
          .maybeSingle();

        const defaultWebData = {
          ID_Empresa: companyIdToUse.trim(),
          logo: uploadedLogoUrl || "",
          portada: "",
          orden_web: ["hero", "sucursales", "productos", "galeria", "contacto"],
          sucursales_activas: activeBranchIds,
          numero_whatsapp: cleanedPhones[0] ? Number(cleanedPhones[0].replace(/\D/g, '')) : null,
          correo_general_info: primaryEmail || "",
          color_texto: "#0f172a", // Negro (#0f172a)
          color_titulos: "#F7340C", // Rojo (#F7340C)
          color_fondo: "#ffffff", // Blanco (#ffffff)
          galeria_fotos: [],
          instagram: "",
          facebook: "",
          tiktok: "",
          meta_titulo: newCompName.trim(),
          meta_descripcion: newCompDesc.trim() || "Pide tus platillos y productos favoritos directamente a domicilio o con recogida en sucursal."
        };

        if (!existingWebConfig) {
          const { error: insertPwErr } = await supabase
            .from("personalizacion_web")
            .insert(defaultWebData);

          if (insertPwErr) {
            console.error("Auto-creation of personalizacion_web row failed:", insertPwErr);
          }
        } else if (uploadedLogoUrl && (!existingWebConfig.logo || existingWebConfig.logo === "")) {
          await supabase
            .from("personalizacion_web")
            .update({ logo: uploadedLogoUrl })
            .eq("id", existingWebConfig.id);
        }
      } catch (pwErr) {
        console.warn("Auto-creation of personalizacion_web row note:", pwErr);
      }

      processedInDb = true;
    } catch (err: any) {
      console.warn("Offline/error saving company to database, saving local fallback:", err);
    }

    try {
      const localCompanies = JSON.parse(localStorage.getItem("reparto_local_companies") || "[]");
      if (editingCompany) {
        const updatedLocal = localCompanies.map((c: any) => c.idEmpresa === companyIdToUse ? companyData : c);
        if (!localCompanies.some((c: any) => c.idEmpresa === companyIdToUse)) {
          updatedLocal.push(companyData);
        }
        localStorage.setItem("reparto_local_companies", JSON.stringify(updatedLocal));
      } else {
        localCompanies.push(companyData);
        localStorage.setItem("reparto_local_companies", JSON.stringify(localCompanies));

        // Save local backup for admin users
        const localUsers = JSON.parse(localStorage.getItem("reparto_local_users") || "[]");
        const phoneVal = cleanedPhones[0] ? Number(cleanedPhones[0].replace(/\D/g, '')) : null;
        for (let idx = 0; idx < validUsers.length; idx++) {
          const u = validUsers[idx];
          localUsers.push({
            IDUser: processedUserIds[idx] || crypto.randomUUID(),
            name: (u.name || newCompOwner).trim(),
            mail: u.email.trim().toLowerCase(),
            password: u.password?.trim() || "",
            isAdmin: true,
            superAdmin: false,
            Rol: "Administrador",
            phone: phoneVal,
            IDEmpresa: companyIdToUse.trim()
          });
        }
        localStorage.setItem("reparto_local_users", JSON.stringify(localUsers));
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }

    setCompMessage(
      editingCompany
        ? (processedInDb ? "¡Empresa y usuarios administradores actualizados con éxito!" : "Empresa actualizada localmente.")
        : (processedInDb ? "¡Empresa y usuarios administradores creados con éxito!" : "Empresa y administradores creados localmente.")
    );

    resetCompanyForm();
    fetchSaCompanies();
  };

  // ========== PAYMENT CONFIG FUNCTIONS ==========
  const loadPaymentConfig = async () => {
    setPayIsLoading(true);
    setPayError("");
    setPayMessage("");

    try {
      const { data, error } = await supabase
        .from("Empresa")
        .select("mp_public_key_test, mp_access_token_test, mp_public_key_prod, mp_access_token_prod, clip_api_key_test, clip_api_key_prod, payment_mode")
        .eq("idEmpresa", currentCompanyId)
        .maybeSingle();

      if (!error && data) {
        setPayMpPublicKeyTest(data.mp_public_key_test || "");
        setPayMpAccessTokenTest(data.mp_access_token_test || "");
        setPayMpPublicKeyProd(data.mp_public_key_prod || "");
        setPayMpAccessTokenProd(data.mp_access_token_prod || "");
        setPayClipApiKeyTest(data.clip_api_key_test || "");
        setPayClipApiKeyProd(data.clip_api_key_prod || "");
        setPaymentMode((data.payment_mode as "test" | "production") || "test");
        setPayConfigLoaded(true);

        // Cache in localStorage
        localStorage.setItem(`reparto_payment_config_${currentCompanyId}`, JSON.stringify(data));
      } else {
        // Try localStorage fallback
        const cached = localStorage.getItem(`reparto_payment_config_${currentCompanyId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPayMpPublicKeyTest(parsed.mp_public_key_test || "");
          setPayMpAccessTokenTest(parsed.mp_access_token_test || "");
          setPayMpPublicKeyProd(parsed.mp_public_key_prod || "");
          setPayMpAccessTokenProd(parsed.mp_access_token_prod || "");
          setPayClipApiKeyTest(parsed.clip_api_key_test || "");
          setPayClipApiKeyProd(parsed.clip_api_key_prod || "");
          setPaymentMode((parsed.payment_mode as "test" | "production") || "test");
        }
        setPayConfigLoaded(true);
      }
    } catch (err) {
      console.warn("Error loading payment config:", err);
      // Try localStorage fallback
      try {
        const cached = localStorage.getItem(`reparto_payment_config_${currentCompanyId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPayMpPublicKeyTest(parsed.mp_public_key_test || "");
          setPayMpAccessTokenTest(parsed.mp_access_token_test || "");
          setPayMpPublicKeyProd(parsed.mp_public_key_prod || "");
          setPayMpAccessTokenProd(parsed.mp_access_token_prod || "");
          setPayClipApiKeyTest(parsed.clip_api_key_test || "");
          setPayClipApiKeyProd(parsed.clip_api_key_prod || "");
          setPaymentMode((parsed.payment_mode as "test" | "production") || "test");
        }
      } catch {}
      setPayConfigLoaded(true);
    } finally {
      setPayIsLoading(false);
    }
  };

  const handleSavePaymentConfig = async () => {
    setPayIsLoading(true);
    setPayError("");
    setPayMessage("");

    const configData = {
      mp_public_key_test: payMpPublicKeyTest.trim() || null,
      mp_access_token_test: payMpAccessTokenTest.trim() || null,
      mp_public_key_prod: payMpPublicKeyProd.trim() || null,
      mp_access_token_prod: payMpAccessTokenProd.trim() || null,
      clip_api_key_test: payClipApiKeyTest.trim() || null,
      clip_api_key_prod: payClipApiKeyProd.trim() || null,
      payment_mode: paymentMode
    };

    let savedInDb = false;

    try {
      const { error } = await supabase
        .from("Empresa")
        .update(configData)
        .eq("idEmpresa", currentCompanyId);

      if (!error) {
        savedInDb = true;
      } else {
        console.warn("Error saving payment config to DB:", error.message);
      }
    } catch (err) {
      console.warn("Exception saving payment config:", err);
    }

    // Always save to localStorage as backup
    try {
      localStorage.setItem(`reparto_payment_config_${currentCompanyId}`, JSON.stringify(configData));
    } catch {}

    setPayIsLoading(false);
    setPayMessage(
      savedInDb
        ? "¡Configuración de pasarelas de pago guardada exitosamente en la base de datos!"
        : "Configuración guardada localmente. Se sincronizará cuando haya conexión."
    );

    // Clear message after 5 seconds
    setTimeout(() => {
      setPayMessage("");
    }, 5000);
  };

  // ========== WEB CUSTOMIZATION FUNCTIONS (personalizacion_web) ==========
  const MAX_LOGO_BYTES = 250 * 1024 * 1024; // 250 MB
  const MAX_IMAGE_BYTES = 350 * 1024 * 1024; // 350 MB

  const loadWebCustomization = async () => {
    if (!currentCompanyId) return;
    setWebIsLoading(true);
    setWebError("");
    setWebMessage("");

    try {
      // 1. Fetch company data from Empresa as fallback defaults
      const { data: compData } = await supabase
        .from("Empresa")
        .select("NombreEmpresa, DescripcionEmpresa, logoEmpresa, foto_empresa, mailEmpresa, TelefonosEmpresa")
        .eq("idEmpresa", currentCompanyId)
        .maybeSingle();

      const fallbackLogo = compData?.logoEmpresa || compData?.foto_empresa || "";
      const fallbackMail = compData?.mailEmpresa || "";
      const fallbackPhone = compData?.TelefonosEmpresa?.[0]
        ? String(compData.TelefonosEmpresa[0]).replace(/\D/g, "")
        : "";
      const fallbackTitulo = compData?.NombreEmpresa || "Menú Digital y Pedidos";
      const fallbackDesc = compData?.DescripcionEmpresa || "Pide tus productos favoritos directamente a domicilio o con recogida en sucursal.";

      // 2. Fetch row from personalizacion_web
      const { data, error } = await supabase
        .from("personalizacion_web")
        .select("*")
        .eq("ID_Empresa", currentCompanyId)
        .maybeSingle();

      if (!error && data) {
        setWebRowId(data.id);
        setWebLogo(data.logo || fallbackLogo);
        setWebPortada(data.portada || "");
        setWebGaleria(Array.isArray(data.galeria_fotos) ? data.galeria_fotos : []);
        setWebColorTexto(data.color_texto || "#0f172a");
        setWebColorTitulos(data.color_titulos || "#F7340C");
        setWebColorFondo(data.color_fondo || "#ffffff");
        setWebNumeroWhatsapp(
          data.numero_whatsapp !== null && data.numero_whatsapp !== undefined
            ? String(data.numero_whatsapp)
            : fallbackPhone
        );
        setWebCorreoGeneral(data.correo_general_info || fallbackMail);
        setWebInstagram(data.instagram || "");
        setWebFacebook(data.facebook || "");
        setWebTiktok(data.tiktok || "");
        setWebMetaTitulo(data.meta_titulo || fallbackTitulo);
        setWebMetaDescripcion(data.meta_descripcion || fallbackDesc);
        setWebOrdenWeb(
          Array.isArray(data.orden_web) && data.orden_web.length > 0
            ? data.orden_web
            : ["hero", "sucursales", "productos", "galeria", "contacto"]
        );
        setWebSucursalesActivas(
          Array.isArray(data.sucursales_activas)
            ? data.sucursales_activas
            : branches.map(b => b.id)
        );
        setWebConfigLoaded(true);
      } else {
        // Automatically create unique default row in personalizacion_web for this company
        const defaultBranchIds = branches.map(b => b.id);
        const defaultWebData = {
          ID_Empresa: currentCompanyId,
          logo: fallbackLogo,
          portada: "",
          orden_web: ["hero", "sucursales", "productos", "galeria", "contacto"],
          sucursales_activas: defaultBranchIds,
          numero_whatsapp: fallbackPhone ? Number(fallbackPhone) : null,
          correo_general_info: fallbackMail,
          color_texto: "#0f172a",
          color_titulos: "#F7340C",
          color_fondo: "#ffffff",
          galeria_fotos: [],
          instagram: "",
          facebook: "",
          tiktok: "",
          meta_titulo: fallbackTitulo,
          meta_descripcion: fallbackDesc
        };

        const { data: newRow } = await supabase
          .from("personalizacion_web")
          .insert(defaultWebData)
          .select("id")
          .maybeSingle();

        if (newRow?.id) {
          setWebRowId(newRow.id);
        }
        setWebLogo(fallbackLogo);
        setWebPortada("");
        setWebGaleria([]);
        setWebColorTexto("#0f172a");
        setWebColorTitulos("#F7340C");
        setWebColorFondo("#ffffff");
        setWebNumeroWhatsapp(fallbackPhone);
        setWebCorreoGeneral(fallbackMail);
        setWebInstagram("");
        setWebFacebook("");
        setWebTiktok("");
        setWebMetaTitulo(fallbackTitulo);
        setWebMetaDescripcion(fallbackDesc);
        setWebOrdenWeb(["hero", "sucursales", "productos", "galeria", "contacto"]);
        setWebSucursalesActivas(defaultBranchIds);
        setWebConfigLoaded(true);
      }
    } catch (err: any) {
      console.error("Error loading web customization:", err);
      setWebError("No se pudo cargar la configuración de la web.");
    } finally {
      setWebIsLoading(false);
    }
  };

  const handleWebLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_LOGO_BYTES) {
      setWebError(`El logotipo seleccionado pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite de 250 MB.`);
      return;
    }

    setWebLogoUploading(true);
    setWebError("");
    setWebMessage("");

    try {
      const fileExt = file.name.split('.').pop() || "png";
      const fileName = `personalizacion_web/${currentCompanyId}_logo_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("general")
        .upload(fileName, file, { upsert: true, cacheControl: "3600" });

      if (error) throw error;

      if (data) {
        const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
        setWebLogo(urlData.publicUrl);
        setWebMessage("Logotipo subido correctamente al bucket.");
      }
    } catch (err: any) {
      console.error("Error uploading logo:", err);
      setWebError(`Error al subir el logo: ${err.message || err}`);
    } finally {
      setWebLogoUploading(false);
    }
  };

  const handleWebPortadaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      setWebError(`La portada seleccionada pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB y supera el límite de 350 MB.`);
      return;
    }

    setWebPortadaUploading(true);
    setWebError("");
    setWebMessage("");

    try {
      const fileExt = file.name.split('.').pop() || "png";
      const fileName = `personalizacion_web/${currentCompanyId}_portada_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("general")
        .upload(fileName, file, { upsert: true, cacheControl: "3600" });

      if (error) throw error;

      if (data) {
        const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
        setWebPortada(urlData.publicUrl);
        setWebMessage("Portada subida correctamente al bucket.");
      }
    } catch (err: any) {
      console.error("Error uploading portada:", err);
      setWebError(`Error al subir la portada: ${err.message || err}`);
    } finally {
      setWebPortadaUploading(false);
    }
  };

  const handleWebGaleriaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setWebGaleriaUploading(true);
    setWebError("");
    setWebMessage("");

    const uploadedUrls: string[] = [];
    const skippedFiles: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_IMAGE_BYTES) {
          skippedFiles.push(file.name);
          continue;
        }

        const fileExt = file.name.split('.').pop() || "jpg";
        const fileName = `personalizacion_web/${currentCompanyId}_galeria_${Date.now()}_${i}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from("general")
          .upload(fileName, file, { upsert: true, cacheControl: "3600" });

        if (!error && data) {
          const { data: urlData } = supabase.storage.from("general").getPublicUrl(fileName);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setWebGaleria(prev => [...prev, ...uploadedUrls]);
        setWebMessage(`Se agregaron ${uploadedUrls.length} imagen(es) a la galería.`);
      }

      if (skippedFiles.length > 0) {
        setWebError(`${skippedFiles.length} imagen(es) superaron el límite de 350 MB y no se subieron.`);
      }
    } catch (err: any) {
      console.error("Error uploading galeria images:", err);
      setWebError(`Error al subir fotos a la galería: ${err.message || err}`);
    } finally {
      setWebGaleriaUploading(false);
    }
  };

  const handleRemoveWebGaleriaPhoto = (indexToRemove: number) => {
    setWebGaleria(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleToggleWebSucursal = (branchId: string) => {
    setWebSucursalesActivas(prev => {
      if (prev.includes(branchId)) {
        return prev.filter(id => id !== branchId);
      } else {
        return [...prev, branchId];
      }
    });
  };

  const handleMoveWebSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      setWebOrdenWeb(prev => {
        const copy = [...prev];
        const temp = copy[index - 1];
        copy[index - 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    } else if (direction === "down" && index < webOrdenWeb.length - 1) {
      setWebOrdenWeb(prev => {
        const copy = [...prev];
        const temp = copy[index + 1];
        copy[index + 1] = copy[index];
        copy[index] = temp;
        return copy;
      });
    }
  };

  const handleSaveWebCustomization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentCompanyId) {
      setWebError("No se ha seleccionado ninguna empresa activa.");
      return;
    }

    setWebIsSaving(true);
    setWebError("");
    setWebMessage("");

    try {
      const phoneClean = webNumeroWhatsapp ? Number(String(webNumeroWhatsapp).replace(/\D/g, "")) : null;

      const payload = {
        ID_Empresa: currentCompanyId.trim(),
        logo: webLogo || "",
        portada: webPortada || "",
        orden_web: webOrdenWeb,
        sucursales_activas: webSucursalesActivas,
        numero_whatsapp: phoneClean,
        correo_general_info: webCorreoGeneral.trim(),
        color_texto: webColorTexto.trim() || "#0f172a",
        color_titulos: webColorTitulos.trim() || "#F7340C",
        color_fondo: webColorFondo.trim() || "#ffffff",
        galeria_fotos: webGaleria,
        instagram: webInstagram.trim(),
        facebook: webFacebook.trim(),
        tiktok: webTiktok.trim(),
        meta_titulo: webMetaTitulo.trim(),
        meta_descripcion: webMetaDescripcion.trim()
      };

      if (webRowId) {
        const { error: updateErr } = await supabase
          .from("personalizacion_web")
          .update(payload)
          .eq("id", webRowId);

        if (updateErr) throw updateErr;
      } else {
        // Query to check if a row already exists for ID_Empresa to maintain uniqueness
        const { data: existing } = await supabase
          .from("personalizacion_web")
          .select("id")
          .eq("ID_Empresa", currentCompanyId)
          .maybeSingle();

        if (existing?.id) {
          setWebRowId(existing.id);
          const { error: updateErr } = await supabase
            .from("personalizacion_web")
            .update(payload)
            .eq("id", existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { data: newRow, error: insertErr } = await supabase
            .from("personalizacion_web")
            .insert(payload)
            .select("id")
            .single();

          if (insertErr) throw insertErr;
          if (newRow?.id) setWebRowId(newRow.id);
        }
      }

      setWebMessage("¡Personalización de la landing page guardada con éxito!");
      setTimeout(() => {
        setWebMessage("");
      }, 5000);
    } catch (err: any) {
      console.error("Error saving web customization:", err);
      setWebError(err.message || "Error al guardar la personalización de la web.");
    } finally {
      setWebIsSaving(false);
    }
  };


  return (
    <div className={styles.dashboardWrapper}>
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} superAdmin={isSuperAdmin} isAdmin={isAdmin} />

      {/* Main Panel Content */}
      <div className={styles.mainContent}>
        <Navbar activeTab={activeTab} />

        <main className={styles.viewport}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* Statistics Grid */}
              <div className={styles.overviewGrid}>
                <StatsCard 
                  title="Sucursales" 
                  value={branches.length} 
                  icon={Store} 
                  color="#6366f1"
                  footerText={`${branches.filter(b => b.status === "active").length} operativas en el sistema`}
                />
                <StatsCard 
                  title="Miembros de Personal" 
                  value={personnel.length} 
                  icon={Users} 
                  color="#06b6d4" 
                  footerText="Staff y administradores registrados"
                />
                <StatsCard 
                  title="Miembros Activos" 
                  value={activeMembers} 
                  icon={Activity} 
                  color="#10b981"
                  footerText={`${activeDrivers} conductores online / ${activeStaff} personal activo`}
                />
                <StatsCard 
                  title="Visitas a la Plataforma" 
                  value={platformVisits} 
                  icon={Smartphone} 
                  color="#a855f7"
                  footerText="Total de accesos registrados"
                />
              </div>

              {/* Lower Details Row */}
              <div className={styles.overviewSection} style={{ gridTemplateColumns: '1fr' }}>
                {/* Pedidos Recientes Feed log */}
                <div className={`glass-panel ${styles.recentActivity}`} style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%", borderRadius: "var(--radius-lg)" }}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Pedidos Recientes</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deliveries")}
                      style={{
                        background: 'var(--primary-glow)',
                        border: '1px solid rgba(247, 52, 12, 0.15)',
                        color: 'var(--primary)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <ClipboardList size={14} /> Ver Pedidos
                    </button>
                  </div>

                  <div className={styles.scrollList} style={{ maxHeight: '500px' }}>
                    {deliveries.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No hay pedidos recientes registrados.
                      </div>
                    ) : (
                      [...deliveries].reverse().slice(0, 15).map((del) => {
                        const drv = drivers.find(d => d.id === del.driverId);
                        
                        let statusColor = "var(--warning)";
                        let statusText = "Pendiente";
                        
                        if (del.status === "transit") {
                          statusColor = "var(--primary)";
                          statusText = "En Ruta";
                        } else if (del.status === "assigned") {
                          statusColor = "var(--primary)";
                          statusText = "Asignado";
                        } else if (del.status === "delivered") {
                          statusColor = "var(--success)";
                          statusText = "Entregado";
                        } else if (del.status === "canceled") {
                          statusColor = "var(--danger)";
                          statusText = "Cancelado";
                        }

                        return (
                          <div key={del.id} className={styles.activityItem} style={{ padding: '14px 16px' }}>
                            <span className={styles.activityDot} style={{ background: statusColor, marginTop: '5px' }} />
                            <div className={styles.activityInfo}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={styles.activityText} style={{ fontSize: '0.9rem' }}>
                                  Pedido para <strong>{del.customer}</strong>
                                </span>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 600, 
                                  color: statusColor, 
                                  background: `${statusColor}1A`,
                                  padding: '2px 8px', 
                                  borderRadius: '10px' 
                                }}>
                                  {statusText}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                📍 {del.address}
                              </div>
                              {del.items && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                  📦 {del.items}
                                </div>
                              )}
                              <div className={styles.activityMeta} style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                                <span>{drv ? `Repartidor: ${drv.name}` : 'Sin asignar'}</span>
                                <span>{del.createdTime}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: GESTIONAR ORDENES */}
          {activeTab === "deliveries" && (
            <div className={styles.deliveriesGrid} style={{ gridTemplateColumns: '1fr' }}>
              
              {/* Single Column: Order List */}
              <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", height: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color)", background: "var(--bg-card)", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Listado de Pedidos Reales (Supabase)</h3>
                  
                  {/* Category Filter */}
                  <div className={styles.orderFilter} style={{ margin: 0, border: "none" }}>
                    {(["all", "pending", "transit", "delivered"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setOrderFilter(filter)}
                        className={`${styles.filterBtn} ${orderFilter === filter ? styles.filterBtnActive : ""}`}
                      >
                        {filter === "all" ? "Todos" : filter === "pending" ? "Pendientes" : filter === "transit" ? "En Ruta" : "Completados"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.scrollList} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gridAutoRows: 'max-content', gap: '16px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
                  {orders
                    .filter(o => {
                      if (orderFilter === "all") return true;
                      if (orderFilter === "pending") return o.status === "creada" || o.status === "en_preparacion" || o.status === "lista";
                      if (orderFilter === "transit") return o.status === "en_camino";
                      if (orderFilter === "delivered") return o.status === "entregada" || o.status === "cancelada";
                      return true;
                    })
                    .map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      const orderItems = order.products.map(p => `${p.name} x${p.quantity}`).join(", ");
                      const dateObj = new Date(order.createdAt);
                      const formattedTime = isNaN(dateObj.getTime()) ? "" : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`${styles.orderCard} ${isSelected ? styles.orderCardSelected : ""}`}
                          style={{ margin: 0, height: 'fit-content', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                          <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span className={styles.cardTitle} style={{ fontSize: '0.95rem', fontWeight: 700 }}>{order.customerName}</span>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {order.id}</div>
                            </div>
                            <span className={`${styles.badge} ${
                              order.status === "creada" || order.status === "en_preparacion" || order.status === "lista"
                                ? styles.badgePending 
                                : order.status === "en_camino"
                                  ? styles.badgeTransit 
                                  : styles.badgeDelivered
                            }`} style={order.status === "cancelada" ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' } : {}}>
                              {order.status === "creada" ? "Creada" : 
                               order.status === "en_preparacion" ? "En Preparación" : 
                               order.status === "lista" ? "Lista" : 
                               order.status === "en_camino" ? "En Camino" : 
                               order.status === "entregada" ? "Entregada ✓" : "Cancelada ✕"}
                            </span>
                          </div>

                          <div className={styles.cardDetails} style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span>📍 <strong>Dirección:</strong> {order.address}</span>
                            <span style={{ opacity: 0.9 }}>📦 <strong>Artículos:</strong> {orderItems}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>💰 <strong>Total:</strong> ${order.total.toFixed(2)}</span>
                          </div>
                          
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              <span>Registrado: {formattedTime}</span>
                              <span>Tipo: <strong style={{ color: 'var(--text-secondary)' }}>{order.tipoEntrega === 'a_domicilio' ? 'A Domicilio' : order.tipoEntrega === 'para_llevar' ? 'Para Llevar' : 'Comer Aquí'}</strong></span>
                            </div>

                            {/* Dropdowns for managing order repartidor & status */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              {order.tipoEntrega === "a_domicilio" && (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Repartidor</label>
                                  <select
                                    value={order.repartidorId || ""}
                                    onChange={(e) => updateOrderDriver(order.id, e.target.value || null)}
                                    className={styles.formInput}
                                    style={{ padding: "4px 8px", fontSize: "0.72rem", height: "30px", background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', width: '100%' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="">Sin Asignar</option>
                                    {personnel.filter(p => p.role === "Repartidor").map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Estado</label>
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                                  className={styles.formInput}
                                  style={{ padding: "4px 8px", fontSize: "0.72rem", height: "30px", background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', width: '100%' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="creada">Creada</option>
                                  <option value="en_preparacion">En Preparación</option>
                                  <option value="lista">Lista</option>
                                  <option value="en_camino">En Camino</option>
                                  <option value="entregada">Entregada</option>
                                  <option value="cancelada">Cancelada</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {orders.filter(o => {
                    if (orderFilter === "all") return true;
                    if (orderFilter === "pending") return o.status === "creada" || o.status === "en_preparacion" || o.status === "lista";
                    if (orderFilter === "transit") return o.status === "en_camino";
                    if (orderFilter === "delivered") return o.status === "entregada" || o.status === "cancelada";
                    return true;
                  }).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: "center", color: "var(--text-muted)", padding: "40px 20px", fontSize: "0.85rem" }}>
                      No hay pedidos en esta categoría.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: GESTIONAR CONDUCTORES */}
          {activeTab === "drivers" && (
            <div className={styles.deliveriesGrid}>
              
              {/* Left Panel: Driver list / connection status */}
              <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: "var(--radius-lg)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Truck size={18} /> Repartidores Activos
                  </h3>
                  <span className={styles.badge} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.8rem', padding: '4px 10px', borderRadius: "var(--radius-sm)", fontWeight: 600 }}>
                    0 conectados
                  </span>
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  textAlign: "center",
                  flexGrow: 1,
                  padding: "20px",
                  border: "1px dashed var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.01)"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    boxShadow: "var(--shadow-sm)"
                  }}>
                    <Truck size={24} style={{ opacity: 0.5 }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
                      Sin Conexiones Activas
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                      Por el momento no hay conductores conectados. Los repartidores aparecerán aquí y en el mapa cuando se pongan en línea en su aplicación móvil.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Panel: Mapbox/Leaflet Map */}
              <div className="glass-panel" style={{ position: "relative", height: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                <MapContainer />
              </div>

            </div>
          )}

          {/* TAB 3.5: GESTIONAR ORDENES */}
          {activeTab === "orders" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - var(--navbar-height) - 48px)' }}>
              
              {/* Outer Sub-tabs */}
              <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setOrdersSubTab("pos")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: ordersSubTab === "pos" ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                    color: ordersSubTab === "pos" ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Store size={15} /> Punto de Venta (POS)
                </button>
                <button
                  type="button"
                  onClick={() => setOrdersSubTab("monitor")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: ordersSubTab === "monitor" ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                    color: ordersSubTab === "monitor" ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ClipboardList size={15} /> Monitoreo y Mapa
                </button>
              </div>

              {/* POS Sub-tab View */}
              {ordersSubTab === "pos" ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 380px',
                  gap: '20px',
                  flexGrow: 1,
                  overflow: 'hidden',
                  minHeight: 0
                }}>
                  {/* Left Side: Product Selector & Checkout Tab Content */}
                  <div className="glass-panel" style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    minHeight: 0
                  }}>
                    {/* Inner POS Sub-tabs */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setPosSubTab("menu")}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: posSubTab === "menu" ? 'rgba(247, 52, 12, 0.08)' : 'transparent',
                          color: posSubTab === "menu" ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🍕 Menú de Ventas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (orderSelectedProducts.length > 0) {
                            setPosSubTab("checkout");
                          } else {
                            alert("Por favor agrega productos al carrito antes de proceder.");
                          }
                        }}
                        disabled={orderSelectedProducts.length === 0}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          background: posSubTab === "checkout" ? 'rgba(247, 52, 12, 0.08)' : 'transparent',
                          color: posSubTab === "checkout" ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: orderSelectedProducts.length === 0 ? 0.4 : 1
                        }}
                      >
                        📦 Cerrar la venta
                      </button>
                    </div>

                    {posSubTab === "menu" ? (
                      /* MENU TAB CONTENT */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, overflow: 'hidden', minHeight: 0 }}>
                        {/* Search and Category Filters Row */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            placeholder="Buscar platillo, bebida, snacks o categoría..."
                            className={styles.formInput}
                            style={{ flexGrow: 1, margin: 0 }}
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {["Todos", "Comida", "Bebidas", "Postres", "Otros"].map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedProductCategory(cat)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '20px',
                                  border: '1px solid var(--border-color)',
                                  background: selectedProductCategory === cat ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                                  color: selectedProductCategory === cat ? 'white' : 'var(--text-secondary)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Products Grid list */}
                        <div style={{
                          flexGrow: 1,
                          overflowY: 'auto',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                          gap: '16px',
                          paddingRight: '6px',
                          minHeight: 0
                        }}>
                          {products
                            .filter(p => {
                              const matchSearch = p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                                (p.description || "").toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                                p.category.toLowerCase().includes(productSearchQuery.toLowerCase());
                              const matchCat = selectedProductCategory === "Todos" || p.category === selectedProductCategory;
                              return matchSearch && matchCat;
                            })
                            .map(p => {
                              const firstPhoto = p.fotos && p.fotos[0];
                              const qtyInCart = orderSelectedProducts.find(item => item.id === p.id)?.quantity || 0;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setOrderSelectedProducts((prev) => {
                                      const existing = prev.find(item => item.id === p.id);
                                      if (existing) {
                                        return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
                                      }
                                      return [...prev, { id: p.id, name: p.name, quantity: 1, price: p.price }];
                                    });
                                  }}
                                  style={{
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.02)',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '210px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                  }}
                                >
                                  {qtyInCart > 0 && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      background: 'var(--primary)',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '22px',
                                      height: '22px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.72rem',
                                      fontWeight: 'bold',
                                      zIndex: 10
                                    }}>
                                      {qtyInCart}
                                    </div>
                                  )}
                                  <div style={{ width: '100%', height: '110px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {firstPhoto ? (
                                      <img src={firstPhoto} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <Package size={32} style={{ color: 'var(--text-muted)' }} />
                                    )}
                                  </div>
                                  <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                                      <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', height: '28px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.description || 'Sin descripción'}</p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--success)' }}>${p.price.toFixed(2)}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>Agregar +</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      /* CHECKOUT / CERRAR VENTA TAB CONTENT */
                      <form onSubmit={handleCreateOrderForm} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px', minHeight: 0 }}>
                        {/* 1. Tipo de Venta horizontal select row */}
                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel}>Selecciona el Tipo de Venta</label>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '8px',
                            marginTop: '6px'
                          }}>
                            {[
                              { id: 'para_comer_aqui', label: 'Para comer aquí', icon: Store },
                              { id: 'para_llevar', label: 'Para llevar', icon: Package },
                              { id: 'a_domicilio', label: 'A domicilio', icon: Truck }
                            ].map(option => {
                              const IconComp = option.icon;
                              const isSelected = orderTipoEntrega === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    setOrderTipoEntrega(option.id as any);
                                    if (option.id !== 'a_domicilio') {
                                      setOrderRepartidorId('');
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    padding: '12px 4px',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                                    background: isSelected ? 'rgba(247, 52, 12, 0.08)' : 'rgba(255,255,255,0.02)',
                                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <IconComp size={18} />
                                  <span>{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Dirección de Entrega (Mapbox Autocomplete) */}
                        {orderTipoEntrega === "a_domicilio" ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
                            <div className={styles.formGroup} style={{ position: 'relative' }}>
                              <label className={styles.inputLabel}>Dirección de Entrega *</label>
                              <input
                                type="text"
                                required
                                placeholder="Escribe la dirección para buscar..."
                                className={styles.formInput}
                                value={orderAddress}
                                onChange={(e) => setOrderAddress(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                              />
                              {isLoadingSuggestions && (
                                <div style={{ position: 'absolute', right: '12px', top: '35px', fontSize: '0.7rem', color: 'var(--primary)' }}>
                                  Buscando...
                                </div>
                              )}
                              {showSuggestions && addressSuggestions.length > 0 && (
                                <ul style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 'var(--radius-md)',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                                  zIndex: 100,
                                  listStyle: 'none',
                                  padding: '4px 0',
                                  margin: '4px 0 0 0',
                                  maxHeight: '180px',
                                  overflowY: 'auto'
                                }}>
                                  {addressSuggestions.map((s, idx) => (
                                    <li 
                                      key={idx}
                                      onMouseDown={() => {
                                        addressSelectedFromListRef.current = true;
                                        setOrderAddress(s.place_name);
                                        setOrderLat(s.center[1]);
                                        setOrderLng(s.center[0]);
                                        setShowSuggestions(false);
                                      }}
                                      style={{
                                        padding: '8px 12px',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        borderBottom: idx < addressSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                                    >
                                      📍 {s.place_name}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className={styles.formGroup}>
                              <label className={styles.inputLabel}>Asignar Repartidor</label>
                              <select
                                className={styles.formInput}
                                value={orderRepartidorId}
                                onChange={(e) => setOrderRepartidorId(e.target.value)}
                                style={{ color: "var(--text-primary)" }}
                              >
                                <option value="">Sin Asignar (Despachar después)</option>
                                {personnel.filter(p => p.role === "Repartidor").map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : null}

                        {/* 3. Información del Cliente */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className={styles.formGroup}>
                            <label className={styles.inputLabel}>Nombre del Cliente *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Juan Pérez"
                              className={styles.formInput}
                              value={orderCustomerName}
                              onChange={(e) => setOrderCustomerName(e.target.value)}
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.inputLabel}>Teléfono (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ej. 8112345678"
                              className={styles.formInput}
                              value={orderPhone}
                              onChange={(e) => setOrderPhone(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel}>Sucursal de Origen</label>
                          <select
                            required
                            className={styles.formInput}
                            value={orderBranchId}
                            onChange={(e) => setOrderBranchId(e.target.value)}
                            style={{ color: "var(--text-primary)" }}
                          >
                            <option value="" disabled>Selecciona la sucursal de origen...</option>
                            {branches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Map and Route Distance Details */}
                        {(() => {
                          const selectedBranch = branches.find(b => b.id === orderBranchId);
                          const hasBranchCoords = selectedBranch && selectedBranch.lat !== null && selectedBranch.lat !== undefined && selectedBranch.lng !== null && selectedBranch.lng !== undefined;
                          const showMap = orderTipoEntrega === "a_domicilio" && orderLat !== null && orderLng !== null && hasBranchCoords;

                          if (!showMap) {
                            if (orderTipoEntrega === "a_domicilio") {
                              if (orderAddress.trim().length > 3 && (orderLat === null || orderLng === null)) {
                                return (
                                  <div style={{
                                    margin: '12px 0',
                                    padding: '12px',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    borderRadius: '8px',
                                    color: 'var(--primary)',
                                    fontSize: '0.8rem',
                                    lineHeight: '1.4'
                                  }}>
                                    💡 <strong>Consejo:</strong> Asegúrate de hacer clic en una dirección de la lista desplegable de sugerencias de Mapbox para obtener las coordenadas y calcular la ruta.
                                  </div>
                                );
                              }
                              if (orderLat !== null && orderLng !== null && selectedBranch && !hasBranchCoords) {
                                return (
                                  <div style={{
                                    margin: '12px 0',
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    color: '#ef4444',
                                    fontSize: '0.8rem',
                                    lineHeight: '1.4'
                                  }}>
                                    ⚠️ <strong>Coordenadas faltantes:</strong> La sucursal seleccionada ("{selectedBranch.name}") no tiene asignada una ubicación geográfica. Edítala en la pestaña "Gestionar Sucursales" para configurar su dirección y poder calcular la ruta y costo de envío.
                                  </div>
                                );
                              }
                            }
                            return null;
                          }

                          return (
                            <div style={{
                              margin: '16px 0',
                              padding: '16px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  Ruta de Entrega
                                </span>
                                {isCalculatingRoute ? (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', animation: 'pulse 1.5s infinite' }}>
                                    Calculando ruta...
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold' }}>
                                    {routeDistance ? `${routeDistance.toFixed(2)} km` : 'Calculando...'}
                                  </span>
                                )}
                              </div>

                              <OrderRouteMap
                                start={[selectedBranch!.lat!, selectedBranch!.lng!]}
                                end={[orderLat!, orderLng!]}
                                routeCoordinates={routeCoordinates}
                              />

                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.15)',
                                borderRadius: '6px'
                              }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Costo de Envío:</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                  ${orderShippingCost.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <button type="submit" className={styles.formBtn} style={{ marginTop: '10px' }}>
                          CONFIRMAR Y CREAR ORDEN (${finalOrderTotal.toFixed(2)})
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Right Side: Cart / Resumen Sidebar Panel */}
                  <div className="glass-panel" style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                    minHeight: 0
                  }}>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Resumen</h3>
                      {orderSelectedProducts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Limpiar todo el carrito?")) {
                              setOrderSelectedProducts([]);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Vaciar Carrito"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'block', flexShrink: 0 }}>
                      {orderTipoEntrega === 'a_domicilio' ? 'A domicilio' :
                       orderTipoEntrega === 'para_comer_aqui' ? 'Para comer aquí' :
                       'Para llevar'}
                    </span>

                    {/* Cart Items List */}
                    <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', minHeight: 0 }}>
                      {orderSelectedProducts.length > 0 ? (
                        orderSelectedProducts.map((p, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.04)',
                            flexShrink: 0
                          }}>
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 'bold' }}>${p.price.toFixed(2)} c/u</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderSelectedProducts(prev => {
                                      const existing = prev.find(item => item.id === p.id);
                                      if (existing && existing.quantity > 1) {
                                        return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity - 1 } : item);
                                      }
                                      return prev.filter(item => item.id !== p.id);
                                    });
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', padding: '0 4px' }}>{p.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrderSelectedProducts(prev => prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setOrderSelectedProducts(prev => prev.filter(item => item.id !== p.id))}
                                style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '10px', opacity: 0.4 }}>
                          <Package size={44} />
                          <span style={{ fontSize: '0.82rem' }}>Cesta vacía</span>
                        </div>
                      )}
                    </div>

                    {/* Cart Footer */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: '14px', flexShrink: 0 }}>
                      {orderTipoEntrega === "a_domicilio" && orderShippingCost > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>Subtotal Productos</span>
                            <span>${calculatedOrderTotal.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            <span>Costo de Envío {routeDistance ? `(${routeDistance.toFixed(2)} km)` : ""}</span>
                            <span style={{ color: 'var(--success)' }}>+${orderShippingCost.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '16px' }}>
                        <span>TOTAL</span>
                        <span style={{ color: 'var(--primary)' }}>${finalOrderTotal.toFixed(2)}</span>
                      </div>

                      {posSubTab === "menu" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (orderSelectedProducts.length > 0) {
                              setPosSubTab("checkout");
                            }
                          }}
                          disabled={orderSelectedProducts.length === 0}
                          className={styles.formBtn}
                          style={{
                            width: '100%',
                            background: orderSelectedProducts.length > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: orderSelectedProducts.length > 0 ? 'white' : 'var(--text-muted)',
                            opacity: orderSelectedProducts.length > 0 ? 1 : 0.5,
                            cursor: orderSelectedProducts.length > 0 ? 'pointer' : 'not-allowed'
                          }}
                        >
                          {orderSelectedProducts.length > 0 ? "CONTINUAR AL PAGO / COBRO" : "INGRESE ARTÍCULOS"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPosSubTab("menu")}
                          className={styles.formBtn}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          VOLVER AL MENÚ
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* MONITOR SUB-TAB VIEW (Live Orders list & Map tracking side-by-side) */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '20px',
                  flexGrow: 1,
                  overflow: 'hidden',
                  minHeight: 0
                }}>
                  {/* Orders List Table */}
                  <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: 'var(--radius-lg)', height: '100%', margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div className={styles.sectionHeader}>
                      <h2 className={styles.sectionTitle}>Órdenes Recientes</h2>
                      <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem', padding: '4px 10px' }}>
                        {orders.length} órdenes
                      </span>
                    </div>

                    <div className={styles.tableWrapper} style={{ flexGrow: 1, overflowY: 'auto' }}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Cliente</th>
                            <th>Tipo / Sucursal</th>
                            <th>Destino</th>
                            <th>Repartidor</th>
                            <th>Total / Detalle</th>
                            <th>Estado</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => {
                            const branchName = branches.find(b => b.id === order.idSucursal)?.name || 'Sucursal';
                            const itemsSummary = order.products.map(p => `${p.quantity}x ${p.name}`).join(', ');
                            
                            return (
                              <tr 
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                style={{
                                  cursor: 'pointer',
                                  background: selectedOrderId === order.id ? 'rgba(247, 52, 12, 0.08)' : '',
                                  transition: 'background 0.2s'
                                }}
                              >
                                <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{order.id.slice(-6)}</td>
                                <td>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customerName}</div>
                                  {order.phone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.phone}</div>}
                                </td>
                                <td>
                                  <span className={styles.badge} style={{
                                    fontSize: '0.68rem',
                                    background: order.tipoEntrega === 'a_domicilio' ? 'var(--primary-glow)' : 'rgba(255,255,255,0.05)',
                                    color: order.tipoEntrega === 'a_domicilio' ? 'var(--primary)' : 'var(--text-secondary)',
                                    display: 'inline-block',
                                    marginBottom: '2px',
                                    padding: '2px 6px'
                                  }}>
                                    {order.tipoEntrega === 'a_domicilio' ? 'A domicilio' :
                                     order.tipoEntrega === 'para_comer_aqui' ? 'Comer aquí' :
                                     order.tipoEntrega === 'para_llevar' ? 'Para llevar' :
                                     order.tipoEntrega === 'para_recoger' ? 'Recoger' :
                                     order.tipoEntrega === 'por_app' ? 'Por App' : 'A domicilio'}
                                  </span>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{branchName}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem' }} title={order.address}>
                                  {order.tipoEntrega === 'a_domicilio' ? (
                                    order.address.length > 18 ? order.address.slice(0, 18) + '...' : order.address
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Consumo local</span>
                                  )}
                                </td>
                                <td>
                                  {order.tipoEntrega === 'a_domicilio' ? (
                                    <select
                                      className={styles.formInput}
                                      style={{
                                        padding: '4px 6px',
                                        fontSize: '0.75rem',
                                        height: 'auto',
                                        width: '110px',
                                        borderRadius: '6px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                      }}
                                      value={order.repartidorId || ""}
                                      onChange={(e) => updateOrderDriver(order.id, e.target.value || null)}
                                    >
                                      <option value="">Sin Asignar</option>
                                      {personnel.filter(p => p.role === "Repartidor").map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${order.total}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemsSummary}>
                                    {itemsSummary}
                                  </div>
                                </td>
                                <td>
                                  <select
                                    className={styles.formInput}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      height: 'auto',
                                      width: 'auto',
                                      borderRadius: '6px',
                                      background: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)',
                                      cursor: 'pointer'
                                    }}
                                    value={order.status}
                                    onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                                  >
                                    <option value="creada">Creada</option>
                                    <option value="en_preparacion">En Preparación</option>
                                    <option value="lista">Lista (Despacho)</option>
                                    <option value="en_camino">En Camino</option>
                                    <option value="entregada">Entregada</option>
                                    <option value="cancelada">Cancelada</option>
                                  </select>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    {(order.status === 'lista' || order.status === 'creada' || order.status === 'en_preparacion') && (
                                      <button
                                        onClick={() => handleDispatchOrder(order)}
                                        className={styles.formBtn}
                                        style={{
                                          padding: '4px 8px',
                                          margin: 0,
                                          height: 'auto',
                                          width: 'auto',
                                          fontSize: '0.72rem',
                                          background: 'var(--success)',
                                          color: 'white',
                                          fontWeight: 600,
                                          border: 'none',
                                          borderRadius: '4px',
                                          boxShadow: 'none'
                                        }}
                                        title="Crear envío y despachar a delivery"
                                      >
                                        Despachar
                                      </button>
                                    )}
                                    <button
                                      className={`${styles.actionBtn} ${styles.btnDanger}`}
                                      onClick={() => removeOrder(order.id)}
                                      style={{ padding: '4px', width: 'fit-content' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                No hay órdenes registradas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Map Panel widget right side */}
                  <div className="glass-panel" style={{ position: "relative", height: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                    <MapContainer selectedOrderId={selectedOrderId} />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: GESTIONAR PERSONAL */}
          {activeTab === "personnel" && (
            <div className={styles.deliveriesGrid}>
              
              {/* Formulario (Izquierda, 380px) */}
              <div className={styles.sidebarPanel}>
                <div className={`glass-panel ${styles.formCard}`}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserPlus size={18} /> Registrar Usuario/Personal
                  </h3>
                  <form onSubmit={handleCreateStaff} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {staffError && <div style={{ color: "var(--danger)", background: "var(--danger-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{staffError}</div>}
                    {staffMessage && <div style={{ color: "var(--success)", background: "var(--success-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{staffMessage}</div>}

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Nombre Completo *</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Gabriela Vargas" 
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={staffIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Correo Electrónico *</label>
                      <input 
                        type="email" 
                        placeholder="gaby@reparto.com" 
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={staffIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Teléfono (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 5512345678" 
                        value={newStaffPhone}
                        onChange={(e) => setNewStaffPhone(e.target.value)}
                        className={styles.formInput}
                        disabled={staffIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Contraseña *</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={staffIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Empresa Perteneciente *</label>
                      <select
                        value={newStaffCompanyId}
                        onChange={(e) => setNewStaffCompanyId(e.target.value)}
                        className={styles.formInput}
                        style={{ color: "var(--text-primary)" }}
                        required
                        disabled={staffIsLoading}
                      >
                        {superAdminCompanies.map((comp, idx) => (
                          <option key={`${comp.idEmpresa}-${idx}`} value={comp.idEmpresa}>
                            {comp.Nombre_Empresa || comp.NombreEmpresa}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Rol Asignado</label>
                      <select
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value)}
                        className={styles.formInput}
                        style={{ color: "var(--text-primary)" }}
                        disabled={staffIsLoading}
                      >
                        <option value="Dispatcher">Despachador</option>
                        <option value="Soporte">Soporte</option>
                        <option value="Administrador">Administrador</option>
                        <option value="Mesero">Mesero</option>
                        <option value="Repartidor">Repartidor</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Turno</label>
                      <select
                        value={newStaffShift}
                        onChange={(e) => setNewStaffShift(e.target.value as "Matutino" | "Vespertino" | "Nocturno")}
                        className={styles.formInput}
                        style={{ color: "var(--text-primary)" }}
                        disabled={staffIsLoading}
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Nocturno">Nocturno</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Sucursales Vinculadas</label>
                      {branches.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '100px',
                          overflowY: 'auto',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          {branches.map(b => (
                            <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={newStaffBranches.includes(b.id)}
                                disabled={staffIsLoading}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewStaffBranches(prev => [...prev, b.id]);
                                  } else {
                                    setNewStaffBranches(prev => prev.filter(id => id !== b.id));
                                  }
                                }}
                              />
                              {b.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No hay sucursales disponibles.
                        </span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Foto de Perfil</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleStaffPhotoUpload}
                        className={styles.formInput}
                        style={{ padding: "6px" }}
                        disabled={staffIsLoading}
                      />
                      {newStaffPhoto && (
                        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", background: "var(--success-glow)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(247, 52, 12, 0.2)" }}>
                          <img 
                            src={newStaffPhoto} 
                            alt="Avatar Vista previa" 
                            style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} 
                          />
                          <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 500 }}>Foto validada</span>
                          <button 
                            type="button" 
                            onClick={() => { setNewStaffPhoto(""); setNewStaffPhotoFile(null); }} 
                            style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>

                    {newStaffRole === "Repartidor" && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', marginTop: '4px', marginBottom: '4px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Vehículo de Reparto</h4>
                        
                          <div className={styles.formGroup}>
                            <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Tipo</label>
                            <select
                              value={newStaffVehicle}
                              onChange={(e) => setNewStaffVehicle(e.target.value as any)}
                              className={styles.formInput}
                              disabled={staffIsLoading}
                              style={{ color: "var(--text-primary)", padding: "8px" }}
                            >
                              <option value="Motocicleta">Motocicleta</option>
                              <option value="Bicicleta">Bicicleta</option>
                              <option value="Automóvil">Automóvil</option>
                              <option value="Van">Van</option>
                            </select>
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Modelo</label>
                            <input
                              type="text"
                              placeholder="Honda 150"
                              value={newStaffVehicleModel}
                              onChange={(e) => setNewStaffVehicleModel(e.target.value)}
                              className={styles.formInput}
                              style={{ padding: "8px" }}
                              disabled={staffIsLoading}
                            />
                          </div>

                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Placas</label>
                          <input
                            type="text"
                            placeholder="Ej. 12ABC3"
                            value={newStaffVehiclePlates}
                            onChange={(e) => setNewStaffVehiclePlates(e.target.value)}
                            className={styles.formInput}
                            style={{ padding: "8px" }}
                            disabled={staffIsLoading}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Fotos (Máx 5)</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '4px' }}>
                            {Array.from({ length: 5 }).map((_, idx) => {
                              const preview = newStaffVehiclePhotoPreviews[idx];
                              if (preview) {
                                return (
                                  <div key={idx} style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                                    <img src={preview} alt={`Vehiculo preview ${idx + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStaffVehiclePhotoPreview(idx)}
                                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 3 }}
                                      disabled={staffIsLoading}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              } else {
                                return (
                                  <div 
                                    key={idx} 
                                    style={{ 
                                      position: 'relative', 
                                      width: '100%', 
                                      paddingBottom: '100%', 
                                      borderRadius: '4px', 
                                      border: '1px dashed rgba(255, 255, 255, 0.12)',
                                      background: 'rgba(255, 255, 255, 0.01)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleStaffVehiclePhotosUpload}
                                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                      disabled={staffIsLoading}
                                    />
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', color: 'var(--text-muted)' }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+</span>
                                      <span style={{ fontSize: '0.45rem' }}>Subir</span>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <button type="submit" className={styles.formBtn} style={{ marginTop: "12px", padding: "12px" }} disabled={staffIsLoading}>
                      {staffIsLoading ? "Registrando..." : "Guardar Operador"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Lista (Derecha, 1fr) */}
              <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: "var(--radius-lg)", padding: "20px" }}>
                <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Usuarios Registrados</h3>
                  <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem', padding: '4px 10px', borderRadius: "var(--radius-sm)" }}>
                    {personnel.length} usuarios
                  </span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Rol / Vehículo</th>
                        <th>Sucursales Vinculadas</th>
                        <th>Turno</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {personnel.map((staff) => (
                        <tr key={staff.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {staff.foto ? (
                                <img 
                                  src={staff.foto} 
                                  alt={staff.name} 
                                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {!staff.foto ? (
                                <div style={{ 
                                  width: "32px", 
                                  height: "32px", 
                                  borderRadius: "50%", 
                                  background: "var(--primary-glow)", 
                                  color: "var(--primary)", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  fontSize: "0.8rem",
                                  fontWeight: 600
                                }}>
                                  {staff.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                                </div>
                              ) : null}
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{staff.name}</span>
                            </div>
                          </td>
                          <td>{staff.email}</td>
                          <td>{staff.phone || "-"}</td>
                          <td>
                            <div>
                              <span style={{ 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                fontSize: "0.75rem",
                                background: staff.role === "Administrador" ? "var(--primary-glow)" : "rgba(255,255,255,0.03)",
                                color: staff.role === "Administrador" ? "var(--primary)" : "var(--text-secondary)"
                              }}>
                                {staff.role}
                              </span>
                              {staff.role === "Repartidor" && staff.vehicle && (
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                  {staff.vehicle} {staff.modelo ? `(${staff.modelo})` : ""} {staff.placas ? `• ${staff.placas}` : ""}
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '150px' }}>
                              {staff.sucursales && staff.sucursales.length > 0 ? (
                                staff.sucursales.map((sid) => {
                                  const name = branches.find(b => b.id === sid)?.name || 'Sucursal';
                                  return (
                                    <span key={sid} className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.7rem', padding: '2px 6px' }}>
                                      {name}
                                    </span>
                                  );
                                })
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ninguna</span>
                              )}
                            </div>
                          </td>
                          <td>{staff.shift || "-"}</td>
                          <td>
                            <span style={{ 
                              color: staff.status === "active" ? "var(--success)" : "var(--text-muted)",
                              fontWeight: 600,
                              fontSize: "0.75rem"
                            }}>
                              {staff.status === "active" ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button 
                                onClick={() => handleStartEditStaff(staff)}
                                style={{ color: "var(--primary)", padding: "4px" }}
                                title="Editar operador"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${staff.name}?`)) {
                                    removePersonnel(staff.id);
                                  }
                                }}
                                style={{ color: "var(--danger)", padding: "4px" }}
                                title="Dar de baja"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SUPER ADMINISTRADORES */}
          {activeTab === "super-admins" && isSuperAdmin && (
            <div className={styles.deliveriesGrid}>
              
              {/* Formulario (Izquierda, 380px) */}
              <div className={styles.sidebarPanel}>
                <div className={`glass-panel ${styles.formCard}`}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Shield size={18} /> Registrar SuperAdmin
                  </h3>
                  <form onSubmit={handleCreateSuperAdmin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {saError && <div style={{ color: "var(--danger)", background: "var(--danger-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{saError}</div>}
                    {saMessage && <div style={{ color: "var(--success)", background: "var(--success-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{saMessage}</div>}

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Nombre Completo *</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Juan Pérez" 
                        value={newSaName}
                        onChange={(e) => setNewSaName(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={saIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Correo Electrónico *</label>
                      <input 
                        type="email" 
                        placeholder="admin@reparto.com" 
                        value={newSaEmail}
                        onChange={(e) => setNewSaEmail(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={saIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Teléfono (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 5512345678" 
                        value={newSaPhone}
                        onChange={(e) => setNewSaPhone(e.target.value)}
                        className={styles.formInput}
                        disabled={saIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Contraseña *</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newSaPassword}
                        onChange={(e) => setNewSaPassword(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={saIsLoading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Foto de Perfil</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleSaPhotoUpload}
                        className={styles.formInput}
                        style={{ padding: "6px" }}
                        disabled={saIsLoading}
                      />
                      {newSaPhoto && (
                        <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", background: "var(--success-glow)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(247, 52, 12, 0.2)" }}>
                          <img 
                            src={newSaPhoto} 
                            alt="Avatar Vista previa" 
                            style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} 
                          />
                          <span style={{ fontSize: "0.7rem", color: "var(--success)", fontWeight: 500 }}>Foto validada</span>
                          <button 
                            type="button" 
                            onClick={() => { setNewSaPhoto(""); setNewSaPhotoFile(null); }} 
                            style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--danger)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>

                    <button type="submit" className={styles.formBtn} style={{ marginTop: "12px", padding: "12px" }} disabled={saIsLoading}>
                      {saIsLoading ? "Registrando..." : "Guardar SuperAdmin"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Lista (Derecha, 1fr) */}
              <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: "var(--radius-lg)", padding: "20px" }}>
                <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0 }}>SuperAdministradores Registrados</h3>
                  <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem', padding: '4px 10px', borderRadius: "var(--radius-sm)" }}>
                    {superAdmins.length} superAdmins
                  </span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {superAdmins.map((admin) => (
                        <tr key={admin.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {admin.foto ? (
                                <img 
                                  src={admin.foto} 
                                  alt={admin.name} 
                                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              {!admin.foto ? (
                                <div style={{ 
                                  width: "32px", 
                                  height: "32px", 
                                  borderRadius: "50%", 
                                  background: "var(--primary-glow)", 
                                  color: "var(--primary)", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  fontSize: "0.8rem",
                                  fontWeight: 600
                                }}>
                                  {admin.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()}
                                </div>
                              ) : null}
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{admin.name}</span>
                            </div>
                          </td>
                          <td>{admin.email}</td>
                          <td>{admin.phone || "-"}</td>
                          <td>
                            <span style={{ 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              fontSize: "0.75rem",
                              background: "var(--primary-glow)",
                              color: "var(--primary)"
                            }}>
                              SuperAdmin
                            </span>
                          </td>
                          <td>
                            <span style={{ 
                              color: admin.status === "active" ? "var(--success)" : "var(--text-muted)",
                              fontWeight: 600,
                              fontSize: "0.75rem"
                            }}>
                              {admin.status === "active" ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => {
                                if (window.confirm(`¿Estás seguro de que deseas eliminar al SuperAdministrador ${admin.name}?`)) {
                                  removeSuperAdmin(admin.id);
                                }
                              }}
                              style={{ color: "var(--danger)", padding: "4px" }}
                              title="Dar de baja"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: PRODUCTS */}
          {activeTab === "products" && (
            <div className={styles.deliveriesGrid}>
              
              {/* Formulario (Izquierda, 380px) */}
              <div className={styles.sidebarPanel}>
                <div className={`glass-panel ${styles.formCard}`}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
                    {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                  </h3>
                  <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Nombre del Producto</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Hamburguesa Doble"
                        className={styles.formInput}
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        disabled={productUploadingPhotos}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Precio ($)</label>
                      <input 
                        type="number" 
                        required 
                        placeholder="Ej. 150"
                        className={styles.formInput}
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        disabled={productUploadingPhotos}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Categoría</label>
                      <select 
                        className={styles.formInput}
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value)}
                        disabled={productUploadingPhotos}
                        style={{ color: "var(--text-primary)" }}
                      >
                        <option value="Comida">Comida</option>
                        <option value="Bebidas">Bebidas</option>
                        <option value="Postres">Postres</option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Descripción</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Con queso cheddar y tocino"
                        className={styles.formInput}
                        value={newProductDesc}
                        onChange={(e) => setNewProductDesc(e.target.value)}
                        disabled={productUploadingPhotos}
                      />
                    </div>

                    {/* Sucursales Affiliation */}
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Sucursales Afiliadas</label>
                      {branches.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: '120px',
                          overflowY: 'auto',
                          padding: '10px',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                          {branches.map(b => (
                            <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={newProductBranches.includes(b.id)}
                                disabled={productUploadingPhotos}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewProductBranches(prev => [...prev, b.id]);
                                  } else {
                                    setNewProductBranches(prev => prev.filter(id => id !== b.id));
                                  }
                                }}
                              />
                              {b.name}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          No hay sucursales disponibles.
                        </span>
                      )}
                    </div>

                    {/* Photo Grid (Max 8 photos) */}
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Fotos del Producto (Máx 8 fotos)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '6px' }}>
                        {Array.from({ length: 8 }).map((_, idx) => {
                          const preview = newProductPhotoPreviews[idx];
                          if (preview) {
                            return (
                              <div key={idx} style={{ position: 'relative', width: '100%', paddingBottom: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                                <img src={preview} alt={`Preview ${idx + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductPhotoPreview(idx)}
                                  style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 3 }}
                                  disabled={productUploadingPhotos}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  position: 'relative', 
                                  width: '100%', 
                                  paddingBottom: '100%', 
                                  borderRadius: 'var(--radius-md)', 
                                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleProductPhotosUpload}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                                  disabled={productUploadingPhotos}
                                />
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', color: 'var(--text-muted)' }}>
                                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>+</span>
                                  <span style={{ fontSize: '0.55rem' }}>Subir</span>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button type="submit" className={styles.formBtn} disabled={productUploadingPhotos} style={{ flex: 1 }}>
                        {productUploadingPhotos ? (
                          "Guardando..."
                        ) : editingProduct ? (
                          "Guardar Cambios"
                        ) : (
                          <><Plus size={18} /> Registrar Producto</>
                        )}
                      </button>
                      {editingProduct && (
                        <button 
                          type="button" 
                          className={styles.formBtn} 
                          onClick={handleCancelProductEdit}
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.1)', flex: 1 }}
                          disabled={productUploadingPhotos}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Lista (Derecha, 1fr) */}
              <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Productos Activos</h2>
                  <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem', padding: '4px 10px' }}>
                    {products.length} registrados
                  </span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre / Descripción</th>
                        <th>Categoría</th>
                        <th>Sucursales Afiliadas</th>
                        <th>Precio</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => {
                        const firstPhoto = prod.fotos && prod.fotos[0];
                        const affiliatedBranches = (prod.idSucursales || [])
                          .map(sid => branches.find(b => b.id === sid)?.name)
                          .filter(Boolean);

                        return (
                          <tr 
                            key={prod.id}
                            onClick={() => handleEditProductClick(prod)}
                            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}
                          >
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {firstPhoto ? (
                                  <img 
                                    src={firstPhoto} 
                                    alt={prod.name} 
                                    style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    <Package size={16} />
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {prod.description || 'Sin descripción'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.badge} style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                                {prod.category}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                                {affiliatedBranches.length > 0 ? (
                                  affiliatedBranches.map((name, idx) => (
                                    <span key={idx} className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.7rem', padding: '2px 6px' }}>
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ninguna</span>
                                )}
                              </div>
                            </td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>${prod.price.toFixed(2)}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className={styles.actionBtn}
                                  onClick={() => handleEditProductClick(prod)}
                                  style={{ width: 'fit-content', padding: '6px', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  className={`${styles.actionBtn} ${styles.btnDanger}`}
                                  onClick={() => {
                                    if (window.confirm(`¿Estás seguro de que deseas eliminar el producto ${prod.name}?`)) {
                                      removeProduct(prod.id);
                                    }
                                  }}
                                  style={{ width: 'fit-content', padding: '6px' }}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No hay productos registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: WEB CUSTOMIZATION (PERSONALIZACIÓN DE WEB) */}
          {activeTab === "web-customization" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Header Panel */}
              <div className="glass-panel" style={{ padding: "24px", borderRadius: "var(--radius-lg)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h3 className={styles.sectionTitle} style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                    <Globe size={24} style={{ color: "var(--primary)" }} /> Personalización de Web y Landing Page
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: 0 }}>
                    Configura la identidad de marca, logotipos, colores (RGB), secciones, sucursales y redes de tu sitio web único.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleSaveWebCustomization()}
                    disabled={webIsSaving || webIsLoading}
                    className={styles.formBtn}
                    style={{ margin: 0, padding: "10px 24px", display: "flex", alignItems: "center", gap: "8px", width: "auto" }}
                  >
                    <Save size={16} /> {webIsSaving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>

              {/* Status Alerts */}
              {webError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "14px 18px", background: "var(--danger-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--danger)" }}>
                  {webError}
                </div>
              )}
              {webMessage && (
                <div style={{ color: "var(--success)", fontSize: "0.85rem", padding: "14px 18px", background: "var(--success-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--success)", fontWeight: 500 }}>
                  {webMessage}
                </div>
              )}

              {/* Master Form Grid 1: Visual Media & Colors */}
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px" }}>
                
                {/* Left Column: Logo, Portada & Galería */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  {/* Card: Logo de la Web */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem" }}>Logotipo Oficial (Máx 250 MB)</h4>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Proporción cuadrada 1:1</span>
                    </div>

                    <div style={{
                      border: "2px dashed var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      textAlign: "center",
                      background: "rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "140px"
                    }}>
                      {webLogo ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                          <img 
                            src={webLogo} 
                            alt="Logo Web" 
                            style={{ width: "100px", height: "100px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                          />
                          <div style={{ display: "flex", gap: "10px" }}>
                            <label style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--primary)", background: "var(--primary-glow)", border: "1px solid rgba(247, 52, 12, 0.2)", borderRadius: "var(--radius-sm)", padding: "4px 10px" }}>
                              Cambiar Logo
                              <input type="file" accept="image/*" onChange={handleWebLogoUpload} style={{ display: "none" }} disabled={webLogoUploading} />
                            </label>
                            <button
                              type="button"
                              onClick={() => setWebLogo("")}
                              style={{ fontSize: "0.75rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label style={{ cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Upload size={28} style={{ color: "var(--text-muted)" }} />
                          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                            {webLogoUploading ? "Subiendo al bucket..." : "Subir logo de la web"}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Límite: hasta 250 MB. PNG, JPG, SVG o WEBP.
                          </span>
                          <input type="file" accept="image/*" onChange={handleWebLogoUpload} style={{ display: "none" }} disabled={webLogoUploading} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Card: Portada / Banner */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem" }}>Portada / Banner Principal (Máx 350 MB)</h4>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Panorámica 16:9 / 21:9</span>
                    </div>

                    <div style={{
                      border: "2px dashed var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      textAlign: "center",
                      background: "rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "150px"
                    }}>
                      {webPortada ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
                          <img 
                            src={webPortada} 
                            alt="Portada Web" 
                            style={{ width: "100%", height: "130px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                          />
                          <div style={{ display: "flex", gap: "10px" }}>
                            <label style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--primary)", background: "var(--primary-glow)", border: "1px solid rgba(247, 52, 12, 0.2)", borderRadius: "var(--radius-sm)", padding: "4px 10px" }}>
                              Cambiar Portada
                              <input type="file" accept="image/*" onChange={handleWebPortadaUpload} style={{ display: "none" }} disabled={webPortadaUploading} />
                            </label>
                            <button
                              type="button"
                              onClick={() => setWebPortada("")}
                              style={{ fontSize: "0.75rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label style={{ cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Camera size={28} style={{ color: "var(--text-muted)" }} />
                          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                            {webPortadaUploading ? "Subiendo portada al bucket..." : "Subir imagen de portada / banner"}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Límite: hasta 350 MB. Formato horizontal recomendado.
                          </span>
                          <input type="file" accept="image/*" onChange={handleWebPortadaUpload} style={{ display: "none" }} disabled={webPortadaUploading} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Card: Galería de Fotos */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem" }}>Galería de Fotos ({webGaleria.length})</h4>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Máximo 350 MB por imagen</span>
                      </div>
                      <label style={{
                        background: "var(--primary-glow)",
                        border: "1px solid rgba(247, 52, 12, 0.2)",
                        color: "var(--primary)",
                        padding: "4px 10px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <Plus size={12} /> {webGaleriaUploading ? "Subiendo..." : "Agregar Fotos"}
                        <input type="file" accept="image/*" multiple onChange={handleWebGaleriaUpload} style={{ display: "none" }} disabled={webGaleriaUploading} />
                      </label>
                    </div>

                    {webGaleria.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "10px", maxHeight: "260px", overflowY: "auto", padding: "4px" }}>
                        {webGaleria.map((photoUrl, idx) => (
                          <div key={idx} style={{ position: "relative", width: "100%", height: "80px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                            <img src={photoUrl} alt={`Foto ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveWebGaleriaPhoto(idx)}
                              title="Eliminar foto"
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                background: "rgba(0,0,0,0.65)",
                                color: "#ef4444",
                                border: "none",
                                borderRadius: "50%",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer"
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.78rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-md)" }}>
                        No hay fotografías en la galería aún. Haz clic en "Agregar Fotos" para mostrar tus productos o instalaciones.
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Column: Colors, Live Preview & Contact */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  {/* Card: Paleta de Colores RGB/HEX */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <div>
                        <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Palette size={16} style={{ color: "var(--primary)" }} /> Paleta de Colores (RGB / HEX)
                        </h4>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Personaliza los tonos de fondo, títulos y texto</span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                      {/* Color de Fondo */}
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                          Color de Fondo
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input 
                            type="color" 
                            value={webColorFondo} 
                            onChange={(e) => setWebColorFondo(e.target.value)}
                            style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer", padding: "2px", background: "none" }}
                          />
                          <input 
                            type="text" 
                            value={webColorFondo} 
                            onChange={(e) => setWebColorFondo(e.target.value)}
                            className={styles.formInput}
                            style={{ padding: "6px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                          />
                        </div>
                      </div>

                      {/* Color de Títulos */}
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                          Color de Títulos
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input 
                            type="color" 
                            value={webColorTitulos} 
                            onChange={(e) => setWebColorTitulos(e.target.value)}
                            style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer", padding: "2px", background: "none" }}
                          />
                          <input 
                            type="text" 
                            value={webColorTitulos} 
                            onChange={(e) => setWebColorTitulos(e.target.value)}
                            className={styles.formInput}
                            style={{ padding: "6px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                          />
                        </div>
                      </div>

                      {/* Color de Texto */}
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px", display: "block" }}>
                          Color de Texto
                        </label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <input 
                            type="color" 
                            value={webColorTexto} 
                            onChange={(e) => setWebColorTexto(e.target.value)}
                            style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", cursor: "pointer", padding: "2px", background: "none" }}
                          />
                          <input 
                            type="text" 
                            value={webColorTexto} 
                            onChange={(e) => setWebColorTexto(e.target.value)}
                            className={styles.formInput}
                            style={{ padding: "6px 8px", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Presets rápidos */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Presets rápidos:</span>
                      <button
                        type="button"
                        onClick={() => { setWebColorFondo("#ffffff"); setWebColorTitulos("#F7340C"); setWebColorTexto("#0f172a"); }}
                        style={{ fontSize: "0.68rem", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        Blanco / Rojo Oficial
                      </button>
                      <button
                        type="button"
                        onClick={() => { setWebColorFondo("#0f172a"); setWebColorTitulos("#F7340C"); setWebColorTexto("#f8fafc"); }}
                        style={{ fontSize: "0.68rem", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        Oscuro Elegante
                      </button>
                      <button
                        type="button"
                        onClick={() => { setWebColorFondo("#ffffff"); setWebColorTitulos("#0f172a"); setWebColorTexto("#334155"); }}
                        style={{ fontSize: "0.68rem", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        Negro Clásico
                      </button>
                    </div>

                    {/* Live Preview Widget */}
                    <div style={{
                      backgroundColor: webColorFondo,
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "16px",
                      transition: "all 0.2s ease"
                    }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: webColorTitulos, marginBottom: "4px" }}>
                        Previsualización en Vivo de la Web
                      </div>
                      <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 700, color: webColorTitulos }}>
                        Bienvenido a Nuestro Menú Digital
                      </h3>
                      <p style={{ margin: "0 0 12px 0", fontSize: "0.8rem", color: webColorTexto, lineHeight: "1.4" }}>
                        Pide tus alimentos y productos favoritos directamente a domicilio o con recogida en sucursal.
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{
                          background: webColorTitulos,
                          color: webColorFondo,
                          padding: "6px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          display: "inline-block"
                        }}>
                          Ver Productos
                        </div>
                        <div style={{
                          background: "transparent",
                          color: webColorTitulos,
                          border: `1px solid ${webColorTitulos}`,
                          padding: "6px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          display: "inline-block"
                        }}>
                          Nuestras Sucursales
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Canales de Contacto y Redes Sociales */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <h4 className={styles.inputLabel} style={{ marginBottom: "14px", fontSize: "0.95rem" }}>
                      Contacto y Redes Sociales
                    </h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.72rem" }}>WhatsApp Oficial de Pedidos</label>
                        <input
                          type="tel"
                          placeholder="Ej. 5512345678"
                          value={webNumeroWhatsapp}
                          onChange={(e) => setWebNumeroWhatsapp(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.72rem" }}>Correo General de Contacto</label>
                        <input
                          type="email"
                          placeholder="contacto@tunegocio.com"
                          value={webCorreoGeneral}
                          onChange={(e) => setWebCorreoGeneral(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.72rem" }}>Instagram</label>
                        <input
                          type="text"
                          placeholder="@tu_negocio o enlace"
                          value={webInstagram}
                          onChange={(e) => setWebInstagram(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div className={styles.formGroup} style={{ margin: 0 }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.72rem" }}>Facebook</label>
                        <input
                          type="text"
                          placeholder="facebook.com/tu_negocio"
                          value={webFacebook}
                          onChange={(e) => setWebFacebook(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div className={styles.formGroup} style={{ margin: 0, gridColumn: "span 2" }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.72rem" }}>TikTok</label>
                        <input
                          type="text"
                          placeholder="@tu_negocio o enlace"
                          value={webTiktok}
                          onChange={(e) => setWebTiktok(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Card: SEO y Metadatos de la Web (Meta Título y Meta Descripción) */}
              <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Globe size={18} style={{ color: "var(--primary)" }} /> SEO y Metadatos de la Landing Page
                    </h4>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Personaliza el título y la descripción que aparecerán en Google, pestañas del navegador y al compartir en redes sociales (WhatsApp, Facebook, Instagram).
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                  {/* Inputs Column */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.76rem", margin: 0 }}>Meta Título (Pestaña / Buscadores)</label>
                        <span style={{ fontSize: "0.68rem", color: webMetaTitulo.length > 60 ? "var(--danger)" : "var(--text-muted)", fontWeight: 500 }}>
                          {webMetaTitulo.length}/60 car.
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Ej. Pizzas San Juan | Las Mejores Pizzas Artesanales"
                        value={webMetaTitulo}
                        onChange={(e) => setWebMetaTitulo(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "9px 12px", fontSize: "0.85rem" }}
                        maxLength={70}
                      />
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Recomendado: entre 40 y 60 caracteres para una visualización completa en buscadores.
                      </span>
                    </div>

                    <div className={styles.formGroup} style={{ margin: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.76rem", margin: 0 }}>Meta Descripción (Resumen en Buscadores y Redes)</label>
                        <span style={{ fontSize: "0.68rem", color: webMetaDescripcion.length > 160 ? "var(--danger)" : "var(--text-muted)", fontWeight: 500 }}>
                          {webMetaDescripcion.length}/160 car.
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Ej. Ordena tus pizzas y platillos favoritos en línea. Menú digital actualizado, promociones exclusivas y servicio de entrega a domicilio rápido."
                        value={webMetaDescripcion}
                        onChange={(e) => setWebMetaDescripcion(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "9px 12px", fontSize: "0.82rem", resize: "vertical" }}
                        maxLength={180}
                      />
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        Recomendado: entre 120 y 160 caracteres para evitar que Google corte el resumen.
                      </span>
                    </div>
                  </div>

                  {/* Live Google Search Snippet Preview Column */}
                  <div style={{
                    background: "rgba(0, 0, 0, 0.02)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "8px"
                  }}>
                    <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 700 }}>
                      Previsualización en Google Search
                    </div>
                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ fontSize: "0.75rem", color: "#202124", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span style={{ color: "#202124", fontWeight: 500 }}>reparto.mx</span>
                        <span style={{ color: "#5f6368" }}>› {currentCompanyId || "tienda"}</span>
                      </div>
                      <div style={{ fontSize: "1rem", color: "#1a0dab", fontWeight: 500, lineHeight: "1.3", textDecoration: "underline", cursor: "pointer", marginBottom: "4px" }}>
                        {webMetaTitulo.trim() || "Nombre de Tu Negocio | Menú y Pedidos Online"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#4d5156", lineHeight: "1.4" }}>
                        {webMetaDescripcion.trim() || "Pide en línea a domicilio o para recoger. Explora nuestro menú digital con precios actualizados y promociones exclusivas."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Form Grid 2: Sucursales Habilitadas & Orden de Secciones */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                
                {/* Card: Sucursales Habilitadas en la Web */}
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem" }}>
                        Sucursales Habilitadas en Web ({webSucursalesActivas.length}/{branches.length})
                      </h4>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Selecciona las sucursales visibles en la tienda online</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                    {branches.map((b) => {
                      const isActive = webSucursalesActivas.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleToggleWebSucursal(b.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: isActive ? "rgba(247, 52, 12, 0.05)" : "rgba(255, 255, 255, 0.02)",
                            border: `1px solid ${isActive ? "rgba(247, 52, 12, 0.25)" : "var(--border-color)"}`,
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{b.name}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{b.address || "Sin dirección"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              color: isActive ? "var(--primary)" : "var(--text-muted)"
                            }}>
                              {isActive ? "Visible en Web" : "Oculta"}
                            </span>
                            <div style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              border: `1px solid ${isActive ? "var(--primary)" : "var(--border-color)"}`,
                              background: isActive ? "var(--primary)" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff"
                            }}>
                              {isActive && <Check size={12} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {branches.length === 0 && (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        No hay sucursales registradas para esta empresa.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card: Estructura y Orden de la Web */}
                <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <h4 className={styles.inputLabel} style={{ margin: 0, fontSize: "0.95rem" }}>
                        Estructura y Orden de Secciones (Landing)
                      </h4>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Organiza la jerarquía de contenidos con Subir/Bajar</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {webOrdenWeb.map((secKey, idx) => {
                      const labelsMap: { [k: string]: { name: string; desc: string } } = {
                        hero: { name: "Portada y Presentación (Hero)", desc: "Logotipo, banner panorámico y llamado a la acción" },
                        sucursales: { name: "Nuestras Sucursales", desc: "Listado de sucursales activas, direcciones y teléfonos" },
                        productos: { name: "Catálogo y Menú Digital", desc: "Listado de productos con fotos, precios y categorías" },
                        galeria: { name: "Galería Fotográfica", desc: "Mosaico visual de platillos, local e instalaciones" },
                        contacto: { name: "Contacto y Redes Sociales", desc: "WhatsApp directo, email de info y links de redes" }
                      };
                      const info = labelsMap[secKey] || { name: secKey, desc: "Sección personalizada" };

                      return (
                        <div
                          key={secKey}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-md)"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid var(--border-color)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--text-secondary)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              {idx + 1}
                            </span>
                            <div>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{info.name}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{info.desc}</div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleMoveWebSection(idx, "up")}
                              disabled={idx === 0}
                              title="Subir posición"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--border-color)",
                                color: idx === 0 ? "var(--text-muted)" : "var(--text-primary)",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                cursor: idx === 0 ? "not-allowed" : "pointer"
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveWebSection(idx, "down")}
                              disabled={idx === webOrdenWeb.length - 1}
                              title="Bajar posición"
                              style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--border-color)",
                                color: idx === webOrdenWeb.length - 1 ? "var(--text-muted)" : "var(--text-primary)",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                cursor: idx === webOrdenWeb.length - 1 ? "not-allowed" : "pointer"
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bottom Action Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleSaveWebCustomization()}
                  disabled={webIsSaving || webIsLoading}
                  className={styles.formBtn}
                  style={{ margin: 0, padding: "12px 32px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "10px", width: "auto" }}
                >
                  <Save size={18} /> {webIsSaving ? "Guardando Configuración..." : "Guardar Personalización"}
                </button>
              </div>

            </div>
          )}

          {/* TAB 6: BRANCHES */}
          {activeTab === "branches" && (
            <div className={styles.deliveriesGrid}>
              
              {/* Formulario (Izquierda, 380px) */}
              <div className={styles.sidebarPanel}>
                <div className={`glass-panel ${styles.formCard}`}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Nueva Sucursal</h3>
                  <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Nombre de Sucursal</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Sucursal Reforma"
                        className={styles.formInput}
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        disabled={branchUploadingPhotos}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ position: 'relative' }}>
                      <label className={styles.inputLabel}>Dirección</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ej. Av. Reforma 222"
                        className={styles.formInput}
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                        onFocus={() => setShowNewBranchSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNewBranchSuggestions(false), 250)}
                        disabled={branchUploadingPhotos}
                      />
                      {isLoadingNewBranchSuggestions && (
                        <div style={{ position: 'absolute', right: '12px', top: '35px', fontSize: '0.7rem', color: 'var(--primary)' }}>
                          Buscando...
                        </div>
                      )}
                      {showNewBranchSuggestions && newBranchSuggestions.length > 0 && (
                        <ul style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          listStyle: 'none',
                          padding: '4px 0',
                          margin: '4px 0 0 0',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          {newBranchSuggestions.map((s, idx) => (
                            <li 
                              key={idx}
                              onMouseDown={() => {
                                newBranchAddressSelectedFromListRef.current = true;
                                setNewBranchAddress(s.place_name);
                                setNewBranchLat(s.center[1]);
                                setNewBranchLng(s.center[0]);
                                setShowNewBranchSuggestions(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                                borderBottom: idx < newBranchSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            >
                              📍 {s.place_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Enlace de Google Maps (Ubicación)</label>
                      <input 
                        type="url" 
                        placeholder="Ej. https://maps.google.com/?q=..."
                        className={styles.formInput}
                        value={newBranchMapLink}
                        onChange={(e) => setNewBranchMapLink(e.target.value)}
                        disabled={branchUploadingPhotos}
                      />
                    </div>
                    
                    {/* Teléfonos Dinámicos */}
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Teléfonos de la Sucursal</label>
                      {newBranchPhones.map((phone, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                          <input 
                            type="text" 
                            required={idx === 0} 
                            placeholder={idx === 0 ? "Ej. 55-1234-5678 (Principal)" : "Ej. 55-9876-5432 (Opcional)"}
                            className={styles.formInput}
                            value={phone}
                            onChange={(e) => handleBranchPhoneChange(idx, e.target.value)}
                            style={{ flex: 1 }}
                            disabled={branchUploadingPhotos}
                          />
                          {newBranchPhones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBranchPhoneField(idx)}
                              className={styles.actionBtn}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.2)',
                                padding: '0 12px',
                                height: '42px',
                                borderRadius: 'var(--radius-md)'
                              }}
                              disabled={branchUploadingPhotos}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddBranchPhoneField}
                        className={styles.actionBtn}
                        style={{
                          width: '100%',
                          fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.05)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          padding: '8px',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                        disabled={branchUploadingPhotos}
                      >
                        <Plus size={14} /> Agregar Teléfono
                      </button>
                    </div>

                    {/* Tarifas de Envío */}
                    <div className={styles.formGroup} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}>
                      <label className={styles.inputLabel} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Tarifas de Envío por Distancia</span>
                        <button
                          type="button"
                          onClick={handleAddBranchRate}
                          style={{
                            background: 'var(--primary-glow)',
                            border: '1px solid rgba(247, 52, 12, 0.15)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          disabled={branchUploadingPhotos}
                        >
                          <Plus size={12} /> Agregar Rango
                        </button>
                      </label>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px', marginBottom: '10px' }}>
                        {newBranchRates.map((rate, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input 
                                type="number" 
                                step="any"
                                required 
                                placeholder="Desde"
                                className={styles.formInput}
                                value={rate.min_km ?? ""}
                                onChange={(e) => handleBranchRateChange(idx, 'min_km', e.target.value)}
                                style={{ width: '65px', padding: '6px 8px', fontSize: '0.8rem' }}
                                disabled={branchUploadingPhotos}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', alignSelf: 'center' }}>a</span>
                              <input 
                                type="number" 
                                step="any"
                                required 
                                placeholder="Hasta"
                                className={styles.formInput}
                                value={rate.max_km ?? ""}
                                onChange={(e) => handleBranchRateChange(idx, 'max_km', e.target.value)}
                                style={{ width: '65px', padding: '6px 8px', fontSize: '0.8rem' }}
                                disabled={branchUploadingPhotos}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', alignSelf: 'center' }}>km:</span>
                            </div>
                            <div style={{ width: '90px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>$</span>
                              <input 
                                type="number" 
                                required 
                                placeholder="Precio"
                                className={styles.formInput}
                                value={rate.precio ?? ""}
                                onChange={(e) => handleBranchRateChange(idx, 'precio', e.target.value)}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
                                disabled={branchUploadingPhotos}
                              />
                            </div>
                            {newBranchRates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBranchRate(idx)}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.15)',
                                  borderRadius: 'var(--radius-md)',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                disabled={branchUploadingPhotos}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Precio por Km Extra</span>
                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>$</span>
                          <input 
                            type="number" 
                            required 
                            placeholder="10"
                            className={styles.formInput}
                            value={newBranchExtraKmPrice}
                            onChange={(e) => setNewBranchExtraKmPrice(e.target.value)}
                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem' }}
                            disabled={branchUploadingPhotos}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Selector de fotos de la sucursal (6 recuadros premium) */}
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ marginBottom: '6px', display: 'block' }}>
                        Fotos de la Sucursal (Máx 6 fotos)
                      </label>
                      <div 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(3, 1fr)', 
                          gap: '8px', 
                          marginTop: '6px' 
                        }}
                      >
                        {Array.from({ length: 6 }).map((_, idx) => {
                          const preview = newBranchPhotoPreviews[idx];
                          if (preview) {
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  position: 'relative', 
                                  width: '100%', 
                                  paddingBottom: '100%', 
                                  borderRadius: 'var(--radius-md)', 
                                  overflow: 'hidden', 
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  background: 'rgba(255,255,255,0.02)'
                                }}
                              >
                                <img 
                                  src={preview} 
                                  alt={`Sucursal preview ${idx + 1}`} 
                                  style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover' 
                                  }} 
                                />
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveBranchPhotoPreview(idx)}
                                  style={{ 
                                    position: 'absolute', 
                                    top: 3, 
                                    right: 3, 
                                    background: 'rgba(239, 68, 68, 0.9)', 
                                    border: 'none', 
                                    color: 'white', 
                                    borderRadius: '50%', 
                                    width: '18px', 
                                    height: '18px', 
                                    fontSize: '9px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    padding: 0,
                                    zIndex: 3
                                  }}
                                  disabled={branchUploadingPhotos}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div 
                                key={idx} 
                                style={{ 
                                  position: 'relative', 
                                  width: '100%', 
                                  paddingBottom: '100%', 
                                  borderRadius: 'var(--radius-md)', 
                                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  if (!branchUploadingPhotos) {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                }}
                              >
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleBranchPhotosUpload}
                                  style={{ 
                                    position: 'absolute', 
                                    top: 0, 
                                    left: 0, 
                                    width: '100%', 
                                    height: '100%', 
                                    opacity: 0, 
                                    cursor: 'pointer',
                                    zIndex: 2
                                  }}
                                  disabled={branchUploadingPhotos}
                                />
                                <div 
                                  style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: '2px',
                                    color: 'var(--text-muted)'
                                  }}
                                >
                                  <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>+</span>
                                  <span style={{ fontSize: '0.6rem' }}>Subir</span>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>

                    <button type="submit" className={styles.formBtn} disabled={branchUploadingPhotos} style={{ marginTop: '10px' }}>
                      {branchUploadingPhotos ? (
                        "Registrando y subiendo fotos..."
                      ) : (
                        <><Plus size={18} /> Registrar Sucursal</>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Lista (Derecha, 1fr) */}
              <div className={`glass-panel ${styles.listPanel}`} style={{ borderRadius: 'var(--radius-lg)' }}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Sucursales Activas</h2>
                  <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.85rem', padding: '4px 10px' }}>
                    {branches.length} operativas
                  </span>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Dirección</th>
                        <th>Teléfono principal</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branches.map((branch) => (
                        <tr 
                          key={branch.id} 
                          onClick={() => setSelectedBranchDetail(branch)}
                          style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        >
                          <td style={{ fontWeight: 600 }}>{branch.name}</td>
                          <td>
                             {branch.address}
                             {branch.mapLink && (
                               <a 
                                 href={branch.mapLink} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 onClick={(e) => e.stopPropagation()}
                                 style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.75rem', fontWeight: 600 }}
                                 title="Abrir ubicación en Google Maps"
                               >
                                 (Ver Mapa)
                               </a>
                             )}
                           </td>
                          <td>{branch.phone || (branch.telefonos && branch.telefonos[0]) || 'S/T'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button 
                                className={styles.actionBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditBranch(branch);
                                  setSelectedBranchDetail(branch);
                                }}
                                style={{ width: 'fit-content', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                                title="Editar Sucursal"
                              >
                                <Edit2 size={15} style={{ color: '#6366f1' }} />
                              </button>
                              <button 
                                className={`${styles.actionBtn} ${styles.btnDanger}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`¿Estás seguro de que deseas eliminar la sucursal ${branch.name}?`)) {
                                    removeBranch(branch.id);
                                  }
                                }}
                                style={{ width: 'fit-content' }}
                                title="Eliminar Sucursal"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {branches.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No hay sucursales registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          
          {/* TAB: CREAR BROKER */}
          {activeTab === "create-broker" && isSuperAdmin && (
            <div className={styles.brokerLayout}>
              
              {/* Formulario (Izquierda) */}
              <div className={`glass-panel ${styles.formCard}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 className={styles.sectionTitle} style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={18} /> {editingBroker ? "Editar Broker" : "Registrar Broker"}
                  </h3>
                  {editingBroker && (
                    <button
                      type="button"
                      onClick={resetBrokerForm}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <form onSubmit={handleCreateBroker} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {brokerError && <div style={{ color: "var(--danger)", background: "var(--danger-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{brokerError}</div>}
                  {brokerMessage && <div style={{ color: "var(--success)", background: "var(--success-glow)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: 500 }}>{brokerMessage}</div>}

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Nombre Completo *</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Carlos Broker" 
                      value={newBrokerName}
                      onChange={(e) => setNewBrokerName(e.target.value)}
                      className={styles.formInput}
                      required
                      disabled={brokerIsLoading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Correo Electrónico *</label>
                    <input 
                      type="email" 
                      placeholder="broker@reparto.com" 
                      value={newBrokerEmail}
                      onChange={(e) => setNewBrokerEmail(e.target.value)}
                      className={styles.formInput}
                      required
                      disabled={brokerIsLoading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Teléfono</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 5512345678" 
                      value={newBrokerPhone}
                      onChange={(e) => setNewBrokerPhone(e.target.value)}
                      className={styles.formInput}
                      disabled={brokerIsLoading}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>
                      {editingBroker ? "Nueva Contraseña (Opcional)" : "Contraseña *"}
                    </label>
                    <input 
                      type="password" 
                      placeholder={editingBroker ? "Dejar en blanco para no cambiar" : "••••••••"} 
                      value={newBrokerPassword}
                      onChange={(e) => setNewBrokerPassword(e.target.value)}
                      className={styles.formInput}
                      required={!editingBroker}
                      disabled={brokerIsLoading}
                    />
                  </div>

                  {editingBroker && (
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Estado del Broker</label>
                      <select 
                        value={editBrokerStatus} 
                        onChange={(e) => setEditBrokerStatus(e.target.value)}
                        className={styles.formInput}
                        disabled={brokerIsLoading}
                      >
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido</option>
                      </select>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Empresas Asociadas (Exclusividad)</label>
                    <select 
                      multiple 
                      value={newBrokerCompanies} 
                      onChange={(e) => {
                        const options = Array.from(e.target.selectedOptions);
                        setNewBrokerCompanies(options.map(o => o.value));
                      }}
                      className={styles.formInput} 
                      style={{ height: "auto", minHeight: "100px" }}
                      disabled={brokerIsLoading}
                    >
                      {superAdminCompanies.map(c => (
                        <option key={c.idEmpresa} value={c.idEmpresa}>
                          {c.NombreEmpresa || c.Nombre_Empresa || c.idEmpresa}
                        </option>
                      ))}
                    </select>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Mantén presionado Ctrl o Cmd para seleccionar varias.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    <button 
                      type="submit" 
                      className={`btn-primary ${styles.btnFull}`}
                      disabled={brokerIsLoading}
                    >
                      {brokerIsLoading 
                        ? (editingBroker ? "Guardando..." : "Registrando...") 
                        : (editingBroker ? "Guardar Cambios" : "Registrar Broker")}
                    </button>
                    {editingBroker && (
                      <button
                        type="button"
                        onClick={resetBrokerForm}
                        style={{
                          padding: "8px 12px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          width: "100%"
                        }}
                      >
                        Cancelar Edición
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Lista (Derecha) */}
              <div className={`glass-panel ${styles.tableCard}`}>
                <h3 className={styles.sectionTitle} style={{ padding: "20px 24px 15px", margin: 0, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <ClipboardList size={20} style={{ color: "var(--primary)" }} /> Brokers Registrados ({brokersList.length})
                </h3>
                
                <div className={styles.tableWrapper} style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <table className={styles.table} style={{ minWidth: "860px" }}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Correo / Tel</th>
                        <th>Estado</th>
                        <th>Empresas Asoc.</th>
                        <th>Repartidores</th>
                        <th style={{ textAlign: "right", minWidth: "230px" }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokersList.map((broker: any) => (
                        <tr key={broker.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{broker.name}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{broker.email}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{broker.phone || "Sin teléfono"}</div>
                          </td>
                          <td>
                            {broker.status === "suspended" ? (
                              <span style={{ 
                                background: "rgba(239, 68, 68, 0.12)", 
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                color: "var(--danger)", 
                                padding: "3px 8px", 
                                borderRadius: "var(--radius-sm)", 
                                fontSize: "0.72rem", 
                                fontWeight: 700 
                              }}>
                                Restringido
                              </span>
                            ) : (
                              <span style={{ 
                                background: "rgba(16, 185, 129, 0.12)", 
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                                color: "#10b981", 
                                padding: "3px 8px", 
                                borderRadius: "var(--radius-sm)", 
                                fontSize: "0.72rem", 
                                fontWeight: 700 
                              }}>
                                Activo
                              </span>
                            )}
                          </td>
                          <td>
                            {broker.empresas_asociadas && broker.empresas_asociadas.length > 0 ? (
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "220px" }}>
                                {broker.empresas_asociadas.map((compId: string) => {
                                  const found = superAdminCompanies.find(c => c.idEmpresa === compId);
                                  const compName = found?.NombreEmpresa || found?.Nombre_Empresa || compId;
                                  return (
                                    <span 
                                      key={compId} 
                                      style={{ 
                                        background: "rgba(247, 52, 12, 0.08)", 
                                        color: "var(--primary)", 
                                        fontSize: "0.72rem", 
                                        padding: "2px 6px", 
                                        borderRadius: "4px",
                                        fontWeight: 500,
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      {compName}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                Sin empresas
                              </span>
                            )}
                          </td>
                          <td>
                            <div className={styles.statusBadge} style={{ background: "var(--bg-accent)", color: "var(--text-secondary)" }}>
                              {(broker.repartidores_asociados || broker.repartidores_asociado || []).length} Repartidores
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                              <button 
                                type="button" 
                                onClick={() => handleEditBrokerClick(broker)}
                                title="Editar datos del broker"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid var(--border-color)",
                                  color: "var(--text-primary)",
                                  padding: "5px 10px",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.borderColor = "var(--primary)";
                                  e.currentTarget.style.color = "var(--primary)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.borderColor = "var(--border-color)";
                                  e.currentTarget.style.color = "var(--text-primary)";
                                }}
                              >
                                <Edit2 size={12} /> Editar
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleToggleBrokerStatus(broker.id, broker.name, broker.status || "active")}
                                title={broker.status === "suspended" ? "Reactivar acceso del broker" : "Restringir acceso del broker"}
                                style={{
                                  background: broker.status === "suspended" 
                                    ? "rgba(16, 185, 129, 0.08)" 
                                    : "rgba(247, 52, 12, 0.08)",
                                  border: broker.status === "suspended" 
                                    ? "1px solid rgba(16, 185, 129, 0.25)" 
                                    : "1px solid rgba(247, 52, 12, 0.25)",
                                  color: broker.status === "suspended" ? "#10b981" : "var(--primary)",
                                  padding: "5px 10px",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  if (broker.status === "suspended") {
                                    e.currentTarget.style.background = "#10b981";
                                    e.currentTarget.style.color = "white";
                                  } else {
                                    e.currentTarget.style.background = "var(--primary)";
                                    e.currentTarget.style.color = "white";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (broker.status === "suspended") {
                                    e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
                                    e.currentTarget.style.color = "#10b981";
                                  } else {
                                    e.currentTarget.style.background = "rgba(247, 52, 12, 0.08)";
                                    e.currentTarget.style.color = "var(--primary)";
                                  }
                                }}
                              >
                                <ShieldAlert size={12} /> {broker.status === "suspended" ? "Reactivar" : "Restringir"}
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleDeleteBroker(broker.id, broker.name, broker.email)}
                                title="Eliminar permanentemente este broker"
                                style={{
                                  background: "rgba(239, 68, 68, 0.08)",
                                  border: "1px solid rgba(239, 68, 68, 0.25)",
                                  color: "var(--danger)",
                                  padding: "5px 10px",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--danger)";
                                  e.currentTarget.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                                  e.currentTarget.style.color = "var(--danger)";
                                }}
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {brokersList.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No hay brokers registrados aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CREATE COMPANY */}
          {activeTab === "create-company" && isSuperAdmin && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className={styles.driversLayout}>
                {/* Left Column: Form details */}
                <div className="glass-panel" style={{ padding: "28px", borderRadius: "var(--radius-lg)", height: "fit-content" }}>
                  <div style={{ marginBottom: "24px" }}>
                    <h3 className={styles.sectionTitle} style={{ fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px" }}>
                      <Building size={22} style={{ color: "var(--primary)" }} /> {editingCompany ? "Editar Empresa" : "Configurar Nueva Empresa"}
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      {editingCompany ? "Modifica los datos de la empresa seleccionada. El ID de la empresa no se puede cambiar." : "Registra una nueva empresa en la plataforma. Llena los campos obligatorios."}
                    </p>
                  </div>

                  {compError && (
                    <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "12px 16px", background: "var(--danger-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--danger)", marginBottom: "20px" }}>
                      {compError}
                    </div>
                  )}
                  {compMessage && (
                    <div style={{ color: "var(--success)", fontSize: "0.85rem", padding: "12px 16px", background: "var(--success-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--success)", marginBottom: "20px", fontWeight: 500 }}>
                      {compMessage}
                    </div>
                  )}

                  <form onSubmit={handleCreateCompany} className={styles.formGrid} style={{ gap: "20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>Nombre de la Empresa *</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Mi Negocio Express" 
                          value={newCompName}
                          onChange={(e) => {
                            setNewCompName(e.target.value);
                            if (!newCompUrl || newCompUrl === slugify(newCompName)) {
                              setNewCompUrl(slugify(e.target.value));
                            }
                          }}
                          className={styles.formInput}
                          required
                          disabled={compIsLoading}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>Propietario de la Empresa *</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Alejandro Pérez" 
                          value={newCompOwner}
                          onChange={(e) => setNewCompOwner(e.target.value)}
                          className={styles.formInput}
                          required
                          disabled={compIsLoading}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>URL Identificador Único (Slug) *</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <span style={{ display: "flex", alignItems: "center", padding: "0 10px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: "0.75rem", color: "var(--text-muted)", borderRight: "none" }}>
                            reparto.mx/
                          </span>
                          <input 
                            type="text" 
                            placeholder="mi-negocio-express" 
                            value={newCompUrl}
                            onChange={(e) => setNewCompUrl(slugify(e.target.value))}
                            className={styles.formInput}
                            style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0", flexGrow: 1 }}
                            required
                            disabled={compIsLoading}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel}>Dirección de la Empresa</label>
                        <input 
                          type="text" 
                          placeholder="Ej. Av. de la Reforma 222, Juárez, CDMX" 
                          value={newCompAddress}
                          onChange={(e) => setNewCompAddress(e.target.value)}
                          className={styles.formInput}
                          disabled={compIsLoading}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Descripción de la Empresa</label>
                      <input 
                        type="text" 
                        placeholder="Ej. Pizzería artesanal con servicio a domicilio." 
                        value={newCompDesc}
                        onChange={(e) => setNewCompDesc(e.target.value)}
                        className={styles.formInput}
                        disabled={compIsLoading}
                      />
                    </div>

                    {/* Section: Authenticated Users (up to 3) */}
                    <div style={{ 
                      background: "rgba(255, 255, 255, 0.02)", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "var(--radius-md)", 
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      marginTop: "4px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Users size={16} style={{ color: "var(--primary)" }} />
                            Usuarios Administradores ({newCompUsers.length}/3)
                          </h4>
                          <p style={{ margin: "3px 0 0 0", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                            Cuentas autenticadas con acceso al panel. Se registran en Auth y en la tabla de usuarios sin cerrar tu sesión actual.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCompUser}
                          disabled={newCompUsers.length >= 3 || compIsLoading}
                          style={{
                            background: newCompUsers.length >= 3 ? "rgba(255,255,255,0.05)" : "var(--primary-glow)",
                            border: "1px solid " + (newCompUsers.length >= 3 ? "var(--border-color)" : "rgba(247, 52, 12, 0.25)"),
                            color: newCompUsers.length >= 3 ? "var(--text-muted)" : "var(--primary)",
                            padding: "6px 12px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: newCompUsers.length >= 3 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <Plus size={14} /> Agregar Usuario ({newCompUsers.length}/3)
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {newCompUsers.map((u, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              background: "rgba(0, 0, 0, 0.2)", 
                              border: "1px solid rgba(255, 255, 255, 0.06)", 
                              borderRadius: "var(--radius-sm)", 
                              padding: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ 
                                  width: "20px", 
                                  height: "20px", 
                                  borderRadius: "50%", 
                                  background: idx === 0 ? "var(--primary)" : "rgba(255,255,255,0.1)", 
                                  color: "#fff", 
                                  display: "inline-flex", 
                                  alignItems: "center", 
                                  justifyContent: "center", 
                                  fontSize: "0.7rem", 
                                  fontWeight: 700 
                                }}>
                                  {idx + 1}
                                </span>
                                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                  {idx === 0 ? "Administrador Principal (Correo de la Empresa)" : `Administrador #${idx + 1}`}
                                </span>
                                {idx === 0 && (
                                  <span style={{ fontSize: "0.68rem", background: "var(--primary-glow)", color: "var(--primary)", padding: "2px 6px", borderRadius: "10px", fontWeight: 600 }}>
                                    Principal
                                  </span>
                                )}
                              </div>
                              {newCompUsers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCompUser(idx)}
                                  disabled={compIsLoading}
                                  title="Eliminar este usuario"
                                  style={{
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.2)",
                                    color: "var(--danger)",
                                    padding: "4px 8px",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                >
                                  <Trash2 size={12} /> Quitar
                                </button>
                              )}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px" }}>
                              <div>
                                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                                  Correo Electrónico *
                                </label>
                                <input
                                  type="email"
                                  placeholder="admin@empresa.com"
                                  value={u.email}
                                  onChange={(e) => handleUpdateCompUser(idx, "email", e.target.value)}
                                  className={styles.formInput}
                                  style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                                  required
                                  disabled={compIsLoading}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                                  {u.id || editingCompany ? "Contraseña (opcional)" : "Contraseña *"}
                                </label>
                                <input
                                  type="password"
                                  placeholder={u.id || editingCompany ? "•••••••• (conservar)" : "Mínimo 6 caracteres"}
                                  value={u.password || ""}
                                  onChange={(e) => handleUpdateCompUser(idx, "password", e.target.value)}
                                  className={styles.formInput}
                                  style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                                  required={!u.id && !editingCompany}
                                  minLength={u.password ? 6 : undefined}
                                  disabled={compIsLoading}
                                />
                              </div>

                              <div>
                                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                                  Nombre / Cargo (opcional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej. Alejandro Pérez"
                                  value={u.name || ""}
                                  onChange={(e) => handleUpdateCompUser(idx, "name", e.target.value)}
                                  className={styles.formInput}
                                  style={{ padding: "8px 10px", fontSize: "0.82rem" }}
                                  disabled={compIsLoading}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.formGroup} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", marginTop: "10px" }}>
                      {editingCompany ? (
                        <>
                          <label className={styles.inputLabel}>ID Empresa (No Editable)</label>
                          <input 
                            type="text" 
                            value={editingCompany.idEmpresa}
                            readOnly
                            className={styles.formInput}
                            style={{ background: "rgba(255,255,255,0.02)", fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--text-secondary)", cursor: "not-allowed", borderStyle: "dashed" }}
                          />
                        </>
                      ) : (
                        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed var(--border-color)", padding: "14px", borderRadius: "var(--radius-md)" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                            🔒 El sistema generará automáticamente un identificador de 8 caracteres con dígitos y caracteres especiales para esta empresa al momento de registrarla.
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                      <button 
                        type="submit" 
                        className={styles.formBtn} 
                        style={{ flexGrow: 1, padding: "12px", fontSize: "0.95rem", margin: 0 }} 
                        disabled={compIsLoading}
                      >
                        {compIsLoading ? "Procesando..." : (editingCompany ? "Actualizar Empresa" : "Registrar Empresa")}
                      </button>
                      {editingCompany && (
                        <button 
                          type="button" 
                          onClick={resetCompanyForm}
                          className={styles.actionBtn} 
                          style={{ padding: "0 20px", fontSize: "0.95rem", height: "auto", margin: 0 }} 
                          disabled={compIsLoading}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Right Column: Logo & Phones list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Logo Upload Panel */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <h4 className={styles.inputLabel} style={{ marginBottom: "12px" }}>Logotipo Oficial (1:1)</h4>
                    
                    <div style={{
                      border: "2px dashed var(--border-color)",
                      borderRadius: "var(--radius-lg)",
                      padding: "20px",
                      textAlign: "center",
                      position: "relative",
                      background: "rgba(0,0,0,0.01)",
                      transition: "border-color 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "180px"
                    }}>
                      {newCompLogoPreview ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                          <img 
                            src={newCompLogoPreview} 
                            alt="Previsualización Logo" 
                            style={{ width: "120px", height: "120px", borderRadius: "var(--radius-md)", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                          />
                          <button 
                            type="button" 
                            onClick={() => { setNewCompLogoPreview(""); setNewCompLogoFile(null); }}
                            style={{ fontSize: "0.75rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer" }}
                            disabled={compIsLoading}
                          >
                            Remover logotipo
                          </button>
                        </div>
                      ) : (
                        <label style={{ cursor: "pointer", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                          <Upload size={32} style={{ color: "var(--text-muted)" }} />
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                            Subir logo de la empresa
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                            Máximo 1000x1000 píxeles. Proporción cuadrada 1:1 obligatoria.
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleCompLogoUpload}
                            style={{ display: "none" }}
                            disabled={compIsLoading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Phones List Panel */}
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h4 className={styles.inputLabel} style={{ margin: 0 }}>Teléfonos de Propietarios</h4>
                      <button 
                        type="button" 
                        onClick={handleAddCompPhone}
                        disabled={newCompPhones.length >= 3 || compIsLoading}
                        style={{
                          background: "var(--primary-glow)",
                          border: "1px solid rgba(247, 52, 12, 0.15)",
                          color: "var(--primary)",
                          padding: "4px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Plus size={12} /> Agregar ({newCompPhones.length}/3)
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {newCompPhones.map((phone, idx) => (
                        <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input 
                            type="tel" 
                            placeholder={`Teléfono del propietario ${idx + 1}`} 
                            value={phone}
                            onChange={(e) => handleCompPhoneChange(idx, e.target.value)}
                            className={styles.formInput}
                            style={{ flexGrow: 1 }}
                            disabled={compIsLoading}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCompPhone(idx)}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--border-color)",
                              color: "var(--text-muted)",
                              width: "38px",
                              height: "38px",
                              borderRadius: "var(--radius-md)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            disabled={compIsLoading}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "10px" }}>
                      * Se pueden registrar hasta 3 teléfonos.
                    </span>
                  </div>
                </div>
              </div>

              {/* Companies List View */}
              <div className="glass-panel" style={{ padding: "24px", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h3 className={styles.sectionTitle} style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Building size={18} style={{ color: "var(--primary)" }} /> Empresas Registradas
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Listado de organizaciones asociadas en la plataforma de reparto.
                    </p>
                  </div>
                  <span className={styles.badge} style={{ background: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '0.8rem', padding: '4px 10px' }}>
                    {superAdminCompanies.length} empresas
                  </span>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Logo</th>
                        <th>ID Empresa</th>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Dirección</th>
                        <th>Propietario</th>
                        <th>Email</th>
                        <th>Slug</th>
                        <th>Teléfonos</th>
                        <th style={{ textAlign: "right" }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {superAdminCompanies.map((comp, idx) => (
                        <tr key={`${comp.idEmpresa}-${idx}`} style={{ transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                          <td>
                            <img 
                              src={comp.logoEmpresa || comp.foto_empresa || "https://images.unsplash.com/photo-1516880711640-ef7db81be3e1?w=100&auto=format&fit=crop"} 
                              alt="Logo" 
                              style={{ width: "36px", height: "36px", borderRadius: "4px", objectFit: "cover", border: "1px solid var(--border-color)" }} 
                            />
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {comp.idEmpresa}
                          </td>
                          <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {comp.NombreEmpresa || comp.Nombre_Empresa}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={comp.DescripcionEmpresa || ""}>
                            {comp.DescripcionEmpresa || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin descripción</span>}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={comp.DireccionEmpresa || ""}>
                            {comp.DireccionEmpresa || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Sin dirección</span>}
                          </td>
                          <td>
                            {comp.PropietarioEmpresa || comp.PropietarioEmpres || comp.PropietarioEmpresaNombre || "N/A"}
                          </td>
                          <td style={{ fontSize: "0.8rem" }}>
                            {comp.mailEmpresa || "N/A"}
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--primary)" }}>
                            reparto.mx/{comp.urlEmpresaUnico || ""}
                          </td>
                          <td>
                            {comp.TelefonosEmpresa && comp.TelefonosEmpresa.length > 0 ? (
                              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                {comp.TelefonosEmpresa.map((p: string, idx: number) => (
                                  <span key={idx} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>Sin teléfonos</span>
                            )}
                          </td>
                           <td style={{ textAlign: "right" }}>
                             <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                               <button 
                                 type="button" 
                                 onClick={() => handleEditCompanyClick(comp)}
                                 style={{
                                   background: "rgba(255,255,255,0.03)",
                                   border: "1px solid var(--border-color)",
                                   color: "var(--text-secondary)",
                                   padding: "6px 12px",
                                   borderRadius: "var(--radius-sm)",
                                   fontSize: "0.75rem",
                                   fontWeight: 600,
                                   cursor: "pointer",
                                   transition: "all 0.2s"
                                 }}
                                 onMouseEnter={(e) => {
                                   e.currentTarget.style.borderColor = "var(--primary)";
                                   e.currentTarget.style.color = "var(--primary)";
                                 }}
                                 onMouseLeave={(e) => {
                                   e.currentTarget.style.borderColor = "var(--border-color)";
                                   e.currentTarget.style.color = "var(--text-secondary)";
                                 }}
                               >
                                 Editar
                               </button>
                               <button 
                                 type="button" 
                                 onClick={() => handleDeleteCompanyClick(comp.idEmpresa, comp.NombreEmpresa || comp.Nombre_Empresa)}
                                 style={{
                                   background: "rgba(239, 68, 68, 0.05)",
                                   border: "1px solid rgba(239, 68, 68, 0.2)",
                                   color: "var(--danger)",
                                   padding: "6px 12px",
                                   borderRadius: "var(--radius-sm)",
                                   fontSize: "0.75rem",
                                   fontWeight: 600,
                                   cursor: "pointer",
                                   transition: "all 0.2s"
                                 }}
                                 onMouseEnter={(e) => {
                                   e.currentTarget.style.background = "var(--danger)";
                                   e.currentTarget.style.color = "white";
                                 }}
                                 onMouseLeave={(e) => {
                                   e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                                   e.currentTarget.style.color = "var(--danger)";
                                 }}
                               >
                                 Eliminar
                               </button>
                             </div>
                           </td>
                        </tr>
                      ))}
                      {superAdminCompanies.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
                            No hay empresas registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {selectedBranchDetail && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
              onClick={() => {
                setSelectedBranchDetail(null);
                setIsEditingBranch(false);
              }}
            >
              <div 
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: '550px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  padding: '28px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  scrollbarWidth: 'thin'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      {isEditingBranch ? "Editar Sucursal" : selectedBranchDetail.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {isEditingBranch ? "Modifica los datos y tarifas de la sucursal" : "Detalles e Información de Sucursal"}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedBranchDetail(null);
                      setIsEditingBranch(false);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      color: '#475569',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    ✕
                  </button>
                </div>

                {/* Body Content */}
                {isEditingBranch ? (
                  <form onSubmit={handleSaveBranchEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ color: '#475569' }}>Nombre de la Sucursal</label>
                      <input 
                        type="text" 
                        required
                        className={styles.formInput}
                        value={editBranchName}
                        onChange={(e) => setEditBranchName(e.target.value)}
                        style={{ background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                      />
                    </div>
                    <div className={styles.formGroup} style={{ position: 'relative' }}>
                      <label className={styles.inputLabel} style={{ color: '#475569' }}>Dirección</label>
                      <input 
                        type="text" 
                        required
                        className={styles.formInput}
                        value={editBranchAddress}
                        onChange={(e) => setEditBranchAddress(e.target.value)}
                        onFocus={() => setShowEditBranchSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowEditBranchSuggestions(false), 250)}
                        style={{ background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                      />
                      {isLoadingEditBranchSuggestions && (
                        <div style={{ position: 'absolute', right: '12px', top: '35px', fontSize: '0.7rem', color: 'var(--primary)' }}>
                          Buscando...
                        </div>
                      )}
                      {showEditBranchSuggestions && editBranchSuggestions.length > 0 && (
                        <ul style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          listStyle: 'none',
                          padding: '4px 0',
                          margin: '4px 0 0 0',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          {editBranchSuggestions.map((s, idx) => (
                            <li 
                              key={idx}
                              onMouseDown={() => {
                                editBranchAddressSelectedFromListRef.current = true;
                                setEditBranchAddress(s.place_name);
                                setEditBranchLat(s.center[1]);
                                setEditBranchLng(s.center[0]);
                                setShowEditBranchSuggestions(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                color: '#1e293b',
                                cursor: 'pointer',
                                borderBottom: idx < editBranchSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = ''}
                            >
                              📍 {s.place_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ color: '#475569' }}>Enlace de Google Maps (Ubicación)</label>
                      <input 
                        type="url" 
                        placeholder="Ej. https://maps.google.com/?q=..."
                        className={styles.formInput}
                        value={editBranchMapLink}
                        onChange={(e) => setEditBranchMapLink(e.target.value)}
                        style={{ background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ color: '#475569' }}>Estado</label>
                      <select
                        className={styles.formInput}
                        value={editBranchStatus}
                        onChange={(e) => setEditBranchStatus(e.target.value as "active" | "inactive")}
                        style={{ width: '100%', background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                      >
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                      </select>
                    </div>

                    {/* Teléfonos Dinámicos (Editar) */}
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569' }}>Teléfonos</span>
                        <button
                          type="button"
                          onClick={() => setEditBranchPhones(prev => [...prev, ""])}
                          style={{
                            background: 'var(--primary-glow)',
                            border: '1px solid rgba(247, 52, 12, 0.15)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          + Agregar
                        </button>
                      </label>
                      {editBranchPhones.map((phone, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                          <input 
                            type="text" 
                            required={idx === 0} 
                            className={styles.formInput}
                            value={phone}
                            onChange={(e) => {
                              const updated = [...editBranchPhones];
                              updated[idx] = e.target.value;
                              setEditBranchPhones(updated);
                            }}
                            style={{ flex: 1, background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                          />
                          {editBranchPhones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditBranchPhones(prev => prev.filter((_, i) => i !== idx))}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                borderRadius: 'var(--radius-md)',
                                padding: '0 10px'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Tarifas de Envío (Editar) */}
                    <div className={styles.formGroup} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                      <label className={styles.inputLabel} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#475569' }}>Tarifas de Envío por Distancia</span>
                        <button
                          type="button"
                          onClick={() => setEditBranchRates(prev => [...prev, { min_km: undefined, max_km: undefined, precio: undefined }])}
                          style={{
                            background: 'var(--primary-glow)',
                            border: '1px solid rgba(247, 52, 12, 0.15)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          + Agregar Rango
                        </button>
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', marginBottom: '10px' }}>
                        {editBranchRates.map((rate, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input 
                                type="number" 
                                step="any"
                                required 
                                placeholder="Desde"
                                className={styles.formInput}
                                value={rate.min_km ?? ""}
                                onChange={(e) => {
                                  const updated = [...editBranchRates];
                                  updated[idx] = { ...updated[idx], min_km: e.target.value === "" ? undefined : Number(e.target.value) };
                                  setEditBranchRates(updated);
                                }}
                                style={{ width: '65px', padding: '6px 8px', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                              />
                              <span style={{ color: '#64748b', fontSize: '0.75rem', alignSelf: 'center' }}>a</span>
                              <input 
                                type="number" 
                                step="any"
                                required 
                                placeholder="Hasta"
                                className={styles.formInput}
                                value={rate.max_km ?? ""}
                                onChange={(e) => {
                                  const updated = [...editBranchRates];
                                  updated[idx] = { ...updated[idx], max_km: e.target.value === "" ? undefined : Number(e.target.value) };
                                  setEditBranchRates(updated);
                                }}
                                style={{ width: '65px', padding: '6px 8px', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                              />
                              <span style={{ color: '#64748b', fontSize: '0.75rem', alignSelf: 'center' }}>km</span>
                            </div>
                            <div style={{ width: '95px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>$</span>
                              <input 
                                type="number" 
                                required 
                                placeholder="Precio"
                                className={styles.formInput}
                                value={rate.precio ?? ""}
                                onChange={(e) => {
                                  const updated = [...editBranchRates];
                                  updated[idx] = { ...updated[idx], precio: e.target.value === "" ? undefined : Number(e.target.value) };
                                  setEditBranchRates(updated);
                                }}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                              />
                            </div>
                            {editBranchRates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setEditBranchRates(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.15)',
                                  borderRadius: 'var(--radius-md)',
                                  width: '28px',
                                  height: '28px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>Precio por Km Extra</span>
                        <div style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>$</span>
                          <input 
                            type="number" 
                            required 
                            placeholder="10"
                            className={styles.formInput}
                            value={editBranchExtraKmPrice}
                            onChange={(e) => setEditBranchExtraKmPrice(e.target.value)}
                            style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', background: '#f8fafc', color: '#1e293b', borderColor: '#cbd5e1' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button type="submit" className={styles.formBtn} style={{ flex: 1 }}>
                        Guardar Cambios
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setIsEditingBranch(false)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          padding: '10px 16px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Address */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Dirección
                      </strong>
                      <span style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                        {selectedBranchDetail.address}
                      </span>
                      {selectedBranchDetail.mapLink && (
                        <div style={{ marginTop: '6px' }}>
                          <a 
                            href={selectedBranchDetail.mapLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ 
                              fontSize: '0.82rem', 
                              color: 'var(--primary)', 
                              textDecoration: 'underline', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              fontWeight: 600
                            }}
                          >
                            📍 Ver ubicación en Google Maps
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status Availability */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        Estado
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span 
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: selectedBranchDetail.status === 'active' ? 'var(--success)' : 'var(--danger)'
                          }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: selectedBranchDetail.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>
                          {selectedBranchDetail.status === 'active' ? 'Operativa / Activa' : 'Inactiva / No disponible'}
                        </span>
                      </div>
                    </div>

                    {/* Registered Phones */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Teléfonos Registrados
                      </strong>
                      {selectedBranchDetail.telefonos && selectedBranchDetail.telefonos.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {selectedBranchDetail.telefonos.map((phone, idx) => (
                            <div 
                              key={idx}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                color: '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <span style={{ color: 'var(--primary)' }}>📞</span> {phone}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                          {selectedBranchDetail.phone || 'No hay teléfonos registrados.'}
                        </span>
                      )}
                    </div>

                    {/* Branch Rates Display */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Tarifas de Envío (Conductor)
                      </strong>
                      {selectedBranchDetail.tarifas && selectedBranchDetail.tarifas.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
                          {selectedBranchDetail.tarifas.map((rate, idx) => {
                            if (rate.km_extra) {
                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                                  <span>Kilómetro extra:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>${rate.precio_por_km}/km</span>
                                </div>
                              );
                            }
                            return (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155' }}>
                                <span>De {rate.min_km} a {rate.max_km} km:</span>
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>${rate.precio}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>
                          Sin tarifas configuradas (se usarán valores por defecto).
                        </span>
                      )}
                    </div>

                    {/* Branch Photos Gallery */}
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                        Galería de Fotos
                      </strong>
                      {selectedBranchDetail.fotos && selectedBranchDetail.fotos.length > 0 ? (
                        <div 
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                            gap: '10px',
                            maxHeight: '190px',
                            overflowY: 'auto',
                            paddingRight: '4px'
                          }}
                        >
                          {selectedBranchDetail.fotos.map((url, idx) => (
                            <img 
                              key={idx}
                              src={url}
                              alt={`Sucursal ${idx + 1}`}
                              onClick={() => setSelectedPreviewPhoto(url)}
                              style={{
                                width: '100%',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #e2e8f0',
                                cursor: 'zoom-in',
                                transition: 'transform 0.2s, border-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <div 
                          style={{
                            border: '1px dashed #cbd5e1',
                            borderRadius: 'var(--radius-md)',
                            padding: '20px',
                            textAlign: 'center',
                            color: '#64748b',
                            fontSize: '0.85rem',
                            background: '#f8fafc'
                          }}
                        >
                          Sin fotos registradas.
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                      <button
                        onClick={() => handleStartEditBranch(selectedBranchDetail)}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Edit2 size={14} /> Editar Sucursal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PAYMENT CONFIG */}
          {activeTab === "payment-config" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "960px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                    <CreditCard size={26} style={{ color: "var(--primary)" }} /> Pasarelas de Pago
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "600px" }}>
                    Configura las claves API de tus pasarelas de pago. Cada empresa tiene sus propias credenciales independientes.
                  </p>
                </div>

                {/* Mode Toggle */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 20px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-color)",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: paymentMode === "test" ? "#f59e0b" : "var(--text-muted)" }}>
                    🧪 Pruebas
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaymentMode(paymentMode === "test" ? "production" : "test")}
                    style={{
                      position: "relative",
                      width: "52px",
                      height: "28px",
                      borderRadius: "14px",
                      border: "none",
                      cursor: "pointer",
                      background: paymentMode === "production" 
                        ? "linear-gradient(135deg, #059669, #10b981)" 
                        : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      transition: "background 0.3s ease",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)"
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: "3px",
                      left: paymentMode === "production" ? "26px" : "3px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.3s ease",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.2)"
                    }} />
                  </button>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: paymentMode === "production" ? "#059669" : "var(--text-muted)" }}>
                    🚀 Producción
                  </span>
                </div>
              </div>

              {/* Messages */}
              {payError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem", padding: "12px 16px", background: "var(--danger-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} /> {payError}
                </div>
              )}
              {payMessage && (
                <div style={{ color: "var(--success)", fontSize: "0.85rem", padding: "12px 16px", background: "var(--success-glow)", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--success)", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} /> {payMessage}
                </div>
              )}

              {/* Mode Indicator Banner */}
              <div style={{
                padding: "12px 20px",
                borderRadius: "var(--radius-md)",
                background: paymentMode === "production" 
                  ? "linear-gradient(135deg, rgba(5, 150, 105, 0.08), rgba(16, 185, 129, 0.05))"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(251, 191, 36, 0.05))",
                border: `1px solid ${paymentMode === "production" ? "rgba(5, 150, 105, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "0.82rem",
                color: paymentMode === "production" ? "#059669" : "#d97706",
                fontWeight: 500
              }}>
                {paymentMode === "production" ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {paymentMode === "production" 
                  ? "Modo Producción activo — Las transacciones serán reales y se procesarán cargos." 
                  : "Modo Pruebas activo — Las transacciones son simuladas, no se realizarán cargos reales."}
              </div>

              {/* Mercado Pago Card */}
              <div className="glass-panel" style={{
                padding: "28px",
                borderRadius: "var(--radius-lg)",
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--border-color)"
              }}>
                {/* Decorative gradient bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #009ee3, #00b1ea, #009ee3)",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #009ee3, #00b1ea)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(0, 158, 227, 0.25)"
                    }}>
                      <CreditCard size={24} color="white" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Mercado Pago</h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>Pagos online y presenciales en México</p>
                    </div>
                  </div>

                  {/* Status chip */}
                  <div style={{
                    padding: "5px 14px",
                    borderRadius: "20px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: (payMpPublicKeyTest || payMpPublicKeyProd) ? "var(--success-glow)" : "rgba(0,0,0,0.04)",
                    color: (payMpPublicKeyTest || payMpPublicKeyProd) ? "var(--success)" : "var(--text-muted)",
                    border: `1px solid ${(payMpPublicKeyTest || payMpPublicKeyProd) ? "rgba(16,185,129,0.2)" : "var(--border-color)"}`
                  }}>
                    {(payMpPublicKeyTest || payMpPublicKeyProd) ? <><CheckCircle2 size={13} /> Configurado</> : <><AlertCircle size={13} /> Sin configurar</>}
                  </div>
                </div>

                {/* Test Keys Section */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Claves de Prueba (Sandbox)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Lock size={12} /> Public Key (Test)
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={payShowMpPublicKeyTest ? "text" : "password"}
                          placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx"
                          value={payMpPublicKeyTest}
                          onChange={(e) => setPayMpPublicKeyTest(e.target.value)}
                          className={styles.formInput}
                          style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                          disabled={payIsLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPayShowMpPublicKeyTest(!payShowMpPublicKeyTest)}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                        >
                          {payShowMpPublicKeyTest ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Lock size={12} /> Access Token (Test)
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={payShowMpAccessTokenTest ? "text" : "password"}
                          placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx"
                          value={payMpAccessTokenTest}
                          onChange={(e) => setPayMpAccessTokenTest(e.target.value)}
                          className={styles.formInput}
                          style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                          disabled={payIsLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPayShowMpAccessTokenTest(!payShowMpAccessTokenTest)}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                        >
                          {payShowMpAccessTokenTest ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Production Keys Section */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Claves de Producción</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Lock size={12} /> Public Key (Producción)
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={payShowMpPublicKeyProd ? "text" : "password"}
                          placeholder="APP_USR-xxxxxxxx-xxxx-xxxx"
                          value={payMpPublicKeyProd}
                          onChange={(e) => setPayMpPublicKeyProd(e.target.value)}
                          className={styles.formInput}
                          style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                          disabled={payIsLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPayShowMpPublicKeyProd(!payShowMpPublicKeyProd)}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                        >
                          {payShowMpPublicKeyProd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Lock size={12} /> Access Token (Producción)
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={payShowMpAccessTokenProd ? "text" : "password"}
                          placeholder="APP_USR-xxxxxxxx-xxxx-xxxx"
                          value={payMpAccessTokenProd}
                          onChange={(e) => setPayMpAccessTokenProd(e.target.value)}
                          className={styles.formInput}
                          style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                          disabled={payIsLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setPayShowMpAccessTokenProd(!payShowMpAccessTokenProd)}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                        >
                          {payShowMpAccessTokenProd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mercado Pago Help Link */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
                  <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "#009ee3", textDecoration: "none", fontWeight: 500 }}>
                    Obtener mis credenciales de Mercado Pago →
                  </a>
                </div>
              </div>

              {/* Clip Card */}
              <div className="glass-panel" style={{
                padding: "28px",
                borderRadius: "var(--radius-lg)",
                position: "relative",
                overflow: "hidden",
                border: "1px solid var(--border-color)"
              }}>
                {/* Decorative gradient bar */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #FF6B35, #ff8f62, #FF6B35)",
                  borderRadius: "var(--radius-lg) var(--radius-lg) 0 0"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #FF6B35, #ff8f62)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.25)"
                    }}>
                      <CreditCard size={24} color="white" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Clip</h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>Terminal de pago y cobros digitales</p>
                    </div>
                  </div>

                  {/* Status chip */}
                  <div style={{
                    padding: "5px 14px",
                    borderRadius: "20px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: (payClipApiKeyTest || payClipApiKeyProd) ? "var(--success-glow)" : "rgba(0,0,0,0.04)",
                    color: (payClipApiKeyTest || payClipApiKeyProd) ? "var(--success)" : "var(--text-muted)",
                    border: `1px solid ${(payClipApiKeyTest || payClipApiKeyProd) ? "rgba(16,185,129,0.2)" : "var(--border-color)"}`
                  }}>
                    {(payClipApiKeyTest || payClipApiKeyProd) ? <><CheckCircle2 size={13} /> Configurado</> : <><AlertCircle size={13} /> Sin configurar</>}
                  </div>
                </div>

                {/* Test Key */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Clave de Prueba (Sandbox)</span>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Lock size={12} /> API Key (Test)
                    </label>
                    <div style={{ position: "relative", maxWidth: "480px" }}>
                      <input
                        type={payShowClipApiKeyTest ? "text" : "password"}
                        placeholder="Basic xxxxxxxxxxxxxxx"
                        value={payClipApiKeyTest}
                        onChange={(e) => setPayClipApiKeyTest(e.target.value)}
                        className={styles.formInput}
                        style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                        disabled={payIsLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setPayShowClipApiKeyTest(!payShowClipApiKeyTest)}
                        style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                      >
                        {payShowClipApiKeyTest ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Production Key */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Clave de Producción</span>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Lock size={12} /> API Key (Producción)
                    </label>
                    <div style={{ position: "relative", maxWidth: "480px" }}>
                      <input
                        type={payShowClipApiKeyProd ? "text" : "password"}
                        placeholder="Basic xxxxxxxxxxxxxxx"
                        value={payClipApiKeyProd}
                        onChange={(e) => setPayClipApiKeyProd(e.target.value)}
                        className={styles.formInput}
                        style={{ paddingRight: "40px", width: "100%", boxSizing: "border-box", fontFamily: "monospace", fontSize: "0.8rem" }}
                        disabled={payIsLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setPayShowClipApiKeyProd(!payShowClipApiKeyProd)}
                        style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
                      >
                        {payShowClipApiKeyProd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clip Help Link */}
                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <ExternalLink size={13} style={{ color: "var(--text-muted)" }} />
                  <a href="https://developer.clip.mx/" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", color: "#FF6B35", textDecoration: "none", fontWeight: 500 }}>
                    Documentación de API de Clip →
                  </a>
                </div>
              </div>

              {/* Save Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={handleSavePaymentConfig}
                  disabled={payIsLoading}
                  className={styles.formBtn}
                  style={{
                    padding: "12px 32px",
                    fontSize: "0.95rem",
                    borderRadius: "var(--radius-md)",
                    background: payIsLoading ? "var(--text-muted)" : "linear-gradient(135deg, var(--primary), #e12702)",
                    opacity: payIsLoading ? 0.7 : 1,
                    cursor: payIsLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 16px rgba(247, 52, 12, 0.2)",
                    transition: "all 0.3s ease",
                    minWidth: "200px"
                  }}
                >
                  {payIsLoading ? (
                    <>
                      <div style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }} />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Guardar Configuración
                    </>
                  )}
                </button>
              </div>

              {/* Info Note */}
              <div style={{
                padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.04)",
                border: "1px solid rgba(99, 102, 241, 0.12)",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                lineHeight: "1.5"
              }}>
                <strong style={{ color: "var(--text-primary)" }}>💡 Nota de seguridad:</strong> Tus claves API se almacenan de forma segura en la base de datos y solo son accesibles por los administradores de tu empresa. 
                Nunca compartas tus Access Tokens o claves de producción con terceros.
              </div>
            </div>
          )}

          {selectedPreviewPhoto && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                cursor: 'zoom-out'
              }}
              onClick={() => setSelectedPreviewPhoto(null)}
            >
              <img 
                src={selectedPreviewPhoto} 
                alt="Preview zoom" 
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}
              />
            </div>
          )}
          {editingStaff && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <div 
                className="glass-panel"
                style={{
                  width: '100%',
                  maxWidth: '550px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3), 0 8px 10px -6px rgb(0 0 0 / 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Editar Usuario / Personal
                  </h3>
                  <button 
                    onClick={() => setEditingStaff(null)}
                    style={{ fontSize: '1.2rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveStaffEdit();
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ fontSize: '0.75rem' }}>ID Empleado</label>
                      <input 
                        type="text" 
                        value={editingStaff.id} 
                        disabled 
                        className={styles.formInput}
                        style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ fontSize: '0.75rem' }}>ID Empresa</label>
                      <input 
                        type="text" 
                        value={currentCompanyId} 
                        disabled 
                        className={styles.formInput}
                        style={{ opacity: 0.6, cursor: 'not-allowed', background: 'rgba(255,255,255,0.02)' }}
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Nombre Completo *</label>
                    <input 
                      type="text" 
                      value={editStaffName} 
                      onChange={(e) => setEditStaffName(e.target.value)}
                      required
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Correo Electrónico *</label>
                    <input 
                      type="email" 
                      value={editStaffEmail} 
                      onChange={(e) => setEditStaffEmail(e.target.value)}
                      required
                      className={styles.formInput}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Teléfono</label>
                      <input 
                        type="text" 
                        value={editStaffPhone} 
                        onChange={(e) => setEditStaffPhone(e.target.value)}
                        className={styles.formInput}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Turno</label>
                      <select 
                        value={editStaffShift} 
                        onChange={(e) => setEditStaffShift(e.target.value as any)}
                        className={styles.formInput}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <option value="Matutino">Matutino</option>
                        <option value="Vespertino">Vespertino</option>
                        <option value="Nocturno">Nocturno</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Rol Asignado</label>
                      <select 
                        value={editStaffRole} 
                        onChange={(e) => setEditStaffRole(e.target.value)}
                        className={styles.formInput}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <option value="Dispatcher">Despachador</option>
                        <option value="Soporte">Soporte</option>
                        <option value="Administrador">Administrador</option>
                        <option value="Mesero">Mesero</option>
                        <option value="Repartidor">Repartidor</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel}>Estado</label>
                      <select 
                        value={editStaffStatus} 
                        onChange={(e) => setEditStaffStatus(e.target.value as any)}
                        className={styles.formInput}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Sucursales Vinculadas</label>
                    {branches.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}>
                        {branches.map(b => (
                          <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={editStaffBranches.includes(b.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditStaffBranches(prev => [...prev, b.id]);
                                } else {
                                  setEditStaffBranches(prev => prev.filter(id => id !== b.id));
                                }
                              }}
                            />
                            {b.name}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        No hay sucursales disponibles.
                      </span>
                    )}
                  </div>

                  {editStaffRole === "Repartidor" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)', marginTop: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Vehículo de Reparto</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Tipo</label>
                          <select
                            value={editStaffVehicle || "Motocicleta"}
                            onChange={(e) => setEditStaffVehicle(e.target.value as any)}
                            className={styles.formInput}
                            style={{ color: "var(--text-primary)", padding: "8px" }}
                          >
                            <option value="Motocicleta">Motocicleta</option>
                            <option value="Bicicleta">Bicicleta</option>
                            <option value="Automóvil">Automóvil</option>
                            <option value="Van">Van</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Modelo</label>
                          <input
                            type="text"
                            value={editStaffVehicleModel}
                            onChange={(e) => setEditStaffVehicleModel(e.target.value)}
                            className={styles.formInput}
                            style={{ padding: "8px" }}
                            placeholder="Modelo de vehículo"
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel} style={{ fontSize: "0.68rem" }}>Placas</label>
                        <input
                          type="text"
                          value={editStaffVehiclePlates}
                          onChange={(e) => setEditStaffVehiclePlates(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "8px" }}
                          placeholder="Placas"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => setEditingStaff(null)}
                      className={styles.formBtn}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className={styles.formBtn}
                      style={{ background: 'var(--primary)', color: '#fff' }}
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB: BROKER - INGRESOS PROPIOS (INTEGRA TODOS LOS INGRESOS DE SUS REPARTIDORES) */}
          {activeTab === "broker-my-earnings" && isBroker && (() => {
            const isDelivCompleted = (status?: string) => {
              if (!status) return false;
              const s = status.trim().toLowerCase();
              return s === "entregada" || s === "entregado" || s === "delivered" || s === "completed" || s === "completada" || s === "completado";
            };

            // Identify logged-in broker
            const loggedBroker = brokersList.find(b => 
              (currentUserEmail && b.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
              (currentUserName && b.name?.toLowerCase() === currentUserName.toLowerCase())
            ) || brokersList[0] || {
              id: "54ecd429-2942-469a-a5ae-c51789fc5e36",
              name: currentUserName || "Vidal Cavazos",
              email: currentUserEmail || "vidalcavazosbroker@gmail.com",
              phone: "5599999999",
              status: "active"
            };

            // Repartidores assigned to this broker
            const myAssignedDrivers = saDriversList.filter(d => 
              (loggedBroker?.id && String(d.broker_id) === String(loggedBroker.id)) ||
              // Fallback if this is the only registered broker
              (!d.broker_id && brokersList.length === 1)
            );

            // Filter drivers based on brokerSearch
            const filteredDrivers = myAssignedDrivers.filter(d => {
              const search = brokerSearch.trim().toLowerCase();
              return !search ||
                d.name?.toLowerCase().includes(search) ||
                d.email?.toLowerCase().includes(search) ||
                d.phone?.toString().includes(search) ||
                d.id?.toLowerCase().includes(search);
            });

            // Deliveries executed by this broker's fleet
            const myDriverIds = new Set(myAssignedDrivers.map(d => String(d.id)));
            const myFleetDeliveries = saDeliveriesList.filter(del => 
              myDriverIds.has(String(del.id_repartidor || del.repartidor_id))
            );

            // Filter deliveries based on brokerSearch and timeframe
            const filteredDeliveries = myFleetDeliveries.filter(del => {
              const search = brokerSearch.trim().toLowerCase();
              const matchesSearch = !search ||
                del.id?.toLowerCase().includes(search) ||
                del.customer?.toLowerCase().includes(search) ||
                del.address?.toLowerCase().includes(search) ||
                del.status?.toLowerCase().includes(search);
              if (!matchesSearch) return false;

              if (!del.created_at && !del.created_time) return true;
              const date = new Date(del.created_at || del.created_time);
              if (isNaN(date.getTime())) return true;
              const now = new Date();
              if (brokerTimeframe === "day") {
                return date.toDateString() === now.toDateString();
              } else if (brokerTimeframe === "week") {
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
              } else if (brokerTimeframe === "month") {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              } else if (brokerTimeframe === "year") {
                return date.getFullYear() === now.getFullYear();
              }
              return true;
            });

            // Calculations:
            const totalFleetVolume = myFleetDeliveries.reduce((sum, d) => sum + (Number(d.monto_envio) || 0), 0);
            // Universal 20% broker commission
            const myBrokerCommission = totalFleetVolume * 0.20;
            // 80% to repartidores
            const myDriversEarningsTotal = totalFleetVolume * 0.80;
            const completedCount = myFleetDeliveries.filter(d => isDelivCompleted(d.status)).length;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Header */}
                <div className="glass-panel" style={{ padding: "18px 24px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Wallet size={22} style={{ color: "#f59e0b" }} /> Ingresos Propios del Broker
                      </h2>
                      <span style={{
                        fontSize: "0.72rem",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontWeight: 700,
                        background: loggedBroker.status === "suspended" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: loggedBroker.status === "suspended" ? "#ef4444" : "#10b981",
                        border: loggedBroker.status === "suspended" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)"
                      }}>
                        {loggedBroker.status === "suspended" ? "Suspendido" : "Activo"}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Supervisión de entregas de tus repartidores. <strong>Comisión universal del 20%</strong> por cada delivery completado.
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    {/* Timeframe Selector */}
                    <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", padding: "3px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                      {(["day", "week", "month", "year"] as const).map(tf => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setBrokerTimeframe(tf)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            background: brokerTimeframe === tf ? "var(--primary)" : "transparent",
                            color: brokerTimeframe === tf ? "white" : "var(--text-secondary)",
                            transition: "all 0.2s"
                          }}
                        >
                          {tf === "day" ? "Hoy" : tf === "week" ? "Semana" : tf === "month" ? "Mes" : "Año"}
                        </button>
                      ))}
                    </div>

                    {/* Search Input */}
                    <div style={{ position: "relative" }}>
                      <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input
                        type="text"
                        placeholder="Buscar en flota..."
                        value={brokerSearch}
                        onChange={(e) => setBrokerSearch(e.target.value)}
                        style={{
                          padding: "8px 12px 8px 32px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)",
                          background: "white",
                          fontSize: "0.82rem",
                          outline: "none"
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={fetchSaEarningsData}
                      disabled={saLoadingEarnings}
                      style={{
                        padding: "8px 14px",
                        background: "var(--primary-glow)",
                        border: "1px solid rgba(247, 52, 12, 0.2)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--primary)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {saLoadingEarnings ? "Cargando..." : "Actualizar"}
                    </button>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid #f59e0b" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      <span>Mi Comisión Broker (20%)</span>
                      <TrendingUp size={18} style={{ color: "#f59e0b" }} />
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b", marginTop: "6px" }}>
                      ${myBrokerCommission.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      20% universal sobre volumen de deliveries
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid #6366f1" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      <span>Ingresos de Repartidores (80%)</span>
                      <Truck size={18} style={{ color: "#6366f1" }} />
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#6366f1", marginTop: "6px" }}>
                      ${myDriversEarningsTotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Tarifas devengadas por tu equipo
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--primary)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      <span>Volumen Bruto Envíos</span>
                      <DollarSign size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                      ${totalFleetVolume.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Total cobrado en servicios de entrega
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid #10b981" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      <span>Deliveries Coordinados</span>
                      <Package size={18} style={{ color: "#10b981" }} />
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", marginTop: "6px" }}>
                      {myFleetDeliveries.length}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      {completedCount} entregados con éxito
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid #3b82f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                      <span>Repartidores en Flota</span>
                      <Users size={18} style={{ color: "#3b82f6" }} />
                    </div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "6px" }}>
                      {myAssignedDrivers.length}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Conductores asignados a tu red
                    </span>
                  </div>
                </div>

                {/* Sub-tab view mode toggler */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setBrokerViewMode("drivers")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: brokerViewMode === "drivers" ? "var(--primary)" : "rgba(0,0,0,0.05)",
                      color: brokerViewMode === "drivers" ? "white" : "var(--text-secondary)",
                      transition: "all 0.2s"
                    }}
                  >
                    <Truck size={16} /> Ingresos por Repartidor ({myAssignedDrivers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrokerViewMode("deliveries")}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: brokerViewMode === "deliveries" ? "var(--primary)" : "rgba(0,0,0,0.05)",
                      color: brokerViewMode === "deliveries" ? "white" : "var(--text-secondary)",
                      transition: "all 0.2s"
                    }}
                  >
                    <Package size={16} /> Historial de Deliveries ({myFleetDeliveries.length})
                  </button>
                </div>

                {/* VIEW 1: DRIVERS TABLE */}
                {brokerViewMode === "drivers" && (
                  <div className={`glass-panel ${styles.tableCard}`} style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Desglose de Ganancias por Repartidor</h3>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {filteredDrivers.length} repartidores encontrados
                      </span>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Repartidor</th>
                            <th>Contacto</th>
                            <th>Deliveries Asignados</th>
                            <th>Volumen Generado</th>
                            <th>Ingreso Repartidor (80%)</th>
                            <th>Mi Comisión Broker (20%)</th>
                            <th>Estado</th>
                            <th style={{ textAlign: "right" }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDrivers.map(driver => {
                            const dDeliveries = saDeliveriesList.filter(del => 
                              String(del.id_repartidor || del.repartidor_id) === String(driver.id)
                            );
                            const dVolume = dDeliveries.reduce((sum, del) => sum + (Number(del.monto_envio) || 0), 0);
                            const dDriverEarnings = dVolume * 0.80;
                            const dBrokerComm = dVolume * 0.20;
                            const dCompleted = dDeliveries.filter(del => isDelivCompleted(del.status)).length;
                            const dActive = dDeliveries.length - dCompleted;

                            return (
                              <tr key={driver.id}>
                                <td>
                                  <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{driver.name || driver.email || "Repartidor"}</div>
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                    ID: {driver.id ? String(driver.id).slice(0, 8) + "..." : "N/A"}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{driver.email || driver.mail || "Sin email"}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{driver.phone || "Sin teléfono"}</div>
                                </td>
                                <td>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                                      {dDeliveries.length} {dDeliveries.length === 1 ? "envío" : "envíos"}
                                    </span>
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      <span style={{ fontSize: "0.7rem", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>
                                        {dCompleted} listos
                                      </span>
                                      {dActive > 0 && (
                                        <span style={{ fontSize: "0.7rem", color: "#6366f1", background: "rgba(99, 102, 241, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>
                                          {dActive} activos
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  ${dVolume.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ fontWeight: 600, color: "#6366f1" }}>
                                  ${dDriverEarnings.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.95rem" }}>
                                  ${dBrokerComm.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: "0.72rem",
                                    padding: "3px 8px",
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    background: "rgba(16, 185, 129, 0.12)",
                                    color: "#10b981"
                                  }}>
                                    Activo
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDriverForDeliveries(driver)}
                                    style={{
                                      padding: "5px 10px",
                                      background: "rgba(255, 255, 255, 0.04)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "var(--radius-sm)",
                                      color: "var(--text-primary)",
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    Ver Envíos ({dDeliveries.length})
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredDrivers.length === 0 && (
                            <tr>
                              <td colSpan={8} style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                                {myAssignedDrivers.length === 0 
                                  ? "No tienes repartidores vinculados a tu flota de Broker actualmente. En 'Gestión de repartidores' puedes consultar tu equipo o solicitar altas al SuperAdmin."
                                  : "No se encontraron repartidores con el término de búsqueda proporcionado."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* VIEW 2: DELIVERIES TABLE */}
                {brokerViewMode === "deliveries" && (
                  <div className={`glass-panel ${styles.tableCard}`} style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                    <div className={styles.sectionHeader} style={{ marginBottom: "16px" }}>
                      <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Historial de Deliveries Coordinados</h3>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {filteredDeliveries.length} entregas registradas
                      </span>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Folio / ID</th>
                            <th>Repartidor</th>
                            <th>Cliente / Destino</th>
                            <th>Monto Envío</th>
                            <th>Pago Repartidor (80%)</th>
                            <th>Mi Comisión (20%)</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDeliveries.map((del: any) => {
                            const dDriver = myAssignedDrivers.find(dr => String(dr.id) === String(del.id_repartidor || del.repartidor_id));
                            const fee = Number(del.monto_envio) || 0;
                            const comm = fee * 0.20;
                            const driverPay = fee * 0.80;
                            const completed = isDelivCompleted(del.status);

                            return (
                              <tr key={del.id}>
                                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 600 }}>
                                  {del.id ? String(del.id).slice(0, 8) + "..." : "N/A"}
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                                    {dDriver?.name || "Repartidor"}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 500, fontSize: "0.82rem" }}>{del.customer || "Cliente"}</div>
                                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{del.address || "Dirección no provista"}</div>
                                </td>
                                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                  ${fee.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ fontWeight: 600, color: "#6366f1" }}>
                                  ${driverPay.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ fontWeight: 700, color: "#f59e0b" }}>
                                  ${comm.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    background: completed ? "rgba(16, 185, 129, 0.12)" : "rgba(99, 102, 241, 0.12)",
                                    color: completed ? "#10b981" : "#6366f1"
                                  }}>
                                    {del.status || "registrado"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredDeliveries.length === 0 && (
                            <tr>
                              <td colSpan={7} style={{ textAlign: "center", padding: "28px", color: "var(--text-muted)" }}>
                                No se encontraron entregas de deliveries para los filtros seleccionados.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal: Detalle de Envíos del Repartidor */}
                {selectedDriverForDeliveries && (
                  <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                  }}>
                    <div className="glass-panel" style={{
                      width: "100%",
                      maxWidth: "850px",
                      maxHeight: "85vh",
                      background: "white",
                      borderRadius: "var(--radius-lg)",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden"
                    }}>
                      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <Truck size={20} style={{ color: "var(--primary)" }} /> Envíos de {selectedDriverForDeliveries.name || selectedDriverForDeliveries.email}
                          </h3>
                          <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            Registros de deliveries asignados a id_repartidor: {selectedDriverForDeliveries.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDriverForDeliveries(null)}
                          style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ padding: "20px 24px", overflowY: "auto", flexGrow: 1 }}>
                        {(() => {
                          const list = saDeliveriesList.filter(d => 
                            (d.id_repartidor && d.id_repartidor === selectedDriverForDeliveries.id) ||
                            (d.repartidor_id && d.repartidor_id === selectedDriverForDeliveries.id)
                          );
                          return (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                  <th style={{ padding: "8px" }}>ID Entrega</th>
                                  <th style={{ padding: "8px" }}>Cliente</th>
                                  <th style={{ padding: "8px" }}>Dirección</th>
                                  <th style={{ padding: "8px" }}>Monto Envío</th>
                                  <th style={{ padding: "8px" }}>Mi Comisión (20%)</th>
                                  <th style={{ padding: "8px" }}>Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {list.map((del: any) => {
                                  const fee = Number(del.monto_envio) || 0;
                                  return (
                                    <tr key={del.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                      <td style={{ padding: "8px", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                                        {del.id?.slice(0, 8)}...
                                      </td>
                                      <td style={{ padding: "8px", fontWeight: 600 }}>{del.customer || "Cliente"}</td>
                                      <td style={{ padding: "8px", color: "var(--text-muted)", fontSize: "0.78rem" }}>{del.address || "N/A"}</td>
                                      <td style={{ padding: "8px", fontWeight: 600 }}>
                                        ${fee.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ padding: "8px", fontWeight: 700, color: "#f59e0b" }}>
                                        ${(fee * 0.20).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td style={{ padding: "8px" }}>
                                        <span style={{
                                          padding: "2px 6px",
                                          borderRadius: "3px",
                                          fontSize: "0.72rem",
                                          fontWeight: 600,
                                          background: isDelivCompleted(del.status) ? "rgba(16, 185, 129, 0.12)" : "rgba(99, 102, 241, 0.12)",
                                          color: isDelivCompleted(del.status) ? "#10b981" : "#6366f1"
                                        }}>
                                          {del.status || "registrado"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {list.length === 0 && (
                                  <tr>
                                    <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                                      No hay envíos registrados para este repartidor.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>

                      <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedDriverForDeliveries(null)}
                          style={{
                            padding: "8px 16px",
                            background: "rgba(0,0,0,0.05)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

{/* TAB: BROKER - GESTIÓN DE REPARTIDORES */}
          {activeTab === "broker-drivers" && isBroker && (() => {
            const loggedBroker = brokersList.find(b => 
              (currentUserEmail && b.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
              (currentUserName && b.name?.toLowerCase() === currentUserName.toLowerCase())
            ) || brokersList[0];

            const myDrivers = saDriversList.filter(d => 
              (loggedBroker?.id && String(d.broker_id) === String(loggedBroker.id)) ||
              (!d.broker_id && brokersList.length === 1)
            );

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="glass-panel" style={{ padding: "18px 24px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Truck size={22} style={{ color: "var(--primary)" }} /> Gestión de Repartidores de la Red
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Conductores y repartidores registrados bajo la supervisión de tu cuenta de Broker.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateRepartidor(loggedBroker?.id)}
                      style={{
                        padding: "8px 16px",
                        background: "var(--primary)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)"
                      }}
                    >
                      <Plus size={16} /> Registrar Repartidor
                    </button>
                    <button
                      type="button"
                      onClick={fetchSaEarningsData}
                      style={{
                        padding: "8px 14px",
                        background: "rgba(0, 0, 0, 0.04)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className={`glass-panel ${styles.tableCard}`} style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Repartidor</th>
                          <th>Contacto</th>
                          <th>Teléfono</th>
                          <th>Fotos</th>
                          <th>Entregas Realizadas</th>
                          <th>Estado Operativo</th>
                          <th style={{ textAlign: "right" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myDrivers.map(d => {
                          const dDeliveries = saDeliveriesList.filter(del => 
                            String(del.id_repartidor || del.repartidor_id) === String(d.id_repartidor || d.id)
                          );
                          const driverPhotosCount = Array.isArray(d.driver_photos) ? d.driver_photos.length : 0;
                          const vehiclePhotosCount = Array.isArray(d.vehicle_photos) ? d.vehicle_photos.length : 0;
                          const totalPhotos = driverPhotosCount + vehiclePhotosCount;

                          return (
                            <tr key={d.id_repartidor || d.id}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  {driverPhotosCount > 0 ? (
                                    <img
                                      src={d.driver_photos[0]}
                                      alt={d.name || "Repartidor"}
                                      onClick={() => setViewingRepartidorGallery(d)}
                                      style={{
                                        width: "38px",
                                        height: "38px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "2px solid var(--border-color)",
                                        cursor: "pointer",
                                        flexShrink: 0
                                      }}
                                      title="Clic para ver galería"
                                    />
                                  ) : (
                                    <div style={{
                                      width: "38px",
                                      height: "38px",
                                      borderRadius: "50%",
                                      background: "rgba(0, 0, 0, 0.05)",
                                      border: "1px solid var(--border-color)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 700,
                                      color: "var(--text-primary)",
                                      fontSize: "0.85rem",
                                      flexShrink: 0
                                    }}>
                                      {(d.name || "R").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.name || d.email || "Repartidor"}</div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                      ID: {d.id_repartidor ? String(d.id_repartidor).slice(0, 8) + "..." : (d.id ? String(d.id).slice(0, 8) + "..." : "N/A")}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: "0.82rem" }}>{d.email || d.mail || "Sin email"}</td>
                              <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{d.phone || "Sin teléfono"}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setViewingRepartidorGallery(d)}
                                  title="Ver fotos del repartidor y su vehículo"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    padding: "4px 8px",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    background: totalPhotos > 0 ? "rgba(247, 52, 12, 0.08)" : "rgba(0,0,0,0.04)",
                                    border: totalPhotos > 0 ? "1px solid rgba(247, 52, 12, 0.2)" : "1px solid var(--border-color)",
                                    color: totalPhotos > 0 ? "var(--primary)" : "var(--text-muted)",
                                    borderRadius: "var(--radius-sm)",
                                    cursor: "pointer"
                                  }}
                                >
                                  <ImageIcon size={13} />
                                  <span>{totalPhotos} {totalPhotos === 1 ? "foto" : "fotos"}</span>
                                </button>
                              </td>
                              <td style={{ fontWeight: 600 }}>{dDeliveries.length} entregas</td>
                              <td>
                                <span style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  borderRadius: "10px",
                                  fontWeight: 600,
                                  background: "rgba(16, 185, 129, 0.12)",
                                  color: "#10b981"
                                }}>
                                  Activo en Red
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRepartidor(d)}
                                    title="Editar repartidor"
                                    style={{
                                      padding: "5px 10px",
                                      background: "rgba(0, 0, 0, 0.04)",
                                      border: "1px solid var(--border-color)",
                                      borderRadius: "var(--radius-sm)",
                                      color: "var(--text-primary)",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    <Edit2 size={12} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRepartidor(d.id_repartidor || d.id, d.name)}
                                    title="Eliminar repartidor"
                                    style={{
                                      padding: "5px 10px",
                                      background: "rgba(247, 52, 12, 0.08)",
                                      border: "1px solid rgba(247, 52, 12, 0.2)",
                                      borderRadius: "var(--radius-sm)",
                                      color: "var(--primary)",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px"
                                    }}
                                  >
                                    <Trash2 size={12} /> Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {myDrivers.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "36px 20px", color: "var(--text-muted)" }}>
                              <Truck size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                                Aún no tienes repartidores registrados en tu flota.
                              </div>
                              <p style={{ margin: "0 0 16px", fontSize: "0.82rem" }}>
                                Puedes dar de alta conductores con su cuenta autenticada para que empiecen a recibir y entregar pedidos.
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateRepartidor(loggedBroker?.id)}
                                style={{
                                  padding: "8px 18px",
                                  background: "var(--primary)",
                                  border: "none",
                                  borderRadius: "var(--radius-md)",
                                  color: "#ffffff",
                                  fontSize: "0.82rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <Plus size={16} /> Registrar Primer Repartidor
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB: BROKER - HISTORIAL DE PEDIDOS */}
          {(activeTab === "broker-order-history" || activeTab === "broker-tariffs") && isBroker && (() => {
            const loggedBroker = brokersList.find(b => 
              (currentUserEmail && b.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
              (currentUserName && b.name?.toLowerCase() === currentUserName.toLowerCase())
            ) || brokersList[0];

            const assignedCompanyIds: string[] = loggedBroker?.empresas_asociadas || [];
            const myAssignedDrivers = saDriversList.filter(d => 
              (loggedBroker?.id && String(d.broker_id) === String(loggedBroker.id)) ||
              (!d.broker_id && brokersList.length === 1)
            );
            const myDriverIds = myAssignedDrivers.map(d => String(d.id_repartidor || d.id));

            // Filter deliveries related to this broker's drivers or assigned companies
            const brokerDeliveries = saDeliveriesList.filter(del => {
              const driverMatch = (del.id_repartidor && myDriverIds.includes(String(del.id_repartidor))) ||
                                  (del.repartidor_id && myDriverIds.includes(String(del.repartidor_id)));
              const companyMatch = del.idEmpresa && assignedCompanyIds.includes(String(del.idEmpresa));
              if (myDriverIds.length === 0 && assignedCompanyIds.length === 0) {
                return true;
              }
              return driverMatch || companyMatch;
            });

            // Status classifier
            const classifyStatus = (statusStr: string) => {
              const s = (statusStr || "").toLowerCase();
              if (s === "delivered" || s === "entregado" || s === "completada" || s === "completado") return "completed";
              if (s === "transit" || s === "assigned" || s === "en_camino" || s === "en_transito") return "transit";
              if (s === "cancelled" || s === "cancelado" || s === "cancelada") return "cancelled";
              return "pending";
            };

            // Apply search and filters
            const filteredDeliveries = brokerDeliveries.filter(del => {
              // Status filter
              if (orderHistoryStatusFilter !== "all") {
                const c = classifyStatus(del.status);
                if (orderHistoryStatusFilter !== c) return false;
              }

              // Driver filter
              if (orderHistoryDriverFilter !== "all") {
                const dId = String(del.id_repartidor || del.repartidor_id || "");
                if (dId !== orderHistoryDriverFilter) return false;
              }

              // Search text
              if (orderHistorySearch.trim()) {
                const q = orderHistorySearch.toLowerCase();
                const dDriver = myAssignedDrivers.find(dr => String(dr.id) === String(del.id_repartidor || del.repartidor_id));
                const dComp = superAdminCompanies.find(c => String(c.idEmpresa) === String(del.idEmpresa));
                const matchId = String(del.id || "").toLowerCase().includes(q);
                const matchCustomer = String(del.customer || "").toLowerCase().includes(q);
                const matchAddress = String(del.address || "").toLowerCase().includes(q);
                const matchDriver = dDriver ? (dDriver.name?.toLowerCase().includes(q) || dDriver.email?.toLowerCase().includes(q)) : false;
                const matchComp = dComp ? dComp.nombreEmpresa?.toLowerCase().includes(q) : false;
                if (!matchId && !matchCustomer && !matchAddress && !matchDriver && !matchComp) {
                  return false;
                }
              }

              return true;
            });

            // Financial KPIs
            const totalOrdersCount = brokerDeliveries.length;
            const completedCount = brokerDeliveries.filter(d => classifyStatus(d.status) === "completed").length;
            const transitCount = brokerDeliveries.filter(d => classifyStatus(d.status) === "transit").length;
            const totalShippingSum = brokerDeliveries.reduce((sum, d) => sum + (Number(d.monto_envio) || 0), 0);
            const totalBrokerCommission = totalShippingSum * 0.20;

            const formatCurrency = (val: number) => {
              return "$" + val.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            const formatDate = (dateStr: any) => {
              if (!dateStr) return "N/A";
              try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return String(dateStr);
                return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
              } catch {
                return String(dateStr);
              }
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Header panel */}
                <div className="glass-panel" style={{ padding: "18px 24px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClipboardList size={22} style={{ color: "var(--primary)" }} /> Historial de Pedidos y Entregas
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Registro histórico y monitoreo en vivo de todas las entregas coordinadas bajo tu red de repartidores.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={fetchSaEarningsData}
                      style={{
                        padding: "8px 16px",
                        background: "var(--primary)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)"
                      }}
                    >
                      Actualizar Pedidos
                    </button>
                  </div>
                </div>

                {/* KPI Cards (Blanco, Negro, Rojo) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--text-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total de Pedidos</span>
                      <Package size={18} style={{ color: "var(--text-primary)" }} />
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "8px" }}>
                      {totalOrdersCount}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Histórico global de entregas
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid #0f172a" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Entregados con Éxito</span>
                      <CheckCircle2 size={18} style={{ color: "#0f172a" }} />
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>
                      {completedCount}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      {totalOrdersCount > 0 ? `${Math.round((completedCount / totalOrdersCount) * 100)}% tasa de entrega` : "Sin pedidos aún"}
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>En Ruta / Tránsito</span>
                      <Truck size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginTop: "8px" }}>
                      {transitCount}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      En camino al cliente
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--text-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Facturado Envíos</span>
                      <DollarSign size={18} style={{ color: "var(--text-primary)" }} />
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "8px" }}>
                      {formatCurrency(totalShippingSum)}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Tarifas brutas cobradas
                    </span>
                  </div>

                  <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "var(--radius-lg)", borderLeft: "4px solid var(--primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 600 }}>Mi Comisión (20%)</span>
                      <TrendingUp size={18} style={{ color: "var(--primary)" }} />
                    </div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginTop: "8px" }}>
                      {formatCurrency(totalBrokerCommission)}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                      Ganancia calculada del Broker
                    </span>
                  </div>
                </div>

                {/* Filters & Search Bar */}
                <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ display: "flex", flex: 1, minWidth: "260px", maxWidth: "450px", position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Buscar por código, cliente, dirección o repartidor..."
                      value={orderHistorySearch}
                      onChange={e => setOrderHistorySearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 36px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Filter size={15} style={{ color: "var(--text-muted)" }} />
                      <select
                        value={orderHistoryStatusFilter}
                        onChange={e => setOrderHistoryStatusFilter(e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="all">Todos los Estados</option>
                        <option value="completed">Completadas / Entregadas</option>
                        <option value="transit">En Tránsito / Ruta</option>
                        <option value="pending">Pendientes / Recibidas</option>
                        <option value="cancelled">Canceladas</option>
                      </select>
                    </div>

                    <select
                      value={orderHistoryDriverFilter}
                      onChange={e => setOrderHistoryDriverFilter(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      <option value="all">Todos los Repartidores</option>
                      {myAssignedDrivers.map(d => (
                        <option key={d.id} value={String(d.id)}>
                          {d.name || d.email}
                        </option>
                      ))}
                    </select>

                    {(orderHistorySearch || orderHistoryStatusFilter !== "all" || orderHistoryDriverFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderHistorySearch("");
                          setOrderHistoryStatusFilter("all");
                          setOrderHistoryDriverFilter("all");
                        }}
                        style={{
                          padding: "8px 12px",
                          background: "rgba(0, 0, 0, 0.04)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* Orders Table */}
                <div className={`glass-panel ${styles.tableCard}`} style={{ padding: "20px", borderRadius: "var(--radius-lg)" }}>
                  <div className={styles.sectionHeader} style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Listado de Entregas y Envíos</h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Mostrando {filteredDeliveries.length} de {brokerDeliveries.length} entregas
                    </span>
                  </div>

                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Folio / ID</th>
                          <th>Fecha y Hora</th>
                          <th>Cliente / Destino</th>
                          <th>Empresa Remitente</th>
                          <th>Repartidor</th>
                          <th>Tarifa Envío</th>
                          <th>Comisión Broker (20%)</th>
                          <th>Estado</th>
                          <th style={{ textAlign: "right" }}>Detalles</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDeliveries.map((del: any) => {
                          const dDriver = myAssignedDrivers.find(dr => String(dr.id) === String(del.id_repartidor || del.repartidor_id));
                          const dComp = superAdminCompanies.find(c => String(c.idEmpresa) === String(del.idEmpresa));
                          const fee = Number(del.monto_envio) || 0;
                          const comm = fee * 0.20;
                          const cStatus = classifyStatus(del.status);

                          return (
                            <tr key={del.id}>
                              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {del.id ? `#${String(del.id).slice(0, 8).toUpperCase()}` : "N/A"}
                              </td>
                              <td style={{ fontSize: "0.78rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                                {formatDate(del.created_time || del.created_at)}
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                                  {del.customer || "Cliente Final"}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={del.address}>
                                  {del.address || "Dirección no especificada"}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                                  {dComp?.nombreEmpresa || "Empresa General"}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  ID: {del.idEmpresa ? String(del.idEmpresa).slice(0, 8) : "N/A"}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.72rem",
                                    fontWeight: 700
                                  }}>
                                    {(dDriver?.name || "R")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.82rem" }}>
                                      {dDriver?.name || "Sin Asignar"}
                                    </div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                      {dDriver?.phone || dDriver?.email || "Conductor"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                                {formatCurrency(fee)}
                              </td>
                              <td style={{ fontWeight: 700, color: "var(--primary)" }}>
                                {formatCurrency(comm)}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  background: cStatus === "completed"
                                    ? "#0f172a"
                                    : cStatus === "transit"
                                    ? "var(--primary)"
                                    : cStatus === "cancelled"
                                    ? "rgba(0, 0, 0, 0.15)"
                                    : "rgba(247, 52, 12, 0.1)",
                                  color: (cStatus === "completed" || cStatus === "transit")
                                    ? "#ffffff"
                                    : cStatus === "cancelled"
                                    ? "#0f172a"
                                    : "var(--primary)"
                                }}>
                                  {del.status || "registrado"}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderHistoryDetail(del)}
                                  title="Ver detalle del pedido"
                                  style={{
                                    padding: "5px 12px",
                                    background: "rgba(0, 0, 0, 0.04)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "var(--radius-sm)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                >
                                  <Eye size={13} /> Ver Detalle
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredDeliveries.length === 0 && (
                          <tr>
                            <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px" }}>
                              <ClipboardList size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", display: "block", opacity: 0.5 }} />
                              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                                No se encontraron pedidos ni entregas.
                              </div>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                {orderHistorySearch || orderHistoryStatusFilter !== "all" || orderHistoryDriverFilter !== "all"
                                  ? "Intenta modificando los criterios de búsqueda o filtros de estado/repartidor."
                                  : "Aún no hay entregas generadas en las empresas o por los repartidores de tu red."}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: DETALLE DEL PEDIDO / DELIVERY */}
                {selectedOrderHistoryDetail && (() => {
                  const del = selectedOrderHistoryDetail;
                  const dDriver = myAssignedDrivers.find(dr => String(dr.id) === String(del.id_repartidor || del.repartidor_id));
                  const dComp = superAdminCompanies.find(c => String(c.idEmpresa) === String(del.idEmpresa));
                  const fee = Number(del.monto_envio) || 0;
                  const comm = fee * 0.20;
                  const driverPay = fee * 0.80;
                  const cStatus = classifyStatus(del.status);

                  return (
                    <div style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      background: "rgba(0, 0, 0, 0.6)",
                      backdropFilter: "blur(4px)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000,
                      padding: "20px"
                    }}>
                      <div style={{
                        width: "100%",
                        maxWidth: "600px",
                        maxHeight: "90vh",
                        background: "#ffffff",
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                      }}>
                        {/* Header */}
                        <div style={{
                          padding: "20px 24px",
                          borderBottom: "1px solid var(--border-color)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#0f172a",
                          color: "#ffffff"
                        }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
                                Pedido #{del.id ? String(del.id).slice(0, 8).toUpperCase() : "N/A"}
                              </h3>
                              <span style={{
                                fontSize: "0.7rem",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                background: cStatus === "completed" ? "rgba(255, 255, 255, 0.2)" : "var(--primary)",
                                color: "#ffffff"
                              }}>
                                {del.status || "registrado"}
                              </span>
                            </div>
                            <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.7)" }}>
                              Fecha: {formatDate(del.created_time || del.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderHistoryDetail(null)}
                            style={{
                              background: "transparent",
                              border: "none",
                              fontSize: "1.2rem",
                              cursor: "pointer",
                              color: "#ffffff",
                              lineHeight: 1
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: "24px", overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                          {/* Destinatario y Dirección */}
                          <div style={{ padding: "16px", background: "rgba(0, 0, 0, 0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <MapPin size={14} style={{ color: "var(--primary)" }} /> Destino de la Entrega
                            </div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              {del.customer || "Cliente Final"}
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                              {del.address || "Dirección no especificada"}
                            </div>
                            {del.lat && del.lng && (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px", fontFamily: "var(--font-mono)" }}>
                                Coordenadas: {del.lat}, {del.lng}
                              </div>
                            )}
                          </div>

                          {/* Empresa Remitente y Repartidor Asignado */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div style={{ padding: "14px", background: "rgba(0, 0, 0, 0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Building size={13} style={{ color: "#0f172a" }} /> Empresa Remitente
                              </div>
                              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                {dComp?.nombreEmpresa || "Empresa General"}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                ID: {del.idEmpresa ? String(del.idEmpresa).slice(0, 10) : "N/A"}
                              </div>
                            </div>

                            <div style={{ padding: "14px", background: "rgba(0, 0, 0, 0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Truck size={13} style={{ color: "var(--primary)" }} /> Repartidor Asignado
                              </div>
                              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                {dDriver?.name || "Sin Repartidor"}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                {dDriver?.phone || dDriver?.email || "Sin contacto"}
                              </div>
                            </div>
                          </div>

                          {/* Items / Productos si existen */}
                          {del.items && (
                            <div style={{ padding: "14px", background: "rgba(0, 0, 0, 0.02)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Package size={13} style={{ color: "#0f172a" }} /> Detalle del Pedido
                              </div>
                              <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                                {typeof del.items === "string" ? del.items : JSON.stringify(del.items, null, 2)}
                              </div>
                            </div>
                          )}

                          {/* Desglose Financiero */}
                          <div style={{ padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "#ffffff" }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "12px" }}>
                              Desglose Financiero de la Tarifa
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Tarifa Total de Envío:</span>
                                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(fee)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Pago al Repartidor (80%):</span>
                                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(driverPay)}</span>
                              </div>
                              <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }} />
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                                <span style={{ fontWeight: 700, color: "var(--primary)" }}>Comisión de Broker (20%):</span>
                                <span style={{ fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(comm)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Timestamps */}
                          {del.delivered_time && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                              Entregado el: {formatDate(del.delivered_time)}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.02)" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderHistoryDetail(null)}
                            style={{
                              padding: "8px 18px",
                              background: "#0f172a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "var(--radius-md)",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer"
                            }}
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

{/* TAB: BROKER - GESTIÓN DE SUCURSALES Y TARIFAS */}
           {activeTab === "broker-companies" && isBroker && (() => {
             const loggedBroker = brokersList.find(b => 
               (currentUserEmail && b.email?.toLowerCase() === currentUserEmail.toLowerCase()) ||
              (currentUserName && b.name?.toLowerCase() === currentUserName.toLowerCase())
            ) || brokersList[0];
 
            const assignedCompanyIds: string[] = (loggedBroker?.empresas_asociadas || []).map((id: string) => String(id).trim());
            const myCompanies = superAdminCompanies.filter(c => 
              assignedCompanyIds.some(aId => aId.toLowerCase() === String(c.idEmpresa || "").toLowerCase())
            );

            // Filter sucursales that belong to assigned companies (or all if broker has no specific filter)
            const brokerSucursales = brokerSucursalesList.filter(s => {
              const sEmpId = String(s.IDEmpresa || s.idEmpresa || s.id_empresa || "").trim().toLowerCase();
              if (assignedCompanyIds.length === 0) return true;
              return assignedCompanyIds.some(cId => cId.toLowerCase() === sEmpId);
            });

            // Filter by search and company
            const filteredSucursales = brokerSucursales.filter(s => {
              // Company filter
              if (brokerSucursalCompanyFilter !== "all") {
                const sEmpId = String(s.IDEmpresa || s.idEmpresa || s.id_empresa || "").trim().toLowerCase();
                if (sEmpId !== brokerSucursalCompanyFilter.toLowerCase()) return false;
              }

              // Search query
              if (brokerSucursalSearch.trim()) {
                const q = brokerSucursalSearch.toLowerCase();
                const comp = superAdminCompanies.find(c => 
                  String(c.idEmpresa).toLowerCase() === String(s.IDEmpresa).toLowerCase()
                );
                const matchName = String(s.NombreSucursal || "").toLowerCase().includes(q);
                const matchAddress = String(s.DireccionSucursal || "").toLowerCase().includes(q);
                const matchComp = comp ? String(comp.NombreEmpresa || comp.Nombre_Empresa || "").toLowerCase().includes(q) : false;
                if (!matchName && !matchAddress && !matchComp) return false;
              }

              return true;
            });

            // Companies without any sucursal registered in Sucursales table
            const companiesWithoutSucursales = myCompanies.filter(c => {
              return !brokerSucursales.some(s => 
                String(s.IDEmpresa || "").toLowerCase() === String(c.idEmpresa).toLowerCase()
              );
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Header panel */}
                <div className="glass-panel" style={{ padding: "18px 24px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Store size={22} style={{ color: "var(--primary)" }} /> Sucursales y Tarifas de la Red
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Supervisión y configuración de ubicación, Google Maps, fotografías y tarifas de envío por cada sucursal.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ background: "rgba(0, 0, 0, 0.04)", color: "var(--text-primary)", padding: "6px 14px", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: 600 }}>
                      {brokerSucursales.length} sucursales activas • {assignedCompanyIds.length} empresas
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        fetchBrokerSucursales();
                        fetchSaCompanies();
                      }}
                      style={{
                        padding: "8px 14px",
                        background: "var(--primary)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        color: "#ffffff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)"
                      }}
                    >
                      Actualizar
                    </button>
                  </div>
                </div>

                {/* Search and Company filter bar */}
                <div className="glass-panel" style={{ padding: "16px 20px", borderRadius: "var(--radius-lg)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ display: "flex", flex: 1, minWidth: "260px", maxWidth: "450px", position: "relative" }}>
                    <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre de sucursal, dirección o empresa..."
                      value={brokerSucursalSearch}
                      onChange={e => setBrokerSucursalSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 36px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.82rem",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Filter size={15} style={{ color: "var(--text-muted)" }} />
                      <select
                        value={brokerSucursalCompanyFilter}
                        onChange={e => setBrokerSucursalCompanyFilter(e.target.value)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-primary)",
                          color: "var(--text-primary)",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          outline: "none"
                        }}
                      >
                        <option value="all">Todas las Empresas ({assignedCompanyIds.length})</option>
                        {myCompanies.map(c => (
                          <option key={c.idEmpresa} value={c.idEmpresa}>
                            {c.NombreEmpresa || c.Nombre_Empresa || c.idEmpresa}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(brokerSucursalSearch || brokerSucursalCompanyFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setBrokerSucursalSearch("");
                          setBrokerSucursalCompanyFilter("all");
                        }}
                        style={{
                          padding: "8px 12px",
                          background: "rgba(0, 0, 0, 0.04)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* SUCURSALES GRID (Direct view of Branches) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "20px" }}>
                  {filteredSucursales.map(s => {
                    const comp = superAdminCompanies.find(c => 
                      String(c.idEmpresa || "").toLowerCase() === String(s.IDEmpresa || "").toLowerCase()
                    );

                    const sucFotos = Array.isArray(s.FotosSucursales) 
                      ? s.FotosSucursales 
                      : (Array.isArray(s.FotosSucursal) ? s.FotosSucursal : []);

                    let rawTarifas = s.Tarifas;
                    if (typeof rawTarifas === "string") {
                      try { rawTarifas = JSON.parse(rawTarifas); } catch { rawTarifas = []; }
                    }
                    if (!Array.isArray(rawTarifas)) rawTarifas = [];
 
                     return (
                      <div 
                        key={s.IDSucursal} 
                        className="glass-panel" 
                        style={{ 
                          padding: "22px", 
                          borderRadius: "var(--radius-lg)", 
                          display: "flex", 
                          flexDirection: "column", 
                          gap: "16px",
                          border: "1px solid var(--border-color)",
                          background: "#ffffff",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
                        }}
                      >
                        {/* Sucursal Title & Company Badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <div style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "var(--radius-md)",
                              background: "#0f172a",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}>
                              <Store size={22} style={{ color: "#ffffff" }} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                                {s.NombreSucursal || "Sucursal"}
                              </h3>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                <span style={{
                                  fontSize: "0.72rem",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  background: "rgba(0, 0, 0, 0.05)",
                                  color: "var(--text-primary)"
                                }}>
                                  Empresa: <strong>{comp?.NombreEmpresa || comp?.Nombre_Empresa || s.IDEmpresa}</strong>
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                                  ID: {s.IDSucursal?.slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenEditSucursal(s)}
                            style={{
                              padding: "7px 14px",
                              background: "var(--primary)",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              color: "#ffffff",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)",
                              whiteSpace: "nowrap"
                            }}
                          >
                            <Edit2 size={13} /> Editar Sucursal y Tarifas
                          </button>
                        </div>

                        {/* 1. Ubicación Física */}
                        <div style={{ background: "rgba(0, 0, 0, 0.02)", padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                            <MapPin size={13} style={{ color: "var(--primary)" }} /> Ubicación de la Sucursal
                          </div>
                          <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 500 }}>
                            {s.DireccionSucursal || "Dirección física no especificada"}
                          </div>
                          {(s.Latitud !== null && s.Latitud !== undefined && s.Longitud !== null && s.Longitud !== undefined) ? (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              Coordenadas: Lat {s.Latitud} • Lng {s.Longitud}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600 }}>
                              ⚠️ Coordenadas GPS pendientes de configurar
                            </div>
                          )}
                        </div>

                        {/* 2. Link de Google Maps */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem" }}>
                          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Google Maps:</span>
                          {s.LinkGoogleMaps ? (
                            <a 
                              href={s.LinkGoogleMaps} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "var(--primary)",
                                textDecoration: "underline",
                                fontWeight: 600,
                                fontSize: "0.78rem"
                              }}
                            >
                              <ExternalLink size={13} /> Abrir en Google Maps
                            </a>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.75rem" }}>
                              Sin enlace asignado
                            </span>
                          )}
                        </div>

                        {/* 3. Fotos de la Sucursal */}
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <ImageIcon size={14} style={{ color: "var(--primary)" }} />
                              Fotos de la Sucursal
                            </span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {sucFotos.length} {sucFotos.length === 1 ? "foto" : "fotos"}
                            </span>
                          </div>
                          {sucFotos.length > 0 ? (
                            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                              {sucFotos.map((url: string, pIdx: number) => (
                                <a key={pIdx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", flexShrink: 0 }}>
                                  <img
                                    src={url}
                                    alt={`Foto ${pIdx + 1}`}
                                    style={{
                                      width: "56px",
                                      height: "56px",
                                      borderRadius: "6px",
                                      objectFit: "cover",
                                      border: "1px solid var(--border-color)"
                                    }}
                                  />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: "10px", background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-sm)", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Sin fotografías de la sucursal
                            </div>
                          )}
                        </div>

                        {/* 4. Tarifas de Envío Configuradas (Columna JSON) */}
                        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Percent size={14} style={{ color: "var(--primary)" }} />
                            Tarifas de Envío Configuradas (JSON)
                          </div>
                          {rawTarifas.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {rawTarifas.map((t: any, tIdx: number) => {
                                if (t.km_extra || t.precio_por_km !== undefined) {
                                  return (
                                    <span 
                                      key={tIdx}
                                      style={{
                                        background: "#0f172a",
                                        color: "#ffffff",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700
                                      }}
                                    >
                                      Km extra: +${t.precio_por_km || 10}/km
                                    </span>
                                  );
                                }
                                return (
                                  <span 
                                    key={tIdx}
                                    style={{
                                      background: "rgba(247, 52, 12, 0.08)",
                                      border: "1px solid rgba(247, 52, 12, 0.25)",
                                      color: "var(--primary)",
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      fontSize: "0.75rem",
                                      fontWeight: 700
                                    }}
                                  >
                                    {t.min_km} - {t.max_km} km: ${t.precio}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ padding: "8px", background: "rgba(0,0,0,0.02)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Sin tarifas configuradas en el esquema JSON
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredSucursales.length === 0 && (
                    <div className="glass-panel" style={{ padding: "40px 20px", borderRadius: "var(--radius-lg)", gridColumn: "1 / -1", textAlign: "center" }}>
                      <Store size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px", display: "block", opacity: 0.5 }} />
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                        No se encontraron sucursales para los filtros seleccionados.
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {brokerSucursalSearch || brokerSucursalCompanyFilter !== "all"
                          ? "Intenta modificando los términos de búsqueda o el filtro de empresa."
                          : "Aún no hay sucursales registradas para tus empresas vinculadas."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sección de empresas asociadas sin sucursales aún (si las hay) */}
                {companiesWithoutSucursales.length > 0 && (
                  <div className="glass-panel" style={{ padding: "20px", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border-color)", background: "rgba(0,0,0,0.01)" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                      Empresas vinculadas pendientes de sucursal
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Las siguientes empresas asociadas a tu cuenta aún no tienen sucursal registrada en la tabla Sucursales.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
                      {companiesWithoutSucursales.map(c => (
                        <div key={c.idEmpresa} style={{ padding: "14px", background: "#ffffff", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                               {c.NombreEmpresa || c.Nombre_Empresa || c.idEmpresa}
                             </div>
                             <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                             </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSucursal({
                              IDSucursal: crypto.randomUUID(),
                              IDEmpresa: c.idEmpresa,
                              NombreSucursal: `${c.NombreEmpresa || c.Nombre_Empresa || 'Sucursal'} Matriz`,
                              DireccionSucursal: c.DireccionEmpresa || "",
                              Latitud: null,
                              Longitud: null,
                              LinkGoogleMaps: "",
                              FotosSucursales: [],
                              Tarifas: [{ min_km: 0, max_km: 5, precio: 40 }]
                            })}
                            style={{
                              padding: "6px 12px",
                              background: "var(--primary)",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Plus size={13} /> Configurar Sucursal
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
               </div>
             );
           })()}

          {/* MODAL: CREAR / EDITAR REPARTIDOR */}
          {isRepartidorModalOpen && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px"
            }}>
              <div className="glass-panel" style={{
                background: "#ffffff",
                borderRadius: "var(--radius-lg)",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                border: "1px solid var(--border-color)",
                padding: "24px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Truck size={22} style={{ color: "var(--primary)" }} />
                      {editingRepartidor ? "Editar Repartidor" : "Registrar Nuevo Repartidor"}
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {editingRepartidor 
                        ? `Modificando registro en la tabla repartidores (${editingRepartidor.id_repartidor || editingRepartidor.id})`
                        : "Ingresa los datos del conductor para integrarlo a la base de datos de repartidores."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseRepartidorModal}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.3rem",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>

                {repError && (
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(247, 52, 12, 0.08)",
                    border: "1px solid rgba(247, 52, 12, 0.25)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--primary)",
                    fontSize: "0.82rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <AlertCircle size={16} /> {repError}
                  </div>
                )}

                {repSuccess && (
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(0, 0, 0, 0.04)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <CheckCircle2 size={16} style={{ color: "var(--primary)" }} /> {repSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveRepartidor} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Nombre */}
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez Garza"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      className={styles.formInput}
                      style={{ padding: "10px 12px" }}
                      disabled={repIsLoading}
                    />
                  </div>

                  {/* Email & Phone */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="juan.perez@reparto.mx"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "10px 12px" }}
                        disabled={repIsLoading}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        placeholder="8112345678"
                        value={repPhone}
                        onChange={(e) => setRepPhone(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "10px 12px" }}
                        disabled={repIsLoading}
                      />
                    </div>
                  </div>

                  {/* Contraseña de acceso para nuevo repartidor */}
                  {!editingRepartidor && (
                    <div className={styles.formGroup}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        Contraseña de Acceso (para inicio de sesión del conductor) *
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showRepPassword ? "text" : "password"}
                          required
                          placeholder="Mínimo 6 caracteres para autenticación"
                          value={repPassword}
                          onChange={(e) => setRepPassword(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "10px 40px 10px 12px" }}
                          disabled={repIsLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRepPassword(!showRepPassword)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          {showRepPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                        El repartidor podrá iniciar sesión en la plataforma y en su app móvil con este correo y contraseña.
                      </span>
                    </div>
                  )}

                  {/* Broker Responsable (broker_id) */}
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      Broker Asignado (broker_id)
                    </label>
                    {isBroker && !isSuperAdmin ? (
                      <div style={{
                        padding: "10px 12px",
                        background: "rgba(0, 0, 0, 0.04)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}>
                        <Users size={16} style={{ color: "var(--primary)" }} />
                        <span style={{ fontWeight: 600 }}>{currentUserName || "Tu cuenta de Broker"}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
                          {repBrokerId ? `ID: ${repBrokerId.slice(0, 8)}...` : "(Asignación automática)"}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={repBrokerId}
                        onChange={(e) => setRepBrokerId(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "10px 12px" }}
                        disabled={repIsLoading}
                      >
                        <option value="">-- Sin Broker asignado (NULL) --</option>
                        {brokersList.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.name || b.email || b.id} (ID: {String(b.id).slice(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Fotos del Conductor (driver_photos) */}
                  <div className={styles.formGroup} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                        Fotos del Repartidor / Identificación (driver_photos)
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {repDriverPhotoPreviews.length} {repDriverPhotoPreviews.length === 1 ? "foto" : "fotos"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleRepDriverPhotosSelected}
                      className={styles.formInput}
                      style={{ padding: "8px" }}
                      disabled={repIsLoading}
                    />
                    {repDriverPhotoPreviews.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                        {repDriverPhotoPreviews.map((url, idx) => (
                          <div key={idx} style={{ position: "relative", width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                            <img src={url} alt={`Driver ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveRepDriverPhoto(idx)}
                              title="Eliminar foto"
                              style={{
                                position: "absolute",
                                top: "2px",
                                right: "2px",
                                background: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "18px",
                                height: "18px",
                                fontSize: "11px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fotos del Vehículo (vehicle_photos) */}
                  <div className={styles.formGroup} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                        Fotos del Vehículo / Placas (vehicle_photos)
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {repVehiclePhotoPreviews.length} {repVehiclePhotoPreviews.length === 1 ? "foto" : "fotos"}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleRepVehiclePhotosSelected}
                      className={styles.formInput}
                      style={{ padding: "8px" }}
                      disabled={repIsLoading}
                    />
                    {repVehiclePhotoPreviews.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                        {repVehiclePhotoPreviews.map((url, idx) => (
                          <div key={idx} style={{ position: "relative", width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                            <img src={url} alt={`Vehicle ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveRepVehiclePhoto(idx)}
                              title="Eliminar foto"
                              style={{
                                position: "absolute",
                                top: "2px",
                                right: "2px",
                                background: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "18px",
                                height: "18px",
                                fontSize: "11px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ID / Metadata readonly info if editing */}
                  {editingRepartidor && (
                    <div style={{
                      padding: "10px 14px",
                      background: "rgba(0, 0, 0, 0.02)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}>
                      <div><strong>id_repartidor:</strong> {editingRepartidor.id_repartidor || editingRepartidor.id}</div>
                      <div><strong>created_at:</strong> {editingRepartidor.created_at ? new Date(editingRepartidor.created_at).toLocaleString("es-MX") : "N/A"}</div>
                      {editingRepartidor.reviews && (
                        <div><strong>reviews:</strong> {Array.isArray(editingRepartidor.reviews) ? `${editingRepartidor.reviews.length} opiniones registradas` : "Sin opiniones"}</div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                    <button
                      type="button"
                      onClick={handleCloseRepartidorModal}
                      disabled={repIsLoading}
                      style={{
                        padding: "9px 18px",
                        background: "rgba(0, 0, 0, 0.04)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={repIsLoading}
                      style={{
                        padding: "9px 22px",
                        background: "var(--primary)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)"
                      }}
                    >
                      {repIsLoading ? "Guardando..." : (editingRepartidor ? "Guardar Cambios" : "Crear Repartidor")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: GALERÍA DE FOTOS DEL REPARTIDOR */}
          {viewingRepartidorGallery && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px"
            }}>
              <div className="glass-panel" style={{
                background: "#ffffff",
                borderRadius: "var(--radius-lg)",
                maxWidth: "700px",
                width: "100%",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                border: "1px solid var(--border-color)",
                padding: "24px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <ImageIcon size={22} style={{ color: "var(--primary)" }} />
                      Fotos de {viewingRepartidorGallery.name || viewingRepartidorGallery.email}
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      ID: {viewingRepartidorGallery.id_repartidor || viewingRepartidorGallery.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingRepartidorGallery(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.3rem",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Section 1: Fotos del Conductor */}
                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Fotos del Conductor / Perfil ({Array.isArray(viewingRepartidorGallery.driver_photos) ? viewingRepartidorGallery.driver_photos.length : 0})
                  </h4>
                  {Array.isArray(viewingRepartidorGallery.driver_photos) && viewingRepartidorGallery.driver_photos.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
                      {viewingRepartidorGallery.driver_photos.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", aspectRatio: "1/1", position: "relative" }}>
                          <img src={url} alt={`Driver ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "16px", background: "rgba(0, 0, 0, 0.03)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                      No hay fotos del conductor registradas en este perfil.
                    </div>
                  )}
                </div>

                {/* Section 2: Fotos del Vehículo */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Fotos del Vehículo / Placas ({Array.isArray(viewingRepartidorGallery.vehicle_photos) ? viewingRepartidorGallery.vehicle_photos.length : 0})
                  </h4>
                  {Array.isArray(viewingRepartidorGallery.vehicle_photos) && viewingRepartidorGallery.vehicle_photos.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
                      {viewingRepartidorGallery.vehicle_photos.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", aspectRatio: "1/1", position: "relative" }}>
                          <img src={url} alt={`Vehicle ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: "16px", background: "rgba(0, 0, 0, 0.03)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>
                      No hay fotos del vehículo registradas en este perfil.
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => setViewingRepartidorGallery(null)}
                    style={{
                      padding: "8px 18px",
                      background: "rgba(0, 0, 0, 0.04)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      cursor: "pointer"
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL: EDITAR UBICACIÓN, FOTOS Y TARIFAS DE SUCURSAL */}
          {sucursalModalOpen && editingSucursal && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px"
            }}>
              <div className="glass-panel" style={{
                background: "#ffffff",
                borderRadius: "var(--radius-lg)",
                maxWidth: "680px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
                border: "1px solid var(--border-color)",
                padding: "24px"
              }}>
                {/* Modal Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Store size={22} style={{ color: "var(--primary)" }} />
                      Configuración de Sucursal y Tarifas
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {editingSucursal.NombreSucursal || "Sucursal"} • Empresa ID: <span style={{ fontFamily: "var(--font-mono)" }}>{editingSucursal.IDEmpresa}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseSucursalModal}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "1.3rem",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      lineHeight: 1
                    }}
                  >
                    ✕
                  </button>
                </div>

                {sucursalError && (
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(247, 52, 12, 0.08)",
                    border: "1px solid rgba(247, 52, 12, 0.25)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--primary)",
                    fontSize: "0.82rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <AlertCircle size={16} /> {sucursalError}
                  </div>
                )}

                {sucursalSuccess && (
                  <div style={{
                    padding: "10px 14px",
                    background: "rgba(0, 0, 0, 0.04)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <CheckCircle2 size={16} style={{ color: "var(--primary)" }} /> {sucursalSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveSucursal} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* SECCIÓN 1: UBICACIÓN */}
                  <div style={{ background: "rgba(0, 0, 0, 0.02)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <MapPin size={18} style={{ color: "var(--primary)" }} />
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        1. Ubicación de la Sucursal
                      </h4>
                    </div>

                    <div className={styles.formGroup} style={{ marginBottom: "12px" }}>
                      <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        Dirección (DireccionSucursal)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Puerto Mazatlán 3802, 64790 Monterrey, Nuevo León, Mexico"
                        value={sucursalFormDireccion}
                        onChange={(e) => setSucursalFormDireccion(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "10px 12px" }}
                        disabled={sucursalIsLoading}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          Latitud (Latitud)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="25.624082"
                          value={sucursalFormLatitud}
                          onChange={(e) => setSucursalFormLatitud(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}
                          disabled={sucursalIsLoading}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.inputLabel} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          Longitud (Longitud)
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder="-100.286626"
                          value={sucursalFormLongitud}
                          onChange={(e) => setSucursalFormLongitud(e.target.value)}
                          className={styles.formInput}
                          style={{ padding: "10px 12px", fontFamily: "var(--font-mono)" }}
                          disabled={sucursalIsLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: LINK DE GOOGLE MAPS */}
                  <div style={{ background: "rgba(0, 0, 0, 0.02)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <ExternalLink size={18} style={{ color: "var(--primary)" }} />
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        2. Link de Google Maps (LinkGoogleMaps)
                      </h4>
                    </div>

                    <div className={styles.formGroup}>
                      <input
                        type="url"
                        placeholder="https://maps.app.goo.gl/..."
                        value={sucursalFormLinkGoogleMaps}
                        onChange={(e) => setSucursalFormLinkGoogleMaps(e.target.value)}
                        className={styles.formInput}
                        style={{ padding: "10px 12px" }}
                        disabled={sucursalIsLoading}
                      />
                      {sucursalFormLinkGoogleMaps.trim() && (
                        <div style={{ marginTop: "6px" }}>
                          <a
                            href={sucursalFormLinkGoogleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--primary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 600,
                              textDecoration: "underline"
                            }}
                          >
                            <ExternalLink size={12} /> Abrir y verificar enlace en Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN 3: FOTOS DE SUCURSAL */}
                  <div style={{ background: "rgba(0, 0, 0, 0.02)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ImageIcon size={18} style={{ color: "var(--primary)" }} />
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          3. Fotos de la Sucursal (FotosSucursales)
                        </h4>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {sucursalFormPhotoPreviews.length} fotos registradas
                      </span>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleSucursalPhotosSelected}
                      className={styles.formInput}
                      style={{ padding: "8px" }}
                      disabled={sucursalIsLoading}
                    />

                    {sucursalFormPhotoPreviews.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                        {sucursalFormPhotoPreviews.map((url, idx) => (
                          <div key={idx} style={{ position: "relative", width: "70px", height: "70px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                            <img src={url} alt={`Sucursal foto ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <button
                              type="button"
                              onClick={() => handleRemoveSucursalPhoto(idx)}
                              title="Eliminar foto"
                              style={{
                                position: "absolute",
                                top: "2px",
                                right: "2px",
                                background: "rgba(0, 0, 0, 0.75)",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "18px",
                                height: "18px",
                                fontSize: "11px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 4: TARIFAS DE ENVÍO (JSONB) */}
                  <div style={{ background: "rgba(0, 0, 0, 0.02)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Percent size={18} style={{ color: "var(--primary)" }} />
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          4. Tarifas de Envío (Columna JSON 'Tarifas')
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSucursalShowRawJson(!sucursalShowRawJson)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline"
                        }}
                      >
                        {sucursalShowRawJson ? "Cambiar a Editor Visual" : "Ver / Editar JSON"}
                      </button>
                    </div>

                    {sucursalShowRawJson ? (
                      <div>
                        <textarea
                          rows={7}
                          value={sucursalRawJsonText}
                          onChange={(e) => setSucursalRawJsonText(e.target.value)}
                          className={styles.formInput}
                          style={{ fontFamily: "monospace", fontSize: "0.8rem", width: "100%", boxSizing: "border-box" }}
                          disabled={sucursalIsLoading}
                        />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                          Ejemplo: [{`{"min_km": 0, "max_km": 5, "precio": 40}`}, {`{"km_extra": true, "precio_por_km": 10}`}]
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {/* Table of ranges */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px", alignItems: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>
                          <span>Desde (min km)</span>
                          <span>Hasta (max km)</span>
                          <span>Precio ($ MXN)</span>
                          <span></span>
                        </div>

                        {sucursalFormTarifas.map((tier, idx) => (
                          <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px", alignItems: "center" }}>
                            <input
                              type="number"
                              min="0"
                              value={tier.min_km}
                              onChange={(e) => handleUpdateTarifaTier(idx, "min_km", Number(e.target.value))}
                              className={styles.formInput}
                              style={{ padding: "7px 10px" }}
                              disabled={sucursalIsLoading}
                            />
                            <input
                              type="number"
                              min="1"
                              value={tier.max_km}
                              onChange={(e) => handleUpdateTarifaTier(idx, "max_km", Number(e.target.value))}
                              className={styles.formInput}
                              style={{ padding: "7px 10px" }}
                              disabled={sucursalIsLoading}
                            />
                            <div style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--text-muted)" }}>$</span>
                              <input
                                type="number"
                                min="0"
                                value={tier.precio}
                                onChange={(e) => handleUpdateTarifaTier(idx, "precio", Number(e.target.value))}
                                className={styles.formInput}
                                style={{ padding: "7px 10px 7px 22px" }}
                                disabled={sucursalIsLoading}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveTarifaTier(idx)}
                              title="Eliminar rango"
                              style={{
                                background: "rgba(247, 52, 12, 0.08)",
                                border: "1px solid rgba(247, 52, 12, 0.2)",
                                color: "var(--primary)",
                                borderRadius: "var(--radius-sm)",
                                padding: "6px 8px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={handleAddTarifaTier}
                          style={{
                            padding: "6px 12px",
                            background: "rgba(0, 0, 0, 0.04)",
                            border: "1px dashed var(--border-color)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            width: "fit-content",
                            marginTop: "4px"
                          }}
                        >
                          <Plus size={13} /> Agregar Rango de Km
                        </button>

                        {/* Km Extra Configuration */}
                        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={sucursalKmExtraEnabled}
                              onChange={(e) => setSucursalKmExtraEnabled(e.target.checked)}
                              disabled={sucursalIsLoading}
                            />
                            Cobro por Kilómetro Extra (km_extra)
                          </label>

                          {sucursalKmExtraEnabled && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Precio/km: $</span>
                              <input
                                type="number"
                                min="1"
                                value={sucursalKmExtraPrecio}
                                onChange={(e) => setSucursalKmExtraPrecio(Number(e.target.value))}
                                className={styles.formInput}
                                style={{ width: "70px", padding: "6px 8px" }}
                                disabled={sucursalIsLoading}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                    <button
                      type="button"
                      onClick={handleCloseSucursalModal}
                      disabled={sucursalIsLoading}
                      style={{
                        padding: "9px 18px",
                        background: "rgba(0, 0, 0, 0.04)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={sucursalIsLoading}
                      style={{
                        padding: "9px 22px",
                        background: "var(--primary)",
                        border: "none",
                        borderRadius: "var(--radius-md)",
                        color: "#ffffff",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(247, 52, 12, 0.25)"
                      }}
                    >
                      {sucursalIsLoading ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
