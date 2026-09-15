import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaArrowUp } from "react-icons/fa";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollProgress from "./components/ScrollProgress";
import Home from "./sections/Home";
import About from "./sections/About";
import Branches from "./sections/Branches";
import Calendar from "./sections/Calendar";
import Contact from "./sections/Contact";
import Activities from "./sections/Activities";
import { easeOut } from "./lib/motion";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<About />} />
          <Route path="/ramos" element={<Branches />} />
          <Route path="/atividades" element={<Activities />} />
          <Route path="/agenda" element={<Calendar />} />
          <Route path="/participe" element={<Contact />} />
          <Route path="/about" element={<Navigate to="/sobre" replace />} />
          <Route path="/activities" element={<Navigate to="/atividades" replace />} />
          <Route path="/calendar" element={<Navigate to="/agenda" replace />} />
          <Route path="/contact" element={<Navigate to="/participe" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function ToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      className="to-top"
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <FaArrowUp />
    </button>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <ScrollProgress />
        <ScrollToTop />
        <Navbar />
        <main>
          <AnimatedRoutes />
        </main>
        <Footer />
        <ToTop />
      </div>
    </Router>
  );
}

export default App;
