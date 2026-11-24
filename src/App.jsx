import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  ShoppingBag,
  Plus,
  Edit3,
  Trash2,
  Share2,
  Check,
  X,
  MessageCircle,
  Lock,
  Unlock,
  Upload,
  Link as LinkIcon,
  Search,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Eye,
  AlertCircle,
  Phone,
  Info
} from 'lucide-react';

// ============================================================================
// 1. CONFIGURACIÓN DE FIREBASE (Reglas estrictas de entorno)
// ============================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : {
      apiKey: "AIzaSyAJivLFRbyeGAsY9pqkJGz9SSj-YJMSOiI",
      authDomain: "bambas-studio.firebaseapp.com",
      projectId: "bambas-studio",
      storageBucket: "bambas-studio.firebasestorage.app",
      messagingSenderId: "391333998128",
      appId: "1:391333998128:web:0fb9725e6c365a8d03c7f5"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'bambas-studio-catalogo';

// ============================================================================
// 2. DATOS INICIALES (Base editable de prueba: Baguette y Saco)
// ============================================================================
const INITIAL_PRODUCTS = [
  {
    name: 'Baguette Clásico Piel',
    category: 'Baguette',
    price: 135,
    stockStatus: 'En stock',
    dimensions: '26 cm × 14 cm × 6 cm',
    material: 'Piel vacuno lisa con herrajes dorados y forro de algodón',
    description: 'Silueta alargada de inspiración noventera pensada para llevar cómodamente al hombro. Cierre superior seguro y bolsillo interior tarjetero.',
    image: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720">
        <defs>
          <linearGradient id="bgBag1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F5F0E8"/>
            <stop offset="100%" stop-color="#E7DDD0"/>
          </linearGradient>
          <linearGradient id="leatherBag1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#9E5A3C"/>
            <stop offset="100%" stop-color="#783F26"/>
          </linearGradient>
        </defs>
        <rect width="600" height="720" fill="url(#bgBag1)"/>
        <ellipse cx="300" cy="560" rx="170" ry="16" fill="#1C1917" opacity="0.12"/>
        <path d="M175 370 C175 210, 425 210, 425 370" fill="none" stroke="#783F26" stroke-width="14" stroke-linecap="round"/>
        <rect x="135" y="365" width="330" height="165" rx="34" fill="url(#leatherBag1)"/>
        <path d="M135 405 Q300 445 465 405" fill="none" stroke="#D9B38C" stroke-width="1.5" stroke-dasharray="5,5"/>
        <rect x="282" y="422" width="36" height="22" rx="5" fill="#D4AF37"/>
      </svg>
    `),
    featured: true,
    createdAt: Date.now() - 20000
  },
  {
    name: 'Saco Atelier Suave',
    category: 'Saco',
    price: 150,
    stockStatus: 'En stock',
    dimensions: '24 cm × 27 cm × 15 cm',
    material: 'Napa flexible de tacto mantequilla con cordón fruncido',
    description: 'Bolso estilo saco con caída natural y gran capacidad interior. Incluye asa corta de mano y correa larga desmontable para llevar cruzado.',
    image: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720">
        <defs>
          <linearGradient id="bgBag2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#EFECE6"/>
            <stop offset="100%" stop-color="#DFD8CC"/>
          </linearGradient>
          <linearGradient id="leatherBag2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#292524"/>
            <stop offset="100%" stop-color="#141211"/>
          </linearGradient>
        </defs>
        <rect width="600" height="720" fill="url(#bgBag2)"/>
        <ellipse cx="300" cy="585" rx="135" ry="15" fill="#1C1917" opacity="0.14"/>
        <path d="M235 280 C235 160, 365 160, 365 280" fill="none" stroke="#1C1917" stroke-width="11"/>
        <path d="M215 275 L385 275 L425 535 C425 565, 175 565, 175 535 Z" fill="url(#leatherBag2)"/>
        <path d="M205 335 Q300 355 395 335" fill="none" stroke="#D4AF37" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `),
    featured: true,
    createdAt: Date.now() - 10000
  }
];

const DEFAULT_CATEGORIES = ['Baguette', 'Saco'];
const STOCK_OPTIONS = ['En stock', 'Últimas unidades', 'Agotado'];

// ============================================================================
// 3. COMPONENTE PRINCIPAL DE LA APLICACIÓN
// ============================================================================
export default function App() {
  // Estados de Firebase Auth & Datos
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brandSettings, setBrandSettings] = useState({
    brandName: 'BAMBAS STUDIO',
    tagline: 'Bolsos Baguette & Saco de Edición Cuidada',
    season: 'Colección Oficial',
    whatsappNumber: '34600123456',
    currency: '€',
    editorialNote: 'Piezas atemporales diseñadas para acompañarte cada día.',
    categories: DEFAULT_CATEGORIES
  });

  // Lista dinámica de categorías activas (siempre incluye 'Todos' al inicio)
  const activeCategories = useMemo(() => {
    const list = Array.isArray(brandSettings.categories) && brandSettings.categories.length > 0
      ? brandSettings.categories
      : DEFAULT_CATEGORIES;
    return list;
  }, [brandSettings.categories]);

  const filterTabs = useMemo(() => ['Todos', ...activeCategories], [activeCategories]);

  // Estados de Interfaz y Navegación
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Estados de Modo Administración
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Estados para Modales de Edición/Creación y Configuración
  const [editingProduct, setEditingProduct] = useState(null); // null = cerrado, {} = nuevo, {id...} = editar
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Notificación Toast elegante
  const [toast, setToast] = useState(null);
  // Limpiar automáticamente el estado de confirmación en línea tras 4 segundos
  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => {
      setConfirmDeleteId(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // --------------------------------------------------------------------------
  // A. INICIALIZACIÓN DE AUTENTICACIÓN FIREBASE (Regla 3)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error('Error al autenticar:', error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --------------------------------------------------------------------------
  // B. SUSCRIPCIÓN EN TIEMPO REAL A PRODUCTOS Y CONFIGURACIÓN (Reglas 1 y 2)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // 1. Escuchar catálogo de bolsos (ruta pública para que cualquier cliente con el link lo vea)
    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'handbags');
    const unsubProducts = onSnapshot(
      productsRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Si es la primera vez, sembramos los 4 bolsos de muestra
          try {
            for (const item of INITIAL_PRODUCTS) {
              await addDoc(productsRef, item);
            }
          } catch (seedErr) {
            console.error('Error sembrando datos iniciales:', seedErr);
            setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `local-${idx}` })));
          }
        } else {
          const items = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          // Ordenar en memoria (Regla 2: sin orderBy en Firestore)
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setProducts(items);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error leyendo catálogo:', error);
        setProducts(INITIAL_PRODUCTS.map((p, idx) => ({ ...p, id: `fallback-${idx}` })));
        setLoading(false);
      }
    );

    // 2. Escuchar configuración de marca y WhatsApp
    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'catalog_settings', 'main');
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setBrandSettings((prev) => ({ ...prev, ...docSnap.data() }));
        }
      },
      (error) => {
        console.error('Error leyendo configuración:', error);
      }
    );

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, [user]);

  // --------------------------------------------------------------------------
  // C. FILTRADO EN MEMORIA
  // --------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      const matchesAvailability = !onlyAvailable || product.stockStatus !== 'Agotado';
      const queryLower = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !queryLower ||
        product.name?.toLowerCase().includes(queryLower) ||
        product.description?.toLowerCase().includes(queryLower) ||
        product.material?.toLowerCase().includes(queryLower);
      return matchesCategory && matchesAvailability && matchesSearch;
    });
  }, [products, selectedCategory, onlyAvailable, searchQuery]);

  // --------------------------------------------------------------------------
  // D. ACCIONES DE COMPARTIR Y WHATSAPP
  // --------------------------------------------------------------------------
  const getPublicShareUrl = () => {
    try {
      const currentUrl = new URL(window.location.href);
      // Limpia parámetros internos de vista previa/edición para generar un link limpio al público
      ['preview', 'edit', 'admin', 'draft', 'token', 'session'].forEach((param) =>
        currentUrl.searchParams.delete(param)
      );
      return currentUrl.toString();
    } catch {
      return window.location.href;
    }
  };

  const handleShareCatalog = async () => {
    const shareUrl = getPublicShareUrl();
    const shareData = {
      title: `${brandSettings.brandName} — Catálogo Oficial`,
      text: `Descubre la colección de bolsos de ${brandSettings.brandName}.`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback a copiar enlace si se cancela el menú nativo
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Enlace público del catálogo copiado');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Enlace público del catálogo listo para compartir');
    }
  };

  const buildWhatsAppLink = (product) => {
    const cleanPhone = (brandSettings.whatsappNumber || '').replace(/\D/g, '');
    const isOut = product.stockStatus === 'Agotado';
    const message = isOut
      ? `Hola ${brandSettings.brandName}, he visto el modelo "${product.name}" en vuestro catálogo. ¿Tenéis prevista reposición próximamente?`
      : `Hola ${brandSettings.brandName}, me encantaría pedir o recibir más información sobre el bolso "${product.name}" (${product.price}${brandSettings.currency}) que he visto en vuestro catálogo.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // --------------------------------------------------------------------------
  // E. ACCIONES DE ADMINISTRACIÓN (CRUD EN FIRESTORE)
  // --------------------------------------------------------------------------
  const handleAdminUnlock = (e) => {
    e.preventDefault();
    // PIN sencillo por defecto "1234" o acceso directo para facilitar pruebas
    if (pinInput.trim() === '1234' || pinInput.trim().toLowerCase() === 'atelier') {
      setIsAdmin(true);
      setShowAdminLoginModal(false);
      setPinInput('');
      setPinError('');
      showToast('Modo Edición activado. Ya puedes gestionar tu inventario.');
    } else {
      setPinError('Código incorrecto. Usa 1234 para entrar.');
    }
  };

  const handleQuickStockChange = async (productId, newStatus) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'handbags', productId);
      await updateDoc(docRef, { stockStatus: newStatus });
      showToast(`Estado actualizado a "${newStatus}"`);
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct((prev) => ({ ...prev, stockStatus: newStatus }));
      }
    } catch (error) {
      console.error('Error actualizando stock:', error);
      showToast('No se pudo actualizar el estado', 'error');
    }
  };

  const handleSaveProduct = async (productData) => {
    if (!user) return;
    try {
      const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'handbags');
      if (productData.id) {
        const { id, ...fieldsToUpdate } = productData;
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'handbags', id);
        await updateDoc(docRef, fieldsToUpdate);
        showToast('Bolso actualizado correctamente');
      } else {
        const { id, ...newProduct } = productData;
        await addDoc(productsRef, {
          ...newProduct,
          createdAt: Date.now()
        });
        showToast('Nuevo bolso publicado en el catálogo');
      }
      setEditingProduct(null);
    } catch (error) {
      console.error('Error guardando bolso:', error);
      showToast('Error al guardar el producto', 'error');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product || !product.id) return;

    // Actualización optimista inmediata en la interfaz y cierre de modales si aplica
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(null);
    }
    if (editingProduct?.id === product.id) {
      setEditingProduct(null);
    }
    setConfirmDeleteId(null);

    // Si es un elemento de respaldo local sin documento real en Firestore, terminamos aquí
    if (
      String(product.id).startsWith('local-') ||
      String(product.id).startsWith('fallback-')
    ) {
      showToast(`"${product.name}" eliminado del catálogo`);
      return;
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'handbags', product.id);
      await deleteDoc(docRef);
      showToast(`"${product.name}" eliminado del catálogo`);
    } catch (error) {
      console.error('Error eliminando en Firestore:', error);
      // Mantenemos la eliminación local si Firestore no está disponible en entorno demo
      showToast(`"${product.name}" eliminado de la vista actual`);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    if (!user) return;
    try {
      const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'catalog_settings', 'main');
      await setDoc(settingsDocRef, newSettings, { merge: true });
      setBrandSettings(newSettings);
      setShowSettingsModal(false);
      // Si la categoría seleccionada fue eliminada, volvemos a 'Todos'
      if (
        selectedCategory !== 'Todos' &&
        Array.isArray(newSettings.categories) &&
        !newSettings.categories.includes(selectedCategory)
      ) {
        setSelectedCategory('Todos');
      }
      showToast('Configuración de marca, categorías y WhatsApp guardada');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showToast('Error al guardar la configuración', 'error');
    }
  };

  // ==========================================================================
  // RENDERIZADO UI EDITORIAL BOUTIQUE
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] font-sans selection:bg-[#9E5A3C] selection:text-white flex flex-col">
      {/* Tipografía Editorial Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        .font-editorial { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
      `}</style>

      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-xl border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-[#291715] text-[#FCA5A5] border-[#7F1D1D]'
                : 'bg-[#1C1917] text-[#FAF7F2] border-[#3F3A36]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* BARRA DE ADMINISTRACIÓN ACTIVA (Solo visible en modo edición) */}
      {isAdmin && (
        <div className="bg-[#1C1917] text-[#FAF7F2] border-b border-[#D4AF37]/30 px-4 py-2.5 sticky top-0 z-40 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#E5C158] font-medium border border-[#D4AF37]/40">
                <Unlock className="w-3.5 h-3.5" />
                Modo Edición Activo
              </span>
              <span className="hidden md:inline text-[#A8A29E]">
                Los cambios se sincronizan al instante para tus clientes.
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#292524] hover:bg-[#383330] text-xs sm:text-sm text-[#E7E5E4] transition border border-[#44403C]"
              >
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Marca y WhatsApp</span>
              </button>

              <button
                onClick={() =>
                  setEditingProduct({
                    name: '',
                    category: activeCategories[0] || 'Bolso',
                    price: '',
                    stockStatus: 'En stock',
                    dimensions: '',
                    material: '',
                    description: '',
                    image: ''
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#9E5A3C] hover:bg-[#86492E] text-white text-xs sm:text-sm font-medium transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Bolso</span>
              </button>

              <button
                onClick={() => {
                  setIsAdmin(false);
                  showToast('Has vuelto a la vista pública de cliente');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-[#A8A29E] hover:text-white transition"
                title="Salir del modo edición"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Vista Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA EDITORIAL */}
      <header className="border-b border-[#E5DEC9] bg-[#FAF7F2]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-[#1C1917]/20 flex items-center justify-center bg-[#F3ECE1]">
              <ShoppingBag className="w-4 h-4 text-[#9E5A3C]" />
            </div>
            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl tracking-[0.14em] font-semibold uppercase text-[#1C1917] leading-none">
                {brandSettings.brandName}
              </h1>
              <p className="text-[11px] tracking-[0.18em] uppercase text-[#78716C] mt-1 hidden sm:block">
                {brandSettings.season}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShareCatalog}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1C1917]/20 hover:border-[#1C1917] bg-white/70 hover:bg-white text-xs sm:text-sm font-medium text-[#1C1917] transition shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-[#9E5A3C]" />
              <span>Compartir Catálogo</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO / PORTADA EDITORIAL */}
      <section className="relative overflow-hidden border-b border-[#E5DEC9] bg-gradient-to-b from-[#F5EFE6] to-[#FAF7F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.22em] text-[#9E5A3C] font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Catálogo Oficial
          </span>
          <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#1C1917] leading-[1.12] tracking-tight">
            {brandSettings.tagline}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#57534E] max-w-2xl mx-auto leading-relaxed font-light">
            {brandSettings.editorialNote}
          </p>
        </div>
      </section>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-8 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E5DEC9]">
          {/* Pestañas de Categorías */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {filterTabs.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm tracking-wide transition whitespace-nowrap ${
                    active
                      ? 'bg-[#1C1917] text-[#FAF7F2] font-medium shadow-sm'
                      : 'bg-[#F2ECE1] text-[#57534E] hover:bg-[#E7DEC8] hover:text-[#1C1917]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Buscador y Toggle de Disponibilidad */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar modelo o piel..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-white border border-[#DFD7C8] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#9E5A3C] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition ${
                onlyAvailable
                  ? 'bg-[#9E5A3C]/10 border-[#9E5A3C] text-[#9E5A3C]'
                  : 'bg-white border-[#DFD7C8] text-[#57534E] hover:border-[#A8A29E]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Solo disponibles</span>
            </button>
          </div>
        </div>

        {/* Contador de piezas */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#78716C]">
          <span>
            Mostrando <strong className="text-[#1C1917] font-medium">{filteredProducts.length}</strong>{' '}
            {filteredProducts.length === 1 ? 'pieza' : 'piezas'}
          </span>
          {isAdmin && (
            <span className="text-[#9E5A3C] font-medium">
              Haz clic en el selector de stock de cada tarjeta para actualizarlo al instante
            </span>
          )}
        </div>
      </section>

      {/* CUADRÍCULA DE PRODUCTOS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse">
                <div className="aspect-[4/5] bg-[#EAE3D5] rounded-2xl mb-4" />
                <div className="h-5 bg-[#EAE3D5] rounded w-2/3 mb-2" />
                <div className="h-4 bg-[#EAE3D5] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 px-4 bg-[#F5F0E6] rounded-3xl border border-[#E5DEC9]">
            <ShoppingBag className="w-10 h-10 text-[#A8A29E] mx-auto mb-3 stroke-[1.5]" />
            <h3 className="font-editorial text-2xl text-[#1C1917]">No hay bolsos con estos filtros</h3>
            <p className="text-sm text-[#78716C] mt-1 max-w-md mx-auto">
              Prueba a cambiar la categoría seleccionada o limpia el buscador para explorar toda la colección.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSearchQuery('');
                setOnlyAvailable(false);
              }}
              className="mt-5 px-5 py-2.5 rounded-full bg-[#1C1917] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#332E2B] transition"
            >
              Ver toda la colección
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-7 gap-y-11">
            {filteredProducts.map((product) => {
              const isOut = product.stockStatus === 'Agotado';
              const isLow = product.stockStatus === 'Últimas unidades';

              return (
                <article
                  key={product.id}
                  className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#EAE2D3] hover:border-[#CBBFA8] shadow-2xs hover:shadow-xl transition-all duration-300"
                >
                  {/* Contenedor Imagen */}
                  <div
                    onClick={() => setSelectedProduct(product)}
                    className="relative aspect-[4/5] bg-[#F3EDE2] overflow-hidden cursor-pointer"
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                          isOut ? 'opacity-75 grayscale-[30%]' : ''
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#A8A29E]">
                        <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-2" />
                        <span className="text-xs">Sin fotografía</span>
                      </div>
                    )}

                    {/* Etiqueta de Stock */}
                    <div className="absolute top-3.5 left-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide shadow-sm backdrop-blur-md ${
                          isOut
                            ? 'bg-[#1C1917]/90 text-[#E7E5E4]'
                            : isLow
                            ? 'bg-[#9E5A3C]/95 text-white'
                            : 'bg-white/90 text-[#1C1917] border border-[#E5DEC9]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOut ? 'bg-[#EF4444]' : isLow ? 'bg-[#FDE047]' : 'bg-[#16A34A]'
                          }`}
                        />
                        {product.stockStatus}
                      </span>
                    </div>

                    {/* Botón rápido ver detalle en hover */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center">
                      <span className="px-4 py-1.5 rounded-full bg-white/95 text-[#1C1917] text-xs font-medium shadow-md">
                        Ver detalles y medidas
                      </span>
                    </div>
                  </div>

                  {/* Información del Bolso */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.15em] text-[#9E5A3C] font-medium mb-1">
                        <span>{product.category}</span>
                        <span className="font-sans text-base font-semibold text-[#1C1917] tracking-normal">
                          {product.price}
                          {brandSettings.currency}
                        </span>
                      </div>

                      <h3
                        onClick={() => setSelectedProduct(product)}
                        className="font-editorial text-2xl font-semibold text-[#1C1917] leading-snug cursor-pointer hover:text-[#9E5A3C] transition"
                      >
                        {product.name}
                      </h3>

                      <p className="mt-2 text-xs text-[#78716C] line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    {/* Controles de Administración rápidos en la tarjeta */}
                    {isAdmin ? (
                      <div className="mt-4 pt-4 border-t border-[#EFE9DD] space-y-2.5">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#78716C] mb-1">
                            Estado de inventario rápido:
                          </label>
                          <select
                            value={product.stockStatus}
                            onChange={(e) => handleQuickStockChange(product.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-[#D6CEC0] bg-[#FAF7F2] text-xs font-medium text-[#1C1917] focus:outline-none focus:border-[#9E5A3C]"
                          >
                            {STOCK_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(product)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1C1917] hover:bg-[#332E2B] text-white text-xs font-medium transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {confirmDeleteId === product.id ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProduct(product);
                              }}
                              className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold shadow-sm transition animate-pulse"
                              title="Haz clic de nuevo para confirmar"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>¿Confirmar?</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(product.id);
                              }}
                              className="inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-medium transition"
                              title="Eliminar bolso"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Acciones para el Cliente */
                      <div className="mt-5 pt-4 border-t border-[#F2ECE1] flex items-center gap-2">
                        <a
                          href={buildWhatsAppLink(product)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium transition ${
                            isOut
                              ? 'bg-[#F3EDE2] hover:bg-[#E6DEC8] text-[#57534E]'
                              : 'bg-[#1C1917] hover:bg-[#9E5A3C] text-white shadow-xs'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{isOut ? 'Consultar reposición' : 'Pedir por WhatsApp'}</span>
                        </a>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="p-2.5 rounded-xl border border-[#E5DEC9] hover:border-[#1C1917] text-[#1C1917] transition"
                          title="Ver ficha completa"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* PIE DE PÁGINA CON ACCESO DISCRETO A ADMINISTRACIÓN */}
      <footer className="bg-[#1C1917] text-[#D6D3D1] border-t border-[#292524]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-[#292524]">
            <div>
              <h4 className="font-editorial text-2xl tracking-[0.14em] uppercase text-[#FAF7F2]">
                {brandSettings.brandName}
              </h4>
              <p className="text-xs text-[#A8A29E] mt-1.5 max-w-md">
                Atención personalizada y envíos a medida. Consulta disponibilidad o solicita asesoramiento directo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleShareCatalog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#44403C] hover:border-[#D4AF37] text-xs text-[#FAF7F2] transition"
              >
                <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Copiar enlace del catálogo</span>
              </button>

              <a
                href={`https://wa.me/${(brandSettings.whatsappNumber || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9E5A3C] hover:bg-[#86492E] text-xs text-white font-medium transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Contactar por WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
            <p>© {new Date().getFullYear()} {brandSettings.brandName}. Todos los derechos reservados.</p>

            {/* Botón discreto para la dueña */}
            <button
              onClick={() => {
                if (isAdmin) {
                  setIsAdmin(false);
                  showToast('Modo edición cerrado');
                } else {
                  setShowAdminLoginModal(true);
                }
              }}
              className="inline-flex items-center gap-1.5 text-[#78716C] hover:text-[#D4AF37] transition py-1 px-2 rounded"
            >
              {isAdmin ? (
                <>
                  <Unlock className="w-3 h-3 text-[#D4AF37]" />
                  <span>Cerrar gestión de tienda</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Acceso Atelier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          MODAL 1: VISTA DE DETALLE DEL BOLSO
         ==================================================================== */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-[#FAF7F2] rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-[#E5DEC9] my-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-[#1C1917] flex items-center justify-center shadow-md transition"
              aria-label="Cerrar detalle"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Fotografía Grande */}
              <div className="bg-[#EFE9DD] aspect-[4/5] md:aspect-auto md:min-h-[480px] relative">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#A8A29E]">
                    <ShoppingBag className="w-16 h-16 stroke-[1]" />
                  </div>
                )}
              </div>

              {/* Ficha Técnica y Compra */}
              <div className="p-6 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#9E5A3C] font-semibold">
                      {selectedProduct.category}
                    </span>
                    <span className="text-[#D6CEC0]">•</span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        selectedProduct.stockStatus === 'Agotado'
                          ? 'bg-[#1C1917] text-white'
                          : selectedProduct.stockStatus === 'Últimas unidades'
                          ? 'bg-[#9E5A3C]/15 text-[#9E5A3C]'
                          : 'bg-[#16A34A]/15 text-[#15803D]'
                      }`}
                    >
                      {selectedProduct.stockStatus}
                    </span>
                  </div>

                  <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight">
                    {selectedProduct.name}
                  </h2>

                  <p className="mt-2 text-2xl font-medium text-[#1C1917]">
                    {selectedProduct.price}
                    {brandSettings.currency}
                  </p>

                  <div className="mt-6 pt-6 border-t border-[#E5DEC9] space-y-4">
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      {selectedProduct.description}
                    </p>

                    {selectedProduct.material && (
                      <div>
                        <h4 className="text-[11px] uppercase tracking-wider text-[#78716C] font-semibold">
                          Composición y Acabados
                        </h4>
                        <p className="text-sm text-[#1C1917] mt-0.5">{selectedProduct.material}</p>
                      </div>
                    )}

                    {selectedProduct.dimensions && (
                      <div>
                        <h4 className="text-[11px] uppercase tracking-wider text-[#78716C] font-semibold">
                          Dimensiones
                        </h4>
                        <p className="text-sm text-[#1C1917] mt-0.5">{selectedProduct.dimensions}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[#E5DEC9] space-y-3">
                  <a
                    href={buildWhatsAppLink(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#1C1917] hover:bg-[#9E5A3C] text-white text-sm font-medium transition shadow-md"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {selectedProduct.stockStatus === 'Agotado'
                        ? 'Consultar disponibilidad por WhatsApp'
                        : 'Reservar o pedir por WhatsApp'}
                    </span>
                  </a>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        const item = selectedProduct;
                        setSelectedProduct(null);
                        setEditingProduct(item);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#1C1917] text-xs font-medium text-[#1C1917] hover:bg-[#EFE9DD] transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar esta ficha</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ACCESO AL MODO ADMINISTRACIÓN (PIN)
         ==================================================================== */}
      {showAdminLoginModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowAdminLoginModal(false)}
        >
          <div
            className="bg-[#FAF7F2] rounded-2xl max-w-sm w-full p-6 sm:p-8 shadow-2xl border border-[#E5DEC9]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-[#1C1917] text-[#D4AF37] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <button
                onClick={() => setShowAdminLoginModal(false)}
                className="text-[#78716C] hover:text-[#1C1917]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Gestión del Catálogo
            </h3>
            <p className="text-xs text-[#57534E] mt-1 leading-relaxed">
              Introduce tu clave de administración para añadir bolsos, actualizar precios o cambiar el stock.
            </p>

            <form onSubmit={handleAdminUnlock} className="mt-5 space-y-4">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Código de acceso (ej. 1234)"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl bg-white border border-[#D6CEC0] text-sm text-[#1C1917] focus:outline-none focus:border-[#9E5A3C]"
                />
                {pinError && <p className="text-xs text-[#DC2626] mt-1.5">{pinError}</p>}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#78716C] bg-[#F2ECE1] p-2.5 rounded-lg">
                <Info className="w-4 h-4 text-[#9E5A3C] shrink-0" />
                <span>Clave de demostración: <strong>1234</strong></span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#1C1917] hover:bg-[#9E5A3C] text-white text-sm font-medium transition"
              >
                Entrar al panel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: FORMULARIO CREAR / EDITAR BOLSO (Con subida base64 y URL)
         ==================================================================== */}
      {editingProduct && (
        <ProductFormModal
          initialData={editingProduct}
          categories={activeCategories}
          currency={brandSettings.currency}
          onClose={() => setEditingProduct(null)}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      )}

      {/* ====================================================================
          MODAL 4: CONFIGURACIÓN DE MARCA Y WHATSAPP
         ==================================================================== */}
      {showSettingsModal && (
        <BrandSettingsModal
          settings={brandSettings}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: MODAL DE EDICIÓN Y CREACIÓN DE BOLSO
// ============================================================================
function ProductFormModal({ initialData, categories, currency, onClose, onSave, onDelete }) {
  const availableCats = useMemo(() => {
    const base = Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    if (initialData.category && !base.includes(initialData.category)) {
      return [initialData.category, ...base];
    }
    return base;
  }, [categories, initialData.category]);

  const [formData, setFormData] = useState({
    id: initialData.id || null,
    name: initialData.name || '',
    category: initialData.category || availableCats[0] || 'Bolso',
    price: initialData.price || '',
    stockStatus: initialData.stockStatus || 'En stock',
    dimensions: initialData.dimensions || '',
    material: initialData.material || '',
    description: initialData.description || '',
    image: initialData.image || ''
  });

  const [imageTab, setImageTab] = useState('upload'); // 'upload' | 'url'
  const [imageError, setImageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmModalDelete, setConfirmModalDelete] = useState(false);

  // Conversión y compresión ligera de imagen local a Base64 para no exceder 1MB de Firestore
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Exportar a JPEG optimizado para garantizar peso ligero (< 250KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        setFormData((prev) => ({ ...prev, image: compressedBase64 }));
      };
      img.onerror = () => {
        setImageError('No se pudo procesar la imagen seleccionada.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;
    setSaving(true);
    await onSave({
      ...formData,
      price: Number(formData.price)
    });
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF7F2] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-[#E5DEC9] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#9E5A3C] font-semibold">
              Ficha de Producto
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              {formData.id ? 'Editar Bolso' : 'Nuevo Bolso en Catálogo'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E5DEC9] flex items-center justify-center text-[#57534E] hover:text-[#1C1917]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Fila 1: Nombre y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Nombre del modelo *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Tote Capri Piel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Categoría *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              >
                {availableCats.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2: Precio y Estado Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Precio ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="145"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Disponibilidad / Stock *
              </label>
              <select
                value={formData.stockStatus}
                onChange={(e) => setFormData({ ...formData, stockStatus: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              >
                {STOCK_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sección Fotografía (Subir archivo local o pegar URL) */}
          <div className="p-4 rounded-2xl bg-[#F2ECE1] border border-[#E5DEC9]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-xs font-semibold text-[#1C1917]">
                Fotografía del bolso
              </label>
              <div className="flex rounded-lg bg-[#E5DEC9] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                    imageTab === 'upload' ? 'bg-white text-[#1C1917] shadow-2xs' : 'text-[#57534E]'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Subir foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                    imageTab === 'url' ? 'bg-white text-[#1C1917] shadow-2xs' : 'text-[#57534E]'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Pegar URL</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Vista previa miniatura */}
              <div className="w-24 h-28 rounded-xl bg-white border border-[#D6CEC0] overflow-hidden shrink-0 flex items-center justify-center">
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-7 h-7 text-[#A8A29E] stroke-[1.2]" />
                )}
              </div>

              <div className="flex-1 w-full">
                {imageTab === 'upload' ? (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#CBBFA8] hover:border-[#9E5A3C] rounded-xl bg-white/70 hover:bg-white cursor-pointer transition px-4 text-center">
                      <Upload className="w-5 h-5 text-[#9E5A3C] mb-1" />
                      <span className="text-xs font-medium text-[#1C1917]">
                        Seleccionar imagen desde tu dispositivo
                      </span>
                      <span className="text-[11px] text-[#78716C] mt-0.5">
                        JPG, PNG o WebP (se optimiza automáticamente)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={formData.image.startsWith('data:') ? '' : formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://ejemplo.com/foto-bolso.jpg"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
                    />
                    <p className="text-[11px] text-[#78716C] mt-1.5">
                      Pega el enlace directo de una imagen alojada en internet.
                    </p>
                  </div>
                )}
                {imageError && <p className="text-xs text-[#DC2626] mt-1">{imageError}</p>}
              </div>
            </div>
          </div>

          {/* Fila 3: Materiales y Dimensiones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Materiales y herrajes
              </label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Ej. Piel vacuno italiana y latón"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
                Medidas (Ancho × Alto × Fondo)
              </label>
              <input
                type="text"
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                placeholder="Ej. 32 cm × 24 cm × 12 cm"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              />
            </div>
          </div>

          {/* Descripción Editorial */}
          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1.5">
              Descripción del diseño
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe los detalles artesanales, capacidad, tipo de cierre y ocasiones de uso..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
            />
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 border-t border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3">
            <div>
              {formData.id && onDelete && (
                confirmModalDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(initialData)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-medium transition shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>¿Confirmar borrado?</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmModalDelete(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-xs sm:text-sm font-medium transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar bolso</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-[#D6CEC0] text-xs sm:text-sm font-medium text-[#57534E] hover:bg-white transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#9E5A3C] text-white text-xs sm:text-sm font-medium transition shadow-md disabled:opacity-50"
              >
                {saving ? 'Guardando...' : formData.id ? 'Guardar Cambios' : 'Publicar en Catálogo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: MODAL DE CONFIGURACIÓN DE MARCA Y WHATSAPP
// ============================================================================
function BrandSettingsModal({ settings, onClose, onSave }) {
  const [form, setForm] = useState({
    ...settings,
    categories: Array.isArray(settings.categories) && settings.categories.length > 0
      ? settings.categories
      : DEFAULT_CATEGORIES
  });
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddCategory = () => {
    const clean = newCategoryInput.trim();
    if (!clean) return;
    if (form.categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setNewCategoryInput('');
      return;
    }
    setForm((prev) => ({
      ...prev,
      categories: [...prev.categories, clean]
    }));
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove) => {
    if (form.categories.length <= 1) return; // Mantener al menos 1 categoría activa
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== catToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF7F2] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E5DEC9] my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9]">
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#9E5A3C] font-semibold">
              Identidad & Pedidos
            </span>
            <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]">
              Ajustes de Marca y WhatsApp
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#E5DEC9] flex items-center justify-center text-[#57534E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              Nombre de tu marca de bolsos
            </label>
            <input
              type="text"
              required
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#1C1917] mb-1">
                Teléfono WhatsApp (con prefijo país)
              </label>
              <input
                type="text"
                required
                value={form.whatsappNumber}
                onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                placeholder="34600123456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              />
              <p className="text-[11px] text-[#78716C] mt-1">
                Sin símbolo + ni espacios (Ej. 34612345678 para España, 521... para México).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1C1917] mb-1">
                Moneda
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
              >
                <option value="€">€ (EUR)</option>
                <option value="$">$ (USD / MXN / ARS)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              Temporada o subtítulo superior
            </label>
            <input
              type="text"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              Titular principal de portada
            </label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1C1917] mb-1">
              Nota editorial de bienvenida
            </label>
            <textarea
              rows={2}
              value={form.editorialNote}
              onChange={(e) => setForm({ ...form, editorialNote: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D6CEC0] text-sm focus:outline-none focus:border-[#9E5A3C]"
            />
          </div>

          {/* Gestión de Tipos de Bolso / Categorías */}
          <div className="p-4 rounded-2xl bg-[#F2ECE1] border border-[#E5DEC9]">
            <label className="block text-xs font-semibold text-[#1C1917] mb-1">
              Tipos de bolso (Categorías del catálogo)
            </label>
            <p className="text-[11px] text-[#78716C] mb-3">
              Elimina con la <strong>×</strong> los que no uses (ej. Tote) o añade tus propios tipos.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {form.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D6CEC0] text-xs font-medium text-[#1C1917]"
                >
                  <span>{cat}</span>
                  {form.categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-[#78716C] hover:text-[#DC2626] transition"
                      title={`Eliminar ${cat}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="Nuevo tipo (ej. Riñonera, Capazo...)"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#D6CEC0] text-xs focus:outline-none focus:border-[#9E5A3C]"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3.5 py-2 rounded-xl bg-[#1C1917] hover:bg-[#9E5A3C] text-white text-xs font-medium transition"
              >
                Añadir
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5DEC9] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D6CEC0] text-xs font-medium text-[#57534E]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#9E5A3C] text-white text-xs font-medium transition"
            >
              {saving ? 'Guardando...' : 'Guardar Ajustes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}