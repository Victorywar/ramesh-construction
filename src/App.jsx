import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  Compass,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  CheckCircle2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MessageSquare,
  Building,
  Building2,
  Menu,
  Phone,
  Mail,
  MapPin,
  Star,
  ShieldCheck,
  Send,
  LogOut,
  FolderPlus,
  Layers,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";

const BRAND_LOGO = `${import.meta.env.BASE_URL}image.png`;
const firebaseConfigured = Boolean(auth && db);

async function compressImageFile(file) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");

  const image = await createImageBitmap(file);
  const maxDataUrlLength = 700 * 1024;
  let scale = Math.min(1, 1280 / Math.max(image.width, image.height));
  let quality = 0.82;
  let dataUrl;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= maxDataUrlLength) {
      image.close();
      return dataUrl;
    }
    if (quality > 0.58) quality -= 0.08;
    else {
      scale *= 0.8;
      quality = 0.74;
    }
  }

  image.close();
  throw new Error("This image could not be compressed small enough to store in Firestore.");
}

// Curated architectural fallback/starter presets representing Tamil Nadu & Modern Projects
const STUDIO_PRESETS = [
  {
    title: "Dravidian Temple Sanctum & Gopuram",
    category: "Temple Design",
    url: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Intricate Stone & Wood Pillar Carving",
    category: "Carving Work",
    url: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Contemporary Double-Height Elevation Villa",
    category: "Elevation Design",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Minimalist Teak Wood Living Interior",
    category: "Interior Design",
    url: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Solid RCC Multi-Storey Structural Build",
    category: "Construction",
    url: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1600&q=80"
  },
  {
    title: "Commercial Facade Architectural Elevation",
    category: "Elevation Design",
    url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1600&q=80"
  }
];

export default function App() {
  // Theme state: "dark" (pure black) or "light" (clean white studio)
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [logoError, setLogoError] = useState(false);

  // Authentication: "guest" (standard viewer) or "admin" (full unilateral control)
  const [userRole, setUserRole] = useState("guest");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Admin Studio Management
  const [adminViewOpen, setAdminViewOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("projects");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const adminFileInputRef = useRef(null);
  const hasProjectsSnapshot = useRef(false);
  const hasReviewsSnapshot = useRef(false);

  const [heroSlide, setHeroSlide] = useState(0);
  const heroSlides = [
    {
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      caption: "Bespoke Modern Elevation Villa",
      spec: "ELEVATION & INTERIORS • 2026"
    },
    {
      img: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80",
      caption: "Sacred Temple Gopuram & Mandapam",
      spec: "TRADITIONAL TEMPLE DESIGN • 2025"
    },
    {
      img: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=1600&q=80",
      caption: "Classical Stone Carving & Pillar Details",
      spec: "ORNAMENTAL CRAFTSMANSHIP • 2025"
    }
  ];

  // Core portfolio state - deleting here deletes immediately from user view
  const [projects, setProjects] = useState([
    {
      id: "PRJ-01",
      number: "01",
      name: "Sri Murugan Temple Mandapam & Gopuram",
      category: "Temple Design",
      year: "2025",
      location: "Tamil Nadu",
      area: "12,000 sq.ft",
      img: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1600&q=80",
      description: "Traditional sacred Dravidian temple architecture constructed with sculpted granite bas-reliefs, vimanam planning, and adherence to ancient Shilpa Shastras."
    },
    {
      id: "PRJ-02",
      number: "02",
      name: "Contemporary Double-Height Elevation Villa",
      category: "Elevation Design",
      year: "2026",
      location: "East Coast Road",
      area: "5,800 sq.ft",
      img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      description: "Distinctive geometric exterior elevation boasting cantilevered stone fins, integrated exterior mood lighting, and heat-resistant textured plaster."
    },
    {
      id: "PRJ-03",
      number: "03",
      name: "Pillar & Floral Granite Stone Carvings",
      category: "Carving Work",
      year: "2025",
      location: "Heritage Compound",
      area: "Bespoke Sculptures",
      img: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=1600&q=80",
      description: "Handcrafted ornamental stonework, decorative door jambs, and monolithic Yali stone pillars sculpted by master sthapatis and craftsmen."
    },
    {
      id: "PRJ-04",
      number: "04",
      name: "Minimalist Warm Oak & Teak Living Suite",
      category: "Interior Design",
      year: "2025",
      location: "Urban Residency",
      area: "3,400 sq.ft",
      img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80",
      description: "Curated interior architecture featuring acoustic wooden fluting, hidden ambient cove lighting, bespoke cabinetry, and open spatial planning."
    },
    {
      id: "PRJ-05",
      number: "05",
      name: "Solid RCC Multi-Level Residential Build",
      category: "Construction",
      year: "2024",
      location: "Cuddalore District",
      area: "7,500 sq.ft",
      img: "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1600&q=80",
      description: "Comprehensive end-to-end civil construction with rigorous seismic reinforcement, premium concrete mixtures, and turnkey finishing."
    }
  ]);

  const [selectedProject, setSelectedProject] = useState(null);

  // New project upload form state
  const [newProject, setNewProject] = useState({
    name: "",
    category: "Elevation Design",
    year: "2026",
    location: "Cuddalore & Regional Sites",
    area: "",
    description: "",
    img: ""
  });

  const [reviews, setReviews] = useState([
    {
      id: "REV-01",
      author: "K. VENKATESH",
      role: "Temple Trust Committee Head",
      type: "Temple & Carving Project",
      year: "2025",
      rating: 5,
      photo: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1000&q=80",
      text: "Ramesh sir and his team executed our temple mandapam and decorative stone carvings with awe-inspiring dedication. Every pillar was carved with traditional mastery and delivered on schedule.",
      status: "approved"
    },
    {
      id: "REV-02",
      author: "SIVAKUMAR ANAND",
      role: "Private Homeowner",
      type: "Modern Elevation & Civil Build",
      year: "2025",
      rating: 5,
      photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
      text: "The modern elevation design transformed our house completely. The exact look from the 3D model was turned into reality on the ground with zero compromises in build quality.",
      status: "approved"
    },
    {
      id: "REV-03",
      author: "DR. ARCHANA RAO",
      role: "Estate Owner",
      type: "Turnkey Interior Design",
      year: "2024",
      rating: 5,
      photo: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=80",
      text: "Ramesh . Ramesh Cons provided attentive craftsmanship from the woodwork to lighting. Their team understands client requirements and makes spaces both functional and luxurious.",
      status: "approved"
    }
  ]);
  const [inquiries, setInquiries] = useState([]);
  const [inquiryForm, setInquiryForm] = useState({ name: "", phone: "", email: "", scope: "Elevation Design", details: "" });
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState("");

  // Client review submission state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [customerReview, setCustomerReview] = useState({
    author: "",
    role: "",
    type: "Elevation Design",
    rating: 5,
    text: "",
    photo: ""
  });
  const [showCustomerPresetModal, setShowCustomerPresetModal] = useState(false);
  const customerFileInputRef = useRef(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState("");

  useEffect(() => {
    if (!firebaseConfigured || !db) return undefined;

    const stopProjects = onSnapshot(
      query(collection(db, "projects"), orderBy("createdAt", "desc")),
      (snapshot) => {
        if (snapshot.empty && !hasProjectsSnapshot.current) return;
        hasProjectsSnapshot.current = true;
        setProjects(snapshot.docs.map((projectDoc, index) => {
          const data = projectDoc.data();
          return {
            ...data,
            id: projectDoc.id,
            number: data.number || String(index + 1).padStart(2, "0"),
            name: data.title || data.name,
            img: data.imageUrl || data.img
          };
        }));
      },
      (error) => console.error("Projects listener failed:", error)
    );

    const reviewsQuery = userRole === "admin"
      ? query(collection(db, "reviews"), orderBy("createdAt", "desc"))
      : query(collection(db, "reviews"), where("status", "==", "approved"), orderBy("createdAt", "desc"));
    const stopReviews = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        if (snapshot.empty && !hasReviewsSnapshot.current) return;
        hasReviewsSnapshot.current = true;
        setReviews(snapshot.docs.map((reviewDoc) => ({ id: reviewDoc.id, ...reviewDoc.data() })));
      },
      (error) => console.error("Reviews listener failed:", error)
    );
    const stopSeedMarker = onSnapshot(doc(db, "siteConfig", "initialContent"), (snapshot) => {
      if (!snapshot.exists()) return;
      if (!hasProjectsSnapshot.current) {
        hasProjectsSnapshot.current = true;
        setProjects([]);
      }
      if (!hasReviewsSnapshot.current) {
        hasReviewsSnapshot.current = true;
        setReviews([]);
      }
    }, (error) => console.error("Initial content marker listener failed:", error));

    if (userRole !== "admin") return () => {
      stopProjects();
      stopReviews();
      stopSeedMarker();
    };

    const stopInquiries = onSnapshot(
      query(collection(db, "inquiries"), orderBy("createdAt", "desc")),
      (snapshot) => setInquiries(snapshot.docs.map((inquiryDoc) => ({ id: inquiryDoc.id, ...inquiryDoc.data() }))),
      (error) => console.error("Inquiries listener failed:", error)
    );

    return () => {
      stopProjects();
      stopReviews();
      stopSeedMarker();
      stopInquiries();
    };
  }, [userRole]);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserRole("guest");
        return;
      }
      const token = await user.getIdTokenResult();
      if (token.claims.admin === true) {
        setUserRole("admin");
        setAdminViewOpen(true);
      } else {
        setUserRole("guest");
        await signOut(auth);
        setAdminAuthError("This Firebase account is not authorized as an administrator.");
      }
    });
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminAuthError("");
    if (!auth || !db) {
      setAdminAuthError("Firebase is not configured. Add the VITE_FIREBASE_* values to your environment.");
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
      const token = await user.getIdTokenResult(true);
      if (token.claims.admin !== true) {
        await signOut(auth);
        throw new Error("This Firebase account is not authorized as an administrator.");
      }

      await runTransaction(db, async (transaction) => {
        const marker = doc(db, "siteConfig", "initialContent");
        const markerSnapshot = await transaction.get(marker);
        if (markerSnapshot.exists()) return;

        transaction.set(marker, { initializedAt: serverTimestamp() });
        projects.forEach((project) => {
          transaction.set(doc(db, "projects", project.id), {
            title: project.name,
            category: project.category,
            imageUrl: project.img,
            number: project.number,
            year: project.year,
            location: project.location,
            area: project.area,
            description: project.description,
            createdAt: serverTimestamp()
          });
        });
        reviews.forEach((review) => {
          transaction.set(doc(db, "reviews", review.id), { ...review, createdAt: serverTimestamp() });
        });
      });

      setAuthModalOpen(false);
      setAdminPasswordInput("");
    } catch (error) {
      setAdminAuthError(error.message || "Unable to sign in. Check the Firebase account credentials.");
    }
  };

  // Upload handler for device gallery / camera files
  const handleAdminImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImageFile(file);
        setNewProject((prev) => ({ ...prev, img: compressedImage }));
      } catch (error) {
        alert(error.message || "Unable to prepare this project image.");
      }
    }
  };

  const handleCustomerImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedImage = await compressImageFile(file);
        setCustomerReview((prev) => ({ ...prev, photo: compressedImage }));
      } catch (error) {
        alert(error.message || "Unable to prepare this review image.");
      }
    }
  };

  // Add new project: instantly connects and displays on main user-facing page
  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.name.trim() || !newProject.img) {
      alert("Please enter a project title and select a photo from your device.");
      return;
    }

    if (!db) return alert("Firebase is not configured. Project changes cannot be saved.");
    try {
      await addDoc(collection(db, "projects"), {
        title: newProject.name.trim(),
        category: newProject.category,
        imageUrl: newProject.img,
        year: newProject.year || "2026",
        location: newProject.location || "Tamil Nadu",
        area: newProject.area || "Custom Footprint",
        description: newProject.description.trim() || "Custom designed and executed by Ramesh . Ramesh Cons with premium materials, precision engineering, and traditional expertise.",
        createdAt: serverTimestamp()
      });
      setNewProject({ name: "", category: "Elevation Design", year: "2026", location: "Cuddalore & Regional Sites", area: "", description: "", img: "" });
      alert("Project published to the live portfolio.");
    } catch (error) {
      alert(error.message || "Unable to publish the project.");
    }
  };

  // Delete project: removes instantly from both Admin Desk and Public User View
  const handleDeleteProject = async (id, projectName) => {
    if (window.confirm(`Are you sure you want to permanently delete "${projectName || 'this project'}" from the live website?`)) {
      try {
        if (!db) throw new Error("Firebase is not configured.");
        await deleteDoc(doc(db, "projects", id));
        if (selectedProject?.id === id) setSelectedProject(null);
      } catch (error) {
        alert(error.message || "Unable to delete the project.");
      }
    }
  };

  // Review submission by visitor (sent to pending moderation queue)
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!customerReview.author.trim() || !customerReview.text.trim()) {
      alert("Please provide your name and review details.");
      return;
    }

    if (!db) return alert("Firebase is not configured. Reviews cannot be submitted.");
    try {
      await addDoc(collection(db, "reviews"), {
        author: customerReview.author.trim().toUpperCase(),
        role: customerReview.role.trim() || "Valued Client",
        type: customerReview.type,
        year: "2026",
        rating: customerReview.rating,
        photo: customerReview.photo || "",
        text: customerReview.text.trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      setReviewSuccessMsg("Your review and handover photograph have been submitted for verification.");
    } catch (error) {
      alert(error.message || "Unable to submit the review.");
      return;
    }
    setTimeout(() => {
      setReviewSuccessMsg("");
      setReviewModalOpen(false);
      setCustomerReview({
        author: "",
        role: "",
        type: "Elevation Design",
        rating: 5,
        text: "",
        photo: ""
      });
    }, 2000);
  };

  // Moderate reviews: Admin can Approve, Reject, or Permanently Delete any review
  const handleModerateReview = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "reviews", id), { status: newStatus });
    } catch (error) {
      alert(error.message || "Unable to update the review.");
    }
  };

  const handleDeleteReview = async (id, author) => {
    if (window.confirm(`Permanently remove review by ${author} from the website?`)) {
      try {
        await deleteDoc(doc(db, "reviews", id));
      } catch (error) {
        alert(error.message || "Unable to delete the review.");
      }
    }
  };

  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    if (!db) return alert("Firebase is not configured. Inquiries cannot be submitted.");
    try {
      await addDoc(collection(db, "inquiries"), { ...inquiryForm, createdAt: serverTimestamp() });
      setInquirySuccessMsg("Your consultation request has been received.");
      setInquiryForm({ name: "", phone: "", email: "", scope: "Elevation Design", details: "" });
      setTimeout(() => setInquirySuccessMsg(""), 5000);
    } catch (error) {
      alert(error.message || "Unable to submit the consultation request.");
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm("Delete this consultation inquiry?")) return;
    try {
      await deleteDoc(doc(db, "inquiries", id));
    } catch (error) {
      alert(error.message || "Unable to delete the inquiry.");
    }
  };

  const filteredProjects =
    activeTab === "all"
      ? projects
      : projects.filter(
          (p) => p.category.toLowerCase() === activeTab.toLowerCase()
        );

  const approvedReviews = reviews.filter((r) => r.status === "approved");
  const pendingReviews = reviews.filter((r) => r.status === "pending");

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans selection:bg-amber-500 selection:text-black ${
        isDark ? "bg-black text-white" : "bg-neutral-50 text-neutral-900"
      }`}
    >
      {/* -------------------- FIXED 76PX NAVBAR -------------------- */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-[76px] backdrop-blur-md border-b transition-colors ${
          isDark
            ? "bg-black/95 border-neutral-800 text-white"
            : "bg-white/95 border-neutral-200 text-neutral-900 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
          {/* Logo & Entity Name */}
          <a href="#home" className="flex items-center gap-3.5 group">
            <div
              className={`relative w-12 h-12 rounded-sm overflow-hidden border p-0.5 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                isDark
                  ? "bg-neutral-900 border-amber-500/50 shadow-md shadow-amber-950/20"
                  : "bg-neutral-100 border-amber-600/60 shadow"
              }`}
            >
              <img
                src={BRAND_LOGO}
                alt="SR Construction Golden Emblem"
                className="w-full h-full object-cover object-center"
                onError={() => setLogoError(true)}
              />
              {logoError && (
                <div className="w-full h-full bg-gradient-to-br from-amber-600/30 via-neutral-900 to-amber-950 flex items-center justify-center font-black text-amber-400 text-base">
                  SR
                </div>
              )}
            </div>
            <div>
              <div className="text-sm sm:text-base font-black tracking-tight leading-none group-hover:text-amber-500 transition-colors uppercase">
                SR CONSTRUCTION
              </div>
              <div
                className={`text-[9px] tracking-widest font-mono uppercase mt-1 ${
                  isDark ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                RAMESH &bull; 
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            className={`hidden lg:flex items-center gap-7 text-xs font-bold uppercase tracking-wider ${
              isDark ? "text-neutral-300" : "text-neutral-600"
            }`}
          >
            <a href="#home" className="hover:text-amber-500 transition-colors">Home</a>
            <a href="#about" className="hover:text-amber-500 transition-colors">About</a>
            <a href="#services" className="hover:text-amber-500 transition-colors">Expertise</a>
            <a href="#projects" className="hover:text-amber-500 transition-colors">Projects</a>
            <a href="#reviews" className="hover:text-amber-500 transition-colors">Reviews</a>
            <a href="#contact" className="hover:text-amber-500 transition-colors">Contact</a>
          </nav>

          {/* Navbar Right Actions: Theme Toggle & Admin Access */}
          <div className="flex items-center gap-3">
            {/* High-Contrast Light / Dark Theme Switcher */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? "Light Studio Theme" : "Dark Black Theme"}`}
              className={`p-2.5 rounded-sm border flex items-center justify-center transition-all ${
                isDark
                  ? "border-neutral-800 bg-neutral-900 text-amber-400 hover:border-amber-400 hover:bg-neutral-800"
                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900 shadow-sm"
              }`}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {userRole === "admin" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminViewOpen(true)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black tracking-wider uppercase transition-colors flex items-center gap-1.5 shadow"
                >
                  <ShieldCheck size={14} />
                  <span>Admin Desk</span>
                </button>
                <button
                  onClick={() => {
                    signOut(auth);
                    setAdminViewOpen(false);
                  }}
                  title="Sign Out Admin"
                  className={`p-2 border transition-colors ${
                    isDark
                      ? "border-neutral-700 text-neutral-300 hover:text-white hover:border-white"
                      : "border-neutral-300 text-neutral-600 hover:text-black hover:border-black"
                  }`}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className={`px-4 py-2 border text-xs font-bold uppercase tracking-wider transition-colors ${
                  isDark
                    ? "border-neutral-700 hover:border-white text-neutral-200"
                    : "border-neutral-300 hover:border-black text-neutral-800"
                }`}
              >
                Login
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 border ${
                isDark
                  ? "text-neutral-300 hover:text-white border-neutral-800"
                  : "text-neutral-700 hover:text-black border-neutral-300"
              }`}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className={`lg:hidden border-b px-6 py-6 space-y-4 text-sm font-bold uppercase tracking-wider ${
              isDark ? "bg-neutral-950 border-neutral-800" : "bg-white border-neutral-200 shadow-xl"
            }`}
          >
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">Home</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">About</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">Expertise</a>
            <a href="#projects" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">Projects</a>
            <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">Reviews</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block hover:text-amber-500">Contact</a>
          </div>
        )}
      </header>

      {/* -------------------- HERO SECTION -------------------- */}
      <section
        id="home"
        className={`pt-24 lg:pt-[76px] lg:h-screen lg:min-h-[720px] flex items-center justify-center border-b overflow-hidden ${
          isDark ? "border-neutral-900 bg-black" : "border-neutral-200 bg-white"
        }`}
      >
        <div className="max-w-7xl w-full mx-auto px-6 sm:px-8 py-10 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Column (Hero Content) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-amber-500" />
                <span
                  className={`text-[11px] sm:text-xs font-mono tracking-widest uppercase ${
                    isDark ? "text-neutral-400" : "text-neutral-600 font-semibold"
                  }`}
                >
                  RAMESH  &bull; QUALITY ARCHITECTURE
                </span>
              </div>

              <h1
                className={`text-4xl sm:text-6xl md:text-7xl xl:text-8xl font-black uppercase tracking-tight leading-[0.92] ${
                  isDark ? "text-white" : "text-black"
                }`}
              >
                WE BUILD.
                <br />
                <span className={isDark ? "text-neutral-500" : "text-neutral-400"}>
                  YOU IMAGINE.
                </span>
              </h1>

              <p
                className={`mt-6 sm:mt-8 text-sm sm:text-base md:text-lg max-w-xl font-light leading-relaxed ${
                  isDark ? "text-neutral-300" : "text-neutral-700"
                }`}
              >
                Creating modern spaces with precision, quality, and trust. Specializing
                in custom elevation design, turnkey interiors, sacred temple architecture,
                ornamental carving, and complete civil construction.
              </p>

              <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-4">
                <a
                  href="#projects"
                  className={`px-6 sm:px-8 py-3.5 text-xs sm:text-sm font-black tracking-wider uppercase flex items-center gap-2 transition-all ${
                    isDark
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-black text-white hover:bg-neutral-800 shadow"
                  }`}
                >
                  <span>VIEW PROJECTS</span>
                  <ArrowUpRight size={16} />
                </a>
                <a
                  href="#contact"
                  className={`px-6 sm:px-8 py-3.5 border text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors ${
                    isDark
                      ? "border-neutral-700 text-white hover:border-white"
                      : "border-neutral-400 text-black hover:border-black"
                  }`}
                >
                  CONTACT RAMESH
                </a>
              </div>
            </div>

            {/* Right Column (Hero Slideshow) */}
            <div className="lg:col-span-5 relative mt-4 lg:mt-0">
              <div
                className={`relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5] w-full border overflow-hidden ${
                  isDark ? "bg-neutral-900 border-neutral-800" : "bg-neutral-100 border-neutral-300 shadow-lg"
                }`}
              >
                <img
                  src={heroSlides[heroSlide].img}
                  alt={heroSlides[heroSlide].caption}
                  className="w-full h-full object-cover transition-opacity duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="text-white font-bold uppercase tracking-wider">
                      {heroSlides[heroSlide].caption}
                    </div>
                    <div className="text-amber-400 text-[10px] tracking-wider mt-0.5">
                      {heroSlides[heroSlide].spec}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setHeroSlide((prev) =>
                          prev === 0 ? heroSlides.length - 1 : prev - 1
                        )
                      }
                      className="p-2 bg-black/70 hover:bg-black text-white border border-neutral-700"
                      aria-label="Previous slide"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setHeroSlide((prev) =>
                          prev === heroSlides.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="p-2 bg-black/70 hover:bg-black text-white border border-neutral-700"
                      aria-label="Next slide"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- ABOUT SECTION (BUSINESS PROFILE) -------------------- */}
      <section
        id="about"
        className={`py-16 sm:py-24 border-b transition-colors duration-300 ${
          isDark ? "bg-[#0b0b0b] border-neutral-800" : "bg-white border-neutral-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase mb-3">
                ABOUT OUR PRACTICE
              </span>
              <h2
                className={`text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                BUILDING SPACES.
                <br />
                CREATING TRUST.
              </h2>
              <div className="mt-4 inline-flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                RAMESH &bull; RAMESH CONS
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p
                  className={`text-base sm:text-lg font-normal leading-relaxed ${
                    isDark ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  <strong className="font-bold">Ramesh Cons</strong> is a dedicated construction and design practice specializing in elevation design, interior design, temple architecture, and detailed carving work.
                </p>
                <p
                  className={`text-sm sm:text-base font-normal leading-relaxed ${
                    isDark ? "text-neutral-200" : "text-neutral-800"
                  }`}
                >
                  With a focus on quality workmanship and detailed finishing, we work closely with clients to understand specific requirements and create spaces that are both visually appealing and structurally permanent.
                </p>
              </div>

              {/* Three Core Pillars */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t ${
                  isDark ? "border-neutral-800" : "border-neutral-300"
                }`}
              >
                <div>
                  <div
                    className={`text-lg font-bold tracking-tight uppercase ${
                      isDark ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    01. PRECISION
                  </div>
                  <p
                    className={`mt-2 text-sm font-normal leading-relaxed ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    Exact proportioning in architectural elevations, structural reinforcement, and stone carvings.
                  </p>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold tracking-tight uppercase ${
                      isDark ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    02. QUALITY
                  </div>
                  <p
                    className={`mt-2 text-sm font-normal leading-relaxed ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    Tested civil materials, seasoned teak hardwoods, and certified natural temple stone.
                  </p>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold tracking-tight uppercase ${
                      isDark ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    03. TRUST
                  </div>
                  <p
                    className={`mt-2 text-sm font-normal leading-relaxed ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    Transparent milestones, direct owner communication, and reliable handover guarantees.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 5 CORE SPECIALIZATIONS -------------------- */}
      <section
        id="services"
        className={`py-24 lg:py-32 border-b transition-colors ${
          isDark ? "bg-black border-neutral-900" : "bg-white border-neutral-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div
            className={`flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b ${
              isDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          >
            <div>
              <span
                className={`text-xs font-mono tracking-widest uppercase ${
                  isDark ? "text-neutral-400" : "text-neutral-600 font-semibold"
                }`}
              >
                OUR EXPERTISE & DISCIPLINES
              </span>
              <h2
                className={`mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                SPECIALIZED CAPABILITIES
              </h2>
            </div>
            <p
              className={`mt-4 md:mt-0 text-xs sm:text-sm font-mono max-w-xs uppercase ${
                isDark ? "text-neutral-400" : "text-neutral-600"
              }`}
            >
              5 CORE DISCIPLINES BY RAMESH . RAMESH CONS
            </p>
          </div>

          {/* 5-Card Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 01 — ELEVATION DESIGN */}
            <div
              className={`border p-8 transition-all group ${
                isDark
                  ? "border-neutral-800 bg-neutral-950 hover:border-amber-500/80"
                  : "border-neutral-200 bg-neutral-50 hover:border-amber-600 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-bold">01 — SPECIALIZATION</span>
                <Sparkles size={16} className="text-neutral-500 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3
                className={`mt-6 text-xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                ELEVATION DESIGN
              </h3>
              <p
                className={`mt-3 text-xs leading-relaxed ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Distinctive exterior elevations designed with modern style, proportion and attention to detail.
              </p>
            </div>

            {/* 02 — INTERIOR DESIGN */}
            <div
              className={`border p-8 transition-all group ${
                isDark
                  ? "border-neutral-800 bg-neutral-950 hover:border-amber-500/80"
                  : "border-neutral-200 bg-neutral-50 hover:border-amber-600 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-bold">02 — SPECIALIZATION</span>
                <Layers size={16} className="text-neutral-500 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3
                className={`mt-6 text-xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                INTERIOR DESIGN
              </h3>
              <p
                className={`mt-3 text-xs leading-relaxed ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Functional and thoughtfully planned interiors with careful attention to materials, layout and finishing.
              </p>
            </div>

            {/* 03 — TEMPLE DESIGN */}
            <div
              className={`border p-8 transition-all group ${
                isDark
                  ? "border-neutral-800 bg-neutral-950 hover:border-amber-500/80"
                  : "border-neutral-200 bg-neutral-50 hover:border-amber-600 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-bold">03 — SPECIALIZATION</span>
                <Compass size={16} className="text-neutral-500 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3
                className={`mt-6 text-xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                TEMPLE DESIGN
              </h3>
              <p
                className={`mt-3 text-xs leading-relaxed ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Traditional temple design and construction work with respect for architectural details and craftsmanship.
              </p>
            </div>

            {/* 04 — CARVING WORK */}
            <div
              className={`border p-8 transition-all group ${
                isDark
                  ? "border-neutral-800 bg-neutral-950 hover:border-amber-500/80"
                  : "border-neutral-200 bg-neutral-50 hover:border-amber-600 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-bold">04 — SPECIALIZATION</span>
                <Building size={16} className="text-neutral-500 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3
                className={`mt-6 text-xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                CARVING WORK
              </h3>
              <p
                className={`mt-3 text-xs leading-relaxed ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Detailed carving work that brings character, craftsmanship and traditional elements to every project.
              </p>
            </div>

            {/* 05 — CONSTRUCTION */}
            <div
              className={`border p-8 transition-all group md:col-span-2 lg:col-span-2 ${
                isDark
                  ? "border-neutral-800 bg-neutral-950 hover:border-amber-500/80"
                  : "border-neutral-200 bg-neutral-50 hover:border-amber-600 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-500 font-bold">05 — SPECIALIZATION</span>
                <Building2 size={16} className="text-neutral-500 group-hover:text-amber-500 transition-colors" />
              </div>
              <h3
                className={`mt-6 text-xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                CONSTRUCTION
              </h3>
              <p
                className={`mt-3 text-xs leading-relaxed max-w-xl ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                Reliable construction work focused on quality, precision and customer requirements. From soil foundation through turnkey handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- BUILT PORTFOLIO ARCHIVE -------------------- */}
      <section
        id="projects"
        className={`py-24 lg:py-32 border-b transition-colors ${
          isDark ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono tracking-widest uppercase ${
                    isDark ? "text-neutral-400" : "text-neutral-600 font-semibold"
                  }`}
                >
                  SELECTED PORTFOLIO
                </span>
                {userRole === "admin" && (
                  <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
                    ADMIN MODE ACTIVE (DELETE ENABLED)
                  </span>
                )}
              </div>
              <h2
                className={`mt-2 text-3xl sm:text-5xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                SELECTED WORKS
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="mt-6 md:mt-0 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              {["all", "temple design", "elevation design", "carving work", "interior design", "construction"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 border transition-all ${
                    activeTab === tab
                      ? isDark
                        ? "border-amber-500 bg-amber-500 text-black font-black"
                        : "border-black bg-black text-white font-black"
                      : isDark
                      ? "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white"
                      : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-black"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className={`group border flex flex-col justify-between overflow-hidden cursor-pointer transition-all relative ${
                  isDark
                    ? "border-neutral-800 bg-black hover:border-neutral-600"
                    : "border-neutral-300 bg-white hover:border-neutral-900 shadow-sm"
                }`}
                onClick={() => setSelectedProject(p)}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-black/85 text-white px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase border border-neutral-700">
                    PROJECT {p.number}
                  </div>
                  <div className="absolute top-3 right-3 bg-amber-500 text-black font-black px-2.5 py-0.5 text-[10px] uppercase tracking-wider">
                    {p.category}
                  </div>

                  {/* Admin Fast Delete Overlay Button directly on card */}
                  {userRole === "admin" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(p.id, p.name);
                      }}
                      title="Permanently Delete Project"
                      className="absolute bottom-3 right-3 p-2 bg-red-600 hover:bg-red-500 text-white rounded-sm shadow-lg transition-transform hover:scale-110 z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div
                  className={`p-6 flex items-center justify-between border-t ${
                    isDark ? "border-neutral-800" : "border-neutral-200"
                  }`}
                >
                  <div>
                    <h3
                      className={`text-lg sm:text-xl font-bold uppercase tracking-tight ${
                        isDark ? "text-white" : "text-neutral-950"
                      }`}
                    >
                      {p.name}
                    </h3>
                    <div
                      className={`text-xs font-mono mt-1 ${
                        isDark ? "text-neutral-400" : "text-neutral-600"
                      }`}
                    >
                      {p.location} &bull; {p.area}
                    </div>
                  </div>
                  <div
                    className={`p-2 border transition-colors ${
                      isDark
                        ? "border-neutral-700 text-neutral-300 group-hover:border-white group-hover:text-white"
                        : "border-neutral-300 text-neutral-700 group-hover:border-black group-hover:text-black"
                    }`}
                  >
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className={`p-12 text-center border font-mono text-xs uppercase ${
              isDark ? "border-neutral-800 text-neutral-500" : "border-neutral-300 text-neutral-600"
            }`}>
              No projects found in this category.
            </div>
          )}
        </div>
      </section>

      {/* -------------------- REVIEWS SECTION -------------------- */}
      <section
        id="reviews"
        className={`py-24 lg:py-32 border-b transition-colors ${
          isDark ? "bg-black border-neutral-900" : "bg-white border-neutral-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div
            className={`flex flex-col lg:flex-row lg:items-end justify-between mb-16 pb-8 border-b ${
              isDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          >
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-amber-500" />
                <span
                  className={`text-xs font-mono tracking-widest uppercase ${
                    isDark ? "text-neutral-400" : "text-neutral-600 font-semibold"
                  }`}
                >
                  HANDOVERS FINALIZE.
                </span>
                <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-wider">
                  AUDITED
                </span>
              </div>
              <h2
                className={`text-3xl sm:text-5xl font-black uppercase tracking-tight ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                VERIFIED CLIENT REVIEWS.
              </h2>
            </div>

            <button
              onClick={() => setReviewModalOpen(true)}
              className={`mt-6 lg:mt-0 px-6 py-3 border text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 self-start lg:self-auto ${
                isDark
                  ? "border-white text-white hover:bg-white hover:text-black"
                  : "border-black text-black hover:bg-black hover:text-white shadow-sm"
              }`}
            >
              <MessageSquare size={14} />
              <span>SHARE YOUR EXPERIENCE</span>
            </button>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {approvedReviews.map((rev) => (
              <div
                key={rev.id}
                className={`border p-6 flex flex-col justify-between transition-colors relative ${
                  isDark
                    ? "border-neutral-800 bg-neutral-950"
                    : "border-neutral-300 bg-neutral-50 shadow-sm"
                }`}
              >
                <div>
                  {rev.photo && (
                    <div className="relative aspect-[16/10] w-full mb-6 overflow-hidden border border-neutral-700 bg-neutral-900">
                      <img
                        src={rev.photo}
                        alt="Handover project photo"
                        className="w-full h-full object-cover filter grayscale contrast-125"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/85 text-[9px] font-mono px-2 py-0.5 text-neutral-300 uppercase tracking-widest border border-neutral-700">
                        HANDOVER RECORD &bull; {rev.year}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} size={14} fill="currentColor" stroke="none" />
                      ))}
                    </div>

                    {/* Admin Delete Review Direct Control */}
                    {userRole === "admin" && (
                      <button
                        onClick={() => handleDeleteReview(rev.id, rev.author)}
                        className="text-red-500 hover:text-red-400 p-1 border border-red-500/40 hover:border-red-500 text-[10px] font-mono flex items-center gap-1"
                        title="Delete Review"
                      >
                        <Trash2 size={12} />
                        <span>DELETE</span>
                      </button>
                    )}
                  </div>

                  <p
                    className={`text-xs sm:text-sm font-light uppercase leading-relaxed font-sans ${
                      isDark ? "text-neutral-200" : "text-neutral-800"
                    }`}
                  >
                    "{rev.text}"
                  </p>
                </div>

                <div
                  className={`mt-8 pt-4 border-t ${
                    isDark ? "border-neutral-800" : "border-neutral-300"
                  }`}
                >
                  <div
                    className={`text-sm font-black uppercase tracking-wider ${
                      isDark ? "text-white" : "text-neutral-950"
                    }`}
                  >
                    {rev.author}
                  </div>
                  <div
                    className={`text-[11px] font-mono mt-0.5 ${
                      isDark ? "text-neutral-400" : "text-neutral-600"
                    }`}
                  >
                    {rev.role} &bull; {rev.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- CONTACT SECTION (RAMESH / PHONE / EMAIL / WHATSAPP) -------------------- */}
      <section
        id="contact"
        className={`py-24 lg:py-32 border-b transition-colors ${
          isDark ? "bg-neutral-950 border-neutral-900" : "bg-neutral-100 border-neutral-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-12 items-start gap-12 lg:gap-16">
            {/* Direct Contact Info */}
            <div className="min-w-0 lg:col-span-5">
              <span
                className={`text-xs font-mono tracking-widest uppercase ${
                  isDark ? "text-neutral-400" : "text-neutral-600 font-semibold"
                }`}
              >
                DIRECT INQUIRIES
              </span>
              <h2
                className={`mt-3 text-3xl sm:text-5xl font-black uppercase tracking-tight leading-[0.95] ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                START A
                <br />
                CONVERSATION.
              </h2>

              <p
                className={`mt-6 text-sm leading-relaxed font-light ${
                  isDark ? "text-neutral-300" : "text-neutral-700"
                }`}
              >
                Contact <strong>RAMESH</strong> directly for elevation sketches, temple
                proposals, wood/stone carving estimates, or turnkey civil construction requirements.
              </p>

              <div className="mt-10 space-y-6 text-xs font-mono">
                {/* Contact Person */}
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-amber-500/50 text-amber-500 bg-amber-500/10">
                    <Building size={16} />
                  </div>
                  <div>
                    <div className={isDark ? "text-neutral-400 uppercase" : "text-neutral-600 uppercase font-semibold"}>
                      CONTACT PERSON & PRACTICE
                    </div>
                    <div className={`mt-1 font-bold text-sm ${isDark ? "text-white" : "text-neutral-950"}`}>
                      RAMESH &bull;
                    </div>
                  </div>
                </div>

                {/* Studio Headquarters */}
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-amber-500/50 text-amber-500 bg-amber-500/10">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className={isDark ? "text-neutral-400 uppercase" : "text-neutral-600 uppercase font-semibold"}>
                      STUDIO HEADQUARTERS
                    </div>
                    <div className={`mt-1 font-bold text-sm ${isDark ? "text-white" : "text-neutral-950"}`}>
                      Chennai, Tamil Nadu
                    </div>
                  </div>
                </div>

                {/* Phones */}
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-amber-500/50 text-amber-500 bg-amber-500/10">
                    <Phone size={16} />
                  </div>
                  <div>
                    <div className={isDark ? "text-neutral-400 uppercase" : "text-neutral-600 uppercase font-semibold"}>
                      TELEPHONE & DIRECT LINE
                    </div>
                    <div className={`mt-1 font-bold text-sm ${isDark ? "text-white" : "text-neutral-950"}`}>
                      <a href="tel:9443658583" className="hover:text-amber-500 underline mr-2">9443658583</a> / 
                      <a href="tel:7904694679" className="hover:text-amber-500 underline ml-2">7904694679</a>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-amber-500/50 text-amber-500 bg-amber-500/10">
                    <Mail size={16} />
                  </div>
                  <div>
                    <div className={isDark ? "text-neutral-400 uppercase" : "text-neutral-600 uppercase font-semibold"}>
                      OFFICIAL EMAIL
                    </div>
                    <div className={`mt-1 font-bold text-sm ${isDark ? "text-white" : "text-neutral-950"}`}>
                      <a href="mailto:sr.construction0711@gmail.com" className="hover:text-amber-500 underline">
                        sr.construction0711@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action Button */}
              <div className="mt-8">
                <a
                  href="https://wa.me/919443658583?text=Hello%20Ramesh%20sir,%20I%20would%20like%20to%20consult%20regarding%20a%20project%20with%20SR%20Construction."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
                >
                  <Send size={15} />
                  <span>DIRECT WHATSAPP DESK (+91 9443658583)</span>
                </a>
              </div>
            </div>

            {/* Consultation Form */}
            <div
              className={`min-w-0 w-full lg:col-span-7 border p-6 sm:p-10 transition-colors ${
                isDark ? "bg-black border-neutral-800" : "bg-white border-neutral-300 shadow-xl"
              }`}
            >
              <h3
                className={`text-xl font-black uppercase tracking-tight mb-2 ${
                  isDark ? "text-white" : "text-neutral-950"
                }`}
              >
                PROJECT CONSULTATION FORM
              </h3>
              <p
                className={`text-xs font-mono mb-8 uppercase ${
                  isDark ? "text-neutral-400" : "text-neutral-600"
                }`}
              >
                TRANSMITTING DIRECTLY TO SR.CONSTRUCTION0711@GMAIL.COM
              </p>

              <form
                onSubmit={handleSubmitInquiry}
                className="space-y-6 text-xs font-mono"
              >
                {inquirySuccessMsg && (
                  <div role="status" className="border border-emerald-700 bg-emerald-950/40 p-3 text-emerald-300">
                    {inquirySuccessMsg}
                  </div>
                )}
                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="min-w-0">
                    <label className={isDark ? "block text-neutral-300 uppercase mb-2" : "block text-neutral-700 uppercase mb-2 font-bold"}>
                      YOUR NAME *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sivakumar"
                      value={inquiryForm.name}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, name: e.target.value })}
                      className={`block min-w-0 w-full min-h-12 border px-4 py-3 focus:outline-none focus:border-amber-500 font-sans text-xs ${
                        isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={isDark ? "block text-neutral-300 uppercase mb-2" : "block text-neutral-700 uppercase mb-2 font-bold"}>
                      YOUR PHONE NUMBER *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9443658583"
                      value={inquiryForm.phone}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value })}
                      className={`block min-w-0 w-full min-h-12 border px-4 py-3 focus:outline-none focus:border-amber-500 font-sans text-xs ${
                        isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="min-w-0">
                    <label className={isDark ? "block text-neutral-300 uppercase mb-2" : "block text-neutral-700 uppercase mb-2 font-bold"}>
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      placeholder="client@gmail.com"
                      value={inquiryForm.email}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, email: e.target.value })}
                      className={`block min-w-0 w-full min-h-12 border px-4 py-3 focus:outline-none focus:border-amber-500 font-sans text-xs ${
                        isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={isDark ? "block text-neutral-300 uppercase mb-2" : "block text-neutral-700 uppercase mb-2 font-bold"}>
                      PROJECT SCOPE *
                    </label>
                    <select
                      value={inquiryForm.scope}
                      onChange={(e) => setInquiryForm({ ...inquiryForm, scope: e.target.value })}
                      className={`block min-w-0 w-full min-h-12 border px-4 py-3 focus:outline-none focus:border-amber-500 font-sans text-xs ${
                        isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    >
                      <option>Elevation Design</option>
                      <option>Interior Design</option>
                      <option>Temple Design</option>
                      <option>Carving Work</option>
                      <option>Complete Construction</option>
                    </select>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className={isDark ? "block text-neutral-300 uppercase mb-2" : "block text-neutral-700 uppercase mb-2 font-bold"}>
                    PROJECT PARAMETERS & TIMELINE
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide site location, plot dimensions, elevation concepts or temple specifications..."
                    value={inquiryForm.details}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, details: e.target.value })}
                    className={`block min-w-0 w-full min-h-32 resize-y border p-4 focus:outline-none focus:border-amber-500 font-sans text-xs ${
                      isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-widest transition-colors shadow-md"
                >
                  TRANSMIT CONSULTATION BRIEF
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- ARCHITECTURAL FOOTER -------------------- */}
      <footer
        className={`py-16 border-t text-xs font-mono transition-colors ${
          isDark ? "bg-black border-neutral-900 text-neutral-400" : "bg-white border-neutral-200 text-neutral-600"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div
            className={`grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b ${
              isDark ? "border-neutral-900" : "border-neutral-200"
            }`}
          >
            {/* Logo and Brand summary */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-sm overflow-hidden border border-amber-500/50 bg-neutral-900 p-0.5 shrink-0">
                  <img src={BRAND_LOGO} alt="SR Construction Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className={`font-black text-sm uppercase ${isDark ? "text-white" : "text-black"}`}>
                    SR CONSTRUCTION
                  </div>
                  <div className="text-[10px] text-amber-500 font-mono uppercase tracking-widest font-bold">
                    RAMESH &bull; RAMESH CONS
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs font-sans max-w-sm leading-relaxed">
                Specialized architectural design practice directing Elevation Design,
                Interior Design, sacred Temple Architecture, traditional Stone/Wood Carving, and Quality Construction.
              </p>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-3">
              <div className={`font-bold uppercase tracking-wider mb-4 ${isDark ? "text-white" : "text-black"}`}>
                DIRECT ACCESS
              </div>
              <ul className="space-y-2">
                <li><a href="#home" className="hover:text-amber-500">Home</a></li>
                <li><a href="#about" className="hover:text-amber-500">About Practice</a></li>
                <li><a href="#services" className="hover:text-amber-500">Specializations</a></li>
                <li><a href="#projects" className="hover:text-amber-500">Built Portfolio</a></li>
                <li><a href="#reviews" className="hover:text-amber-500">Verified Reviews</a></li>
                <li><a href="#contact" className="hover:text-amber-500">Contact Ramesh</a></li>
              </ul>
            </div>

            {/* Contact Card in Footer */}
            <div className="md:col-span-4 space-y-2">
              <div className={`font-bold uppercase tracking-wider mb-3 ${isDark ? "text-white" : "text-black"}`}>
                HEADQUARTERS & DESK
              </div>
              <div>PROPRIETOR: <strong className={isDark ? "text-white" : "text-black"}>RAMESH</strong></div>
              <div>PHONES: <strong className={isDark ? "text-white" : "text-black"}>9443658583 / 7904694679</strong></div>
              <div>EMAIL: <strong className={isDark ? "text-white" : "text-black"}>sr.construction0711@gmail.com</strong></div>
              <div>LOCATION: <strong className={isDark ? "text-white" : "text-black"}>Main Road, Cuddalore & Regional Sites, Tamil Nadu</strong></div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-neutral-500 text-[11px]">
            <div>&copy; {new Date().getFullYear()} RAMESH &bull; RAMESH CONS / SR CONSTRUCTION. ALL RIGHTS RESERVED.</div>
            <div className="mt-4 sm:mt-0 uppercase tracking-widest text-amber-500 font-bold">
              GOLDEN EMBLEM ARCHITECTURAL SPECIFICATION
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* -------------------- INTERACTIVE MODALS -------------------- */}
      {/* ============================================================ */}

      {/* 1. PROJECT DETAILS AUDIT MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className={`border max-w-3xl w-full p-6 sm:p-8 relative ${
              isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-black shadow-2xl"
            }`}
          >
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 p-2 border border-neutral-700 hover:border-amber-500 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900 mb-6">
              <img
                src={selectedProject.img}
                alt={selectedProject.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">
              PROJECT SPECIFICATION {selectedProject.number}
            </div>
            <h3 className="text-2xl font-black uppercase mt-1">
              {selectedProject.name}
            </h3>

            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 my-6 border-y text-xs font-mono ${
                isDark ? "border-neutral-800" : "border-neutral-300"
              }`}
            >
              <div>
                <div className="text-neutral-500 uppercase">CATEGORY</div>
                <div className="font-bold mt-0.5">{selectedProject.category}</div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase">YEAR</div>
                <div className="font-bold mt-0.5">{selectedProject.year}</div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase">LOCATION</div>
                <div className="font-bold mt-0.5">{selectedProject.location}</div>
              </div>
              <div>
                <div className="text-neutral-500 uppercase">SCALE</div>
                <div className="font-bold mt-0.5">{selectedProject.area}</div>
              </div>
            </div>

            <p className={`text-sm leading-relaxed mb-6 ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>
              {selectedProject.description}
            </p>

            <div className="flex gap-3">
              {userRole === "admin" && (
                <button
                  onClick={() => handleDeleteProject(selectedProject.id, selectedProject.name)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Trash2 size={15} />
                  <span>DELETE FROM WEBSITE</span>
                </button>
              )}
              <button
                onClick={() => setSelectedProject(null)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider"
              >
                CLOSE SPECIFICATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN LOGIN MODAL (CLEAN CREDENTIAL AUTHENTICATION) */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`border max-w-md w-full p-6 sm:p-8 relative ${
              isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-black shadow-2xl"
            }`}
          >
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 border border-neutral-700"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Lock size={16} className="text-amber-500" />
              <div className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold">
                RAMESH ADMIN PORTAL
              </div>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight mb-6">
              ADMINISTRATOR LOGIN
            </h3>

            {adminAuthError && (
              <div className="mb-6 p-3 bg-red-950/60 border border-red-900 text-red-300 text-xs font-mono">
                {adminAuthError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block uppercase mb-1.5 font-bold">ADMIN EMAIL</label>
                <input
                  type="email"
                  required
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="Enter admin email"
                  className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                  }`}
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 font-bold">PASSCODE</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Enter security password"
                    className={`w-full border p-3 pr-10 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-amber-500"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs transition-colors mt-2"
              >
                ENTER STUDIO DESK
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER REVIEW SUBMISSION MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`border max-w-lg w-full p-6 sm:p-8 relative my-8 ${
              isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-white border-neutral-300 text-black shadow-2xl"
            }`}
          >
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-2 border border-neutral-700"
            >
              <X size={18} />
            </button>

            <span className="text-xs font-mono tracking-widest text-amber-500 font-bold uppercase">
              CLIENT TESTIMONIAL
            </span>
            <h3 className="text-xl font-black uppercase tracking-tight mt-1 mb-4">
              SHARE YOUR HANDOVER EXPERIENCE
            </h3>

            {reviewSuccessMsg ? (
              <div className="p-6 bg-neutral-900 border border-neutral-700 text-center font-mono text-xs text-white">
                <CheckCircle2 size={32} className="mx-auto text-amber-500 mb-3" />
                {reviewSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block uppercase mb-1 font-bold">CLIENT NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sivakumar"
                    value={customerReview.author}
                    onChange={(e) => setCustomerReview({ ...customerReview, author: e.target.value })}
                    className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block uppercase mb-1 font-bold">LOCATION / ROLE</label>
                    <input
                      type="text"
                      placeholder="e.g. Homeowner"
                      value={customerReview.role}
                      onChange={(e) => setCustomerReview({ ...customerReview, role: e.target.value })}
                      className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block uppercase mb-1 font-bold">SERVICE RENDERED</label>
                    <select
                      value={customerReview.type}
                      onChange={(e) => setCustomerReview({ ...customerReview, type: e.target.value })}
                      className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                        isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                      }`}
                    >
                      <option>Elevation Design</option>
                      <option>Interior Design</option>
                      <option>Temple Design</option>
                      <option>Carving Work</option>
                      <option>Complete Construction</option>
                    </select>
                  </div>
                </div>

                {/* Handover Picture Upload from Gallery */}
                <div>
                  <label className="block uppercase mb-1 font-bold">
                    SELECT HANDOVER PHOTO FROM GALLERY
                  </label>
                  <input
                    type="file"
                    ref={customerFileInputRef}
                    accept="image/*"
                    onChange={handleCustomerImageUpload}
                    className="hidden"
                  />

                  {customerReview.photo ? (
                    <div className="relative aspect-[16/9] w-full border border-neutral-700 bg-neutral-900 overflow-hidden">
                      <img
                        src={customerReview.photo}
                        alt="Preview"
                        className="w-full h-full object-cover filter grayscale"
                      />
                      <button
                        type="button"
                        onClick={() => setCustomerReview({ ...customerReview, photo: "" })}
                        className="absolute top-2 right-2 p-1.5 bg-black text-white border border-neutral-700 hover:bg-neutral-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => customerFileInputRef.current?.click()}
                        className={`flex-1 py-3 border border-dashed text-xs uppercase flex items-center justify-center gap-2 transition-colors ${
                          isDark
                            ? "border-neutral-700 text-neutral-300 hover:border-amber-500"
                            : "border-neutral-300 text-neutral-700 hover:border-black"
                        }`}
                      >
                        <Upload size={14} />
                        <span>Select from Device Gallery</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomerPresetModal(true)}
                        className={`px-3 py-3 border text-xs uppercase flex items-center gap-1.5 transition-colors ${
                          isDark
                            ? "border-neutral-700 text-neutral-400 hover:text-white hover:border-white"
                            : "border-neutral-300 text-neutral-700 hover:text-black hover:border-black"
                        }`}
                      >
                        <ImageIcon size={14} />
                        <span>Presets</span>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block uppercase mb-1 font-bold">YOUR FEEDBACK *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Details about craftsmanship, on-time finishing, elevation realism, or carving quality..."
                    value={customerReview.text}
                    onChange={(e) => setCustomerReview({ ...customerReview, text: e.target.value })}
                    className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs transition-colors mt-2"
                >
                  SUBMIT REVIEW FOR VERIFICATION
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. ADMIN MANAGEMENT SUITE (PROJECT DEPLOYMENT & COMPLETE MODERATION) */}
      {adminViewOpen && (
        <div
          className={`fixed inset-0 z-50 backdrop-blur-md overflow-y-auto ${
            isDark ? "bg-black/95 text-white" : "bg-neutral-100/95 text-neutral-900"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 min-h-screen flex flex-col justify-between">
            <div>
              {/* Header */}
              <div
                className={`flex items-center justify-between pb-6 border-b mb-8 ${
                  isDark ? "border-neutral-800" : "border-neutral-300"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-amber-500" />
                    <span className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold">
                      RAMESH • RAMESH CONS ADMINISTRATIVE DESK
                    </span>
                  </div>
                  <h2 className="text-2xl font-black uppercase mt-1">
                    FULL SITE CONTROL & PORTFOLIO MANAGEMENT
                  </h2>
                </div>

                <button
                  onClick={() => setAdminViewOpen(false)}
                  className="p-2 border border-neutral-700 hover:border-amber-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div
                className={`flex items-center gap-3 mb-8 border-b pb-3 text-xs font-mono ${
                  isDark ? "border-neutral-800" : "border-neutral-300"
                }`}
              >
                <button
                  onClick={() => setAdminTab("projects")}
                  className={`px-4 py-2 border uppercase tracking-wider font-bold transition-all ${
                    adminTab === "projects"
                      ? "bg-amber-500 text-black border-amber-500"
                      : isDark
                      ? "border-neutral-800 text-neutral-400 hover:text-white"
                      : "border-neutral-300 text-neutral-600 hover:text-black"
                  }`}
                >
                  DEPLOY NEW PROJECT
                </button>
                <button
                  onClick={() => setAdminTab("audits")}
                  className={`px-4 py-2 border uppercase tracking-wider font-bold transition-all relative ${
                    adminTab === "audits"
                      ? "bg-amber-500 text-black border-amber-500"
                      : isDark
                      ? "border-neutral-800 text-neutral-400 hover:text-white"
                      : "border-neutral-300 text-neutral-600 hover:text-black"
                  }`}
                >
                  <span>CUSTOMER AUDIT QUEUE</span>
                  {pendingReviews.length > 0 && (
                    <span className="ml-2 bg-black text-amber-400 border border-amber-400 text-[10px] px-1.5 py-0.5">
                      {pendingReviews.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAdminTab("inquiries")}
                  className={`px-4 py-2 border uppercase tracking-wider font-bold transition-all ${
                    adminTab === "inquiries"
                      ? "bg-amber-500 text-black border-amber-500"
                      : isDark
                      ? "border-neutral-800 text-neutral-400 hover:text-white"
                      : "border-neutral-300 text-neutral-600 hover:text-black"
                  }`}
                >
                  <span>PROJECT INQUIRIES</span>
                  {inquiries.length > 0 && (
                    <span className="ml-2 bg-black text-amber-400 border border-amber-400 text-[10px] px-1.5 py-0.5">
                      {inquiries.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: ADD & MANAGE PROJECTS */}
              {adminTab === "projects" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div
                    className={`lg:col-span-5 border p-6 ${
                      isDark ? "bg-neutral-950 border-neutral-800" : "bg-white border-neutral-300 shadow-md"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <FolderPlus size={16} className="text-amber-500" />
                      <h3 className="text-sm font-black uppercase tracking-wider">
                        PUBLISH NEW WORK
                      </h3>
                    </div>

                    <form onSubmit={handleAddProject} className="space-y-4 text-xs font-mono">
                      <div>
                        <label className="block uppercase mb-1 font-bold">PROJECT TITLE *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Modern Elevation Villa"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                          className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                            isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block uppercase mb-1 font-bold">SPECIALIZATION</label>
                          <select
                            value={newProject.category}
                            onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                            className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                              isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                            }`}
                          >
                            <option>Elevation Design</option>
                            <option>Interior Design</option>
                            <option>Temple Design</option>
                            <option>Carving Work</option>
                            <option>Construction</option>
                          </select>
                        </div>
                        <div>
                          <label className="block uppercase mb-1 font-bold">YEAR</label>
                          <input
                            type="text"
                            value={newProject.year}
                            onChange={(e) => setNewProject({ ...newProject, year: e.target.value })}
                            className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                              isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block uppercase mb-1 font-bold">LOCATION</label>
                          <input
                            type="text"
                            placeholder="e.g. Cuddalore"
                            value={newProject.location}
                            onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                            className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                              isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block uppercase mb-1 font-bold">AREA / SCALE</label>
                          <input
                            type="text"
                            placeholder="e.g. 4,500 sq.ft"
                            value={newProject.area}
                            onChange={(e) => setNewProject({ ...newProject, area: e.target.value })}
                            className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                              isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Photo Selector from Device */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block uppercase font-bold">PROJECT PHOTO *</label>
                          <span className="text-[10px] text-amber-500 font-bold">DEVICE GALLERY</span>
                        </div>

                        <input
                          type="file"
                          ref={adminFileInputRef}
                          accept="image/*"
                          onChange={handleAdminImageUpload}
                          className="hidden"
                        />

                        {newProject.img ? (
                          <div className="relative aspect-[16/10] w-full border border-neutral-700 bg-neutral-900 overflow-hidden">
                            <img src={newProject.img} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setNewProject({ ...newProject, img: "" })}
                                className="px-3 py-1.5 bg-red-700 text-white text-xs uppercase font-bold"
                              >
                                Replace Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`border border-dashed p-6 text-center transition-colors ${
                              isDark ? "border-neutral-700 hover:border-amber-500" : "border-neutral-300 hover:border-black"
                            }`}
                          >
                            <Upload size={24} className="mx-auto text-neutral-400 mb-2" />
                            <div className="text-xs mb-2">Upload project image from device</div>
                            <div className="flex justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => adminFileInputRef.current?.click()}
                                className="px-3 py-1.5 bg-amber-500 text-black font-black uppercase text-[10px]"
                              >
                                Browse Files
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowPresetModal(true)}
                                className="px-3 py-1.5 border border-neutral-700 text-xs uppercase hover:border-amber-500"
                              >
                                Presets
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block uppercase mb-1 font-bold">DESCRIPTION</label>
                        <textarea
                          rows={3}
                          placeholder="Materials used, craftsmanship details, stone carving specs..."
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          className={`w-full border p-3 font-sans text-xs focus:outline-none focus:border-amber-500 ${
                            isDark ? "bg-neutral-900 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-300 text-black"
                          }`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs"
                      >
                        PUBLISH TO LIVE PORTFOLIO
                      </button>
                    </form>
                  </div>

                  {/* Live Project List in Admin Suite */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-amber-500 font-bold mb-2">
                      LIVE PUBLISHED PORTFOLIO ({projects.length}) &bull; DELETE REACTION LIVE
                    </div>
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className={`border p-4 flex items-center justify-between gap-4 transition-colors ${
                          isDark ? "border-neutral-800 bg-neutral-950" : "border-neutral-300 bg-white shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={proj.img}
                            alt={proj.name}
                            className="w-16 h-12 object-cover border border-neutral-700 shrink-0"
                          />
                          <div>
                            <div className="text-sm font-bold uppercase">{proj.name}</div>
                            <div className="text-[11px] font-mono text-neutral-500">
                              {proj.category} &bull; {proj.year} &bull; {proj.location}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteProject(proj.id, proj.name)}
                          className="p-2 text-neutral-400 hover:text-red-500 border border-neutral-800 hover:border-red-500 transition-colors"
                          title="Delete Project from entire site"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: AUDIT QUEUE */}
              {adminTab === "audits" && (
                <div className="space-y-6">
                  {pendingReviews.length === 0 ? (
                    <div
                      className={`border p-12 text-center font-mono text-xs uppercase ${
                        isDark ? "border-neutral-800 text-neutral-500" : "border-neutral-300 text-neutral-600"
                      }`}
                    >
                      NO PENDING CLIENT REVIEWS AWAITING AUDIT APPROVAL.
                    </div>
                  ) : (
                    pendingReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className={`border p-6 flex flex-col md:flex-row gap-6 items-start justify-between ${
                          isDark ? "border-neutral-800 bg-neutral-950" : "border-neutral-300 bg-white shadow-md"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold mb-1">
                            PENDING AUDIT APPROVAL
                          </div>
                          <div className="text-lg font-black uppercase">{rev.author}</div>
                          <div className="text-xs font-mono text-neutral-400 mb-3">
                            {rev.role} &bull; {rev.type}
                          </div>
                          <p className="text-xs leading-relaxed uppercase bg-neutral-900/40 p-4 border border-neutral-800">
                            "{rev.text}"
                          </p>
                        </div>

                        {rev.photo && (
                          <div className="w-full md:w-48 aspect-[16/10] bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0">
                            <img src={rev.photo} alt="Handover review photo" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                          <button
                            onClick={() => handleModerateReview(rev.id, "approved")}
                            className="flex-1 px-4 py-2 bg-amber-500 text-black font-black uppercase text-xs hover:bg-amber-400"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleModerateReview(rev.id, "rejected")}
                            className="flex-1 px-4 py-2 border border-red-800 text-red-400 font-bold uppercase text-xs hover:bg-red-950/40"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleDeleteReview(rev.id, rev.author)}
                            className="flex-1 px-4 py-2 bg-red-800 text-white font-bold uppercase text-xs hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === "inquiries" && (
                <div className="space-y-4">
                  {inquiries.length === 0 ? (
                    <div className={`border p-12 text-center font-mono text-xs uppercase ${
                      isDark ? "border-neutral-800 text-neutral-500" : "border-neutral-300 text-neutral-600"
                    }`}>
                      NO CONSULTATION INQUIRIES HAVE BEEN RECEIVED.
                    </div>
                  ) : inquiries.map((inquiry) => (
                    <article
                      key={inquiry.id}
                      className={`border p-5 ${isDark ? "border-neutral-800 bg-neutral-950" : "border-neutral-300 bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-black uppercase">{inquiry.name}</h3>
                          <p className="mt-1 text-xs font-mono text-amber-500 uppercase">
                            {inquiry.scope} &bull; {inquiry.createdAt?.toDate?.().toLocaleString() || "Recently received"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteInquiry(inquiry.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 border border-neutral-800 hover:border-red-500"
                          title="Delete inquiry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono">
                        <a className="hover:text-amber-500" href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                        {inquiry.email && <a className="hover:text-amber-500" href={`mailto:${inquiry.email}`}>{inquiry.email}</a>}
                      </div>
                      <p className="mt-4 border border-neutral-800 bg-black/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">{inquiry.details}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 text-center">
              SR CONSTRUCTION &bull; RAMESH . RAMESH CONS STUDIO INTERFACE &bull; FULL UNILATERAL CONTROL
            </div>
          </div>
        </div>
      )}

      {/* 5. PRESETS SELECTOR MODAL (FOR ADMIN) */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 max-w-2xl w-full p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                SELECT FROM ARCHITECTURAL PRESETS
              </h3>
              <button onClick={() => setShowPresetModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STUDIO_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setNewProject({ ...newProject, img: preset.url, name: newProject.name || preset.title, category: preset.category });
                    setShowPresetModal(false);
                  }}
                  className="cursor-pointer border border-neutral-800 hover:border-amber-500 p-1 bg-black group"
                >
                  <img src={preset.url} alt={preset.title} className="aspect-[4/3] object-cover w-full mb-1" />
                  <div className="text-[10px] font-bold text-white uppercase truncate">{preset.title}</div>
                  <div className="text-[9px] font-mono text-neutral-400">{preset.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. PRESETS SELECTOR MODAL (FOR CUSTOMER REVIEW) */}
      {showCustomerPresetModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 max-w-2xl w-full p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                SELECT HANDOVER ARCHIVE PRESET
              </h3>
              <button onClick={() => setShowCustomerPresetModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STUDIO_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCustomerReview({ ...customerReview, photo: preset.url });
                    setShowCustomerPresetModal(false);
                  }}
                  className="cursor-pointer border border-neutral-800 hover:border-amber-500 p-1 bg-black group"
                >
                  <img src={preset.url} alt={preset.title} className="aspect-[4/3] object-cover w-full mb-1 filter grayscale" />
                  <div className="text-[10px] font-bold text-white uppercase truncate">{preset.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}