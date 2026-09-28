import re
import sys

file_path = "/Users/black/Documents/Apps/Reparto/Dashboard Reparto/src/app/dashboard/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert states
states_to_insert = """
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
"""
content = content.replace(
    'const [superAdmins, setSuperAdmins] = useState<Staff[]>([]);',
    'const [superAdmins, setSuperAdmins] = useState<Staff[]>([]);\n' + states_to_insert
)

# 2. Insert fetchBrokers & handleCreateBroker (after handleCreateSuperAdmin)
# I need to find the end of handleCreateSuperAdmin. It ends with:
#     } finally {
#       setSaIsLoading(false);
#     }
#   };

logic_to_insert = """
  const fetchBrokers = async () => {
    try {
      const { data, error } = await supabase.from("brokers").select("*");
      if (!error && data) {
        setBrokersList(data);
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

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrokerName.trim() || !newBrokerEmail.trim() || !newBrokerPassword.trim()) {
      setBrokerError("Por favor, llena los campos obligatorios (*).");
      return;
    }

    setBrokerIsLoading(true);
    setBrokerError("");
    setBrokerMessage("");

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
          email: newBrokerEmail.trim().toLowerCase(),
          password: newBrokerPassword
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.error_description || resData?.msg || "Error creando usuario en Auth");
      }

      const newUserId = resData?.user?.id;
      if (!newUserId) throw new Error("No se devolvió ID del usuario");

      // Insert into brokers table
      const { error: brokerErr } = await supabase.from("brokers").insert({
        id: newUserId,
        name: newBrokerName.trim(),
        email: newBrokerEmail.trim().toLowerCase(),
        phone: newBrokerPhone.trim(),
        empresas_asociadas: newBrokerCompanies
      });

      if (brokerErr) throw brokerErr;

      // ALSO insert into users table so they can log in seamlessly
      const { error: userErr } = await supabase.from("users").insert({
        IDUser: newUserId,
        name: newBrokerName.trim(),
        mail: newBrokerEmail.trim().toLowerCase(),
        Rol: "Broker",
        phone: newBrokerPhone ? Number(newBrokerPhone) : null,
        status: "active",
        isAdmin: false,
        superAdmin: false
      });
      
      if (userErr) throw userErr;

      await sendWelcomeEmail({
        name: newBrokerName,
        email: newBrokerEmail,
        role: "Broker de Repartidores",
        password: newBrokerPassword,
        phone: newBrokerPhone
      });

      setBrokerMessage("Broker creado exitosamente.");
      setNewBrokerName("");
      setNewBrokerEmail("");
      setNewBrokerPhone("");
      setNewBrokerPassword("");
      setNewBrokerCompanies([]);
      fetchBrokers();

    } catch (err: any) {
      console.error(err);
      setBrokerError(err.message || "Ocurrió un error al crear el Broker.");
    } finally {
      setBrokerIsLoading(false);
    }
  };
"""

# Let's insert logic_to_insert just before handleCreateCompany
content = content.replace(
    '  const handleCreateCompany = async (e: React.FormEvent) => {',
    logic_to_insert + '\n  const handleCreateCompany = async (e: React.FormEvent) => {'
)


# 3. Insert the Tab Render UI
tab_ui_to_insert = """
          {/* TAB: CREAR BROKER */}
          {activeTab === "create-broker" && isSuperAdmin && (
            <div className={styles.deliveriesGrid}>
              
              {/* Formulario (Izquierda) */}
              <div className={styles.sidebarPanel}>
                <div className={`glass-panel ${styles.formCard}`}>
                  <h3 className={styles.sectionTitle} style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Users size={18} /> Registrar Broker
                  </h3>
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
                      <label className={styles.inputLabel}>Contraseña *</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newBrokerPassword}
                        onChange={(e) => setNewBrokerPassword(e.target.value)}
                        className={styles.formInput}
                        required
                        disabled={brokerIsLoading}
                      />
                    </div>

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
                          <option key={c.idEmpresa} value={c.idEmpresa}>{c.NombreEmpresa}</option>
                        ))}
                      </select>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Mantén presionado Ctrl o Cmd para seleccionar varias.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      className={`btn-primary ${styles.btnFull}`}
                      disabled={brokerIsLoading}
                      style={{ marginTop: "8px" }}
                    >
                      {brokerIsLoading ? "Registrando..." : "Registrar Broker"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Lista (Derecha) */}
              <div className={styles.mainContent}>
                <div className={`glass-panel ${styles.tableCard}`}>
                  <h3 className={styles.sectionTitle} style={{ padding: "20px 24px 15px", margin: 0, borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <ClipboardList size={20} style={{ color: "var(--primary)" }} /> Brokers Registrados ({brokersList.length})
                  </h3>
                  
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo / Tel</th>
                          <th>Empresas Asoc.</th>
                          <th>Repartidores</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokersList.map((broker: any) => (
                          <tr key={broker.id}>
                            <td>
                              <div style={{ fontWeight: 500, color: "var(--text-primary)" }}>{broker.name}</div>
                            </td>
                            <td>
                              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{broker.email}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{broker.phone || "Sin teléfono"}</div>
                            </td>
                            <td>
                              <div className={styles.statusBadge} style={{ background: "rgba(13, 148, 136, 0.15)", color: "var(--primary)" }}>
                                {(broker.empresas_asociadas || []).length} Empresas
                              </div>
                            </td>
                            <td>
                              <div className={styles.statusBadge} style={{ background: "var(--bg-accent)", color: "var(--text-secondary)" }}>
                                {(broker.repartidores_asociados || []).length} Repartidores
                              </div>
                            </td>
                          </tr>
                        ))}
                        {brokersList.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                              No hay brokers registrados aún.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
"""
content = content.replace(
    '{/* TAB 7: CREATE COMPANY */}',
    tab_ui_to_insert + '\n          {/* TAB 7: CREATE COMPANY */}'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated page.tsx successfully.")
