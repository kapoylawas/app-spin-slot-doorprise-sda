import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import axios from "axios";
import { io } from "socket.io-client";

const sidoarjoImage = "/sidoarjo.png";

// Server API Configuration
const API_BASE_URL = "http://10.1.18.99/api";
// const API_BASE_URL = "http://localhost:8000/api";
const API_TOKEN = "2|ydUqZdX4zdz68SIW6uPFAauTJUPTXfZhp3BjOEbne110bd43";

const getApiHeaders = () => ({
  Authorization: `Bearer ${API_TOKEN}`,
  Accept: "application/json",
  "Content-Type": "application/json",
});

// Fallback data representing ASN / Employees in Sidoarjo Regency if API fails
const DUMMY_PARTICIPANTS = [
  { id: 1, nama: "Budi Santoso", telp: "081234567801", instansi: "Diskominfo Sidoarjo", status_peserta: null },
  { id: 2, nama: "Siti Rahmawati", telp: "081398765402", instansi: "Dinas Kesehatan Sidoarjo", status_peserta: null },
  { id: 3, nama: "Ahmad Fauzi", telp: "085645678903", instansi: "BKD Sidoarjo", status_peserta: null },
  { id: 4, nama: "Dewi Lestari", telp: "087812345604", instansi: "Dinas Pendidikan Sidoarjo", status_peserta: null },
  { id: 5, nama: "Eko Prasetyo", telp: "082123456705", instansi: "Dinas Perhubungan Sidoarjo", status_peserta: null },
  { id: 6, nama: "Rina Amelia", telp: "089876543206", instansi: "DPUBMSDA Sidoarjo", status_peserta: null },
  { id: 7, nama: "Agus Hermawan", telp: "081122334407", instansi: "DLHK Sidoarjo", status_peserta: null },
  { id: 8, nama: "Mega Utami", telp: "081223344508", instansi: "Dinas Sosial Sidoarjo", status_peserta: null },
  { id: 9, nama: "Hendra Wijaya", telp: "081334455609", instansi: "Satpol PP Sidoarjo", status_peserta: null },
  { id: 10, nama: "Tri Susilo", telp: "081445566710", instansi: "BPPD Sidoarjo", status_peserta: null }
];

const DUMMY_PRIZES = [
  { id: 1, name: "Sepeda", description: "sepeda lipat", remaining_quota: 1, total_quota: 1 },
  { id: 2, name: "TV LG 55 Inch", description: "Smart TV", remaining_quota: 2, total_quota: 2 },
  { id: 3, name: "Sepeda Listrik", description: "E-bike", remaining_quota: 1, total_quota: 1 },
];

// Singleton Web Audio API Context (Reused across all sound calls to prevent browser AudioContext limits)
let globalAudioCtx = null;

const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => { });
  }
  return globalAudioCtx;
};

// Helper to play synthesized sounds using Web Audio API
const playSound = (type) => {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    if (type === "tick") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } else if (type === "win") {
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major chord chimes
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + i * 0.08 + 0.5);
      });
    } else if (type === "beep") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high beep
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === "fail") {
      const freqs = [300, 260, 220, 180]; // Low descending tones
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(f, audioCtx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.15);
        osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
      });
    }
  } catch (e) {
    console.error("Audio error:", e);
  }
};

// Confetti generator component
const Confetti = () => {
  const colors = ["#ff5722", "#ffeb3b", "#4caf50", "#00bcd4", "#9c27b0", "#e91e63", "#ffc107", "#e74c3c", "#f1c40f", "#2ecc71"];
  return (
    <div className="confetti-container">
      {Array.from({ length: 80 }).map((_, i) => {
        const style = {
          left: `${Math.random() * 100}%`,
          top: `-${Math.random() * 20}px`,
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          width: `${Math.random() * 8 + 6}px`,
          height: `${Math.random() * 12 + 8}px`,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${Math.random() * 2 + 2}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        };
        return <div key={i} className="confetti-particle" style={style} />;
      })}
    </div>
  );
};

const App = () => {
  // State for all participants (filters out winners)
  const [names, setNames] = useState([]);
  const [prizesList, setPrizesList] = useState([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const selectedPrizeIdRef = useRef(selectedPrizeId);
  useEffect(() => {
    selectedPrizeIdRef.current = selectedPrizeId;
  }, [selectedPrizeId]);

  const [prize, setPrize] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        )
      );
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const isFS = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    if (!isFS) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.error("Fullscreen error:", err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error("Exit Fullscreen error:", err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Default security PIN: '1234' (can be overridden in localStorage or via URL ?pin=1234)
  const [securityPin, setSecurityPin] = useState(() => localStorage.getItem("app_security_pin") || "diskominfo@2026#");
  const [isUnlocked, setIsUnlocked] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get("pin");
    const currentPin = localStorage.getItem("app_security_pin") || "diskominfo@2026#";
    if (pinParam === currentPin) {
      sessionStorage.setItem("app_is_unlocked", "true");
      return true;
    }
    return sessionStorage.getItem("app_is_unlocked") === "true";
  });
  const [pinInputValue, setPinInputValue] = useState("");
  const [pinErrorMsg, setPinErrorMsg] = useState("");
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [newPinInput, setNewPinInput] = useState("");

  const handleUnlockSubmit = (e) => {
    e?.preventDefault();
    if (pinInputValue.trim() === securityPin) {
      setIsUnlocked(true);
      sessionStorage.setItem("app_is_unlocked", "true");
      setPinErrorMsg("");
      setPinInputValue("");
      playSound("beep");
    } else {
      setPinErrorMsg("❌ PIN Salah! Akses ditolak.");
      playSound("fail");
    }
  };

  const handleLockApp = () => {
    setIsUnlocked(false);
    sessionStorage.setItem("app_is_unlocked", "false");
    setPinInputValue("");
    setPinErrorMsg("");
  };

  const handleChangePinSubmit = (e) => {
    e?.preventDefault();
    if (!newPinInput.trim() || newPinInput.trim().length < 4) {
      alert("⚠️ PIN Keamanan minimal 4 karakter / angka!");
      return;
    }
    setSecurityPin(newPinInput.trim());
    localStorage.setItem("app_security_pin", newPinInput.trim());
    setShowPinSettings(false);
    setNewPinInput("");
    setToastMessage(`🔑 PIN Keamanan berhasil diubah menjadi: ${newPinInput.trim()}`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // View navigation state ('spin' or 'mc')
  const [viewMode, setViewMode] = useState(() => {
    if (window.location.hash === "#mc" || window.location.search.includes("mode=mc")) {
      return "mc";
    }
    return "spin";
  });
  const [mcSearchQuery, setMcSearchQuery] = useState("");

  // Socket.IO LAN Dual-Screen Control State
  const [appMode, setAppMode] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get("mode");
    if (m === "controller" || m === "display" || m === "mc") return m;
    if (window.location.hash.includes("controller")) return "controller";
    if (window.location.hash.includes("display")) return "display";
    return "single";
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketClients, setSocketClients] = useState({ total: 0, controller: 0, display: 0 });
  const socketRef = useRef(null);

  // State for past winners list
  const [pastWinners, setPastWinners] = useState([]);

  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("⚠️ Silakan pilih hadiah terlebih dahulu sebelum mengacak!");
  const [showResetModal, setShowResetModal] = useState(false);
  const [cancelTargetWinner, setCancelTargetWinner] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");

  const filteredParticipantsSearch = React.useMemo(() => {
    if (!participantSearchQuery.trim()) return [];
    const q = participantSearchQuery.toLowerCase().trim();

    // 1. Search in eligible candidates (names)
    const eligibleMatches = names
      .filter((p) => !p.status_peserta)
      .filter(
        (p) =>
          (p.nama && p.nama.toLowerCase().includes(q)) ||
          (p.instansi && p.instansi.toLowerCase().includes(q)) ||
          (p.telp && p.telp.includes(q)) ||
          (p.nik && String(p.nik).includes(q))
      )
      .map((p) => ({
        id: p.id,
        nama: p.nama,
        nik: p.nik ? String(p.nik) : "-",
        instansi: p.instansi || "Peserta",
        phone: p.telp || "-",
        statusType: "eligible",
        statusBadge: "🟢 SIAP DIUNDI (Ada Dalam Daftar Spinner)",
      }));

    // 2. Search in past winners (pastWinners)
    const winnerMatches = pastWinners
      .filter(
        (w) =>
          (w.nama && w.nama.toLowerCase().includes(q)) ||
          (w.instansi && w.instansi.toLowerCase().includes(q)) ||
          (w.phone && w.phone.includes(q)) ||
          (w.nik && String(w.nik).includes(q))
      )
      .map((w) => ({
        id: w.id,
        nama: w.nama,
        nik: w.nik || "-",
        instansi: w.instansi || "Peserta",
        phone: w.phone || "-",
        statusType: w.isDisqualified || w.statusText === "HANGUS" ? "hangus" : "winner",
        statusBadge: w.isDisqualified || w.statusText === "HANGUS" ? "❌ GUGUR / HANGUS" : `🏆 PEMENANG SAH (🎁 ${w.prize?.toUpperCase() || "-"})`,
      }));

    const seen = new Set();
    const results = [];
    [...eligibleMatches, ...winnerMatches].forEach((item) => {
      const key = `${item.id}-${item.statusType}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    });

    return results;
  }, [participantSearchQuery, names, pastWinners]);

  // Timer states for caller countdown (10s)
  const [countdown, setCountdown] = useState(10);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);

  // Hard lock to prevent double-click rapid spin (useRef is synchronous, unlike setState)
  const isDrawingRef = useRef(false);
  const startDrawRef = useRef(null);

  // Reel-specific animation states
  const [reelItems, setReelItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState("none");

  // Keep startDrawRef updated with latest startDraw implementation
  useEffect(() => {
    startDrawRef.current = startDraw;
  });

  useEffect(() => {
    const host = window.location.hostname || "localhost";
    const socketUrl = `http://${host}:3001`;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("identify", appMode);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("clients:status", (status) => {
      setSocketClients(status);
    });

    socket.on("state:update", (state) => {
      console.log("[State Update Received]:", state);
      if (state && state.selectedPrizeId) {
        const pIdStr = String(state.selectedPrizeId);
        setSelectedPrizeId(pIdStr);
        selectedPrizeIdRef.current = pIdStr;
        if (state.prizeName) setPrize(state.prizeName);
      }
    });

    socket.on("remote:event", (data) => {
      console.log("[Remote Event Received]:", data);
      if (data.type === "SPIN_START") {
        if (data.prizeId) {
          const pIdStr = String(data.prizeId);
          setSelectedPrizeId(pIdStr);
          selectedPrizeIdRef.current = pIdStr;
          setPrize(data.prizeName || "");
        }
        if (startDrawRef.current) startDrawRef.current(true, data.winner);
      } else if (data.type === "SELECT_PRIZE") {
        const pIdStr = String(data.prizeId);
        setSelectedPrizeId(pIdStr);
        selectedPrizeIdRef.current = pIdStr;
        setPrize(data.prizeName || "");
      } else if (data.type === "START_TIMER") {
        setIsTimerRunning(true);
      } else if (data.type === "STOP_TIMER") {
        setIsTimerRunning(false);
      } else if (data.type === "RESET_TIMER") {
        setIsTimerRunning(false);
        setCountdown(10);
        setIsDisqualified(false);
      } else if (data.type === "CLOSE_WINNER") {
        setWinner(false);
        setWinnerData(null);
        setIsTimerRunning(false);
        setCountdown(10);
        setIsDisqualified(false);
        fetchData();
      } else if (data.type === "SPIN_WIN") {
        setRolling(false);
        setWinner(true);
        setWinnerData(data.winnerData);
        setCountdown(10);
        setIsTimerRunning(false);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [appMode]);

  const sendRemoteAction = (actionType, payload = {}) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("remote:action", { type: actionType, ...payload });
    }
  };

  const selectPrizeDirect = (p) => {
    if (rolling || !p || p.remaining_quota <= 0) return;
    const pIdStr = String(p.id);
    setSelectedPrizeId(pIdStr);
    selectedPrizeIdRef.current = pIdStr;
    setPrize(p.name);
    sendRemoteAction("SELECT_PRIZE", { prizeId: p.id, prizeName: p.name });
    playSound("beep");
    setToastMessage(`🎁 Hadiah terpilih: ${p.name.toUpperCase()} (Sisa Quota: ${p.remaining_quota})`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Helper to cycle through prizes using Arrow Up / Arrow Down or Number keys (1-9)
  const cyclePrize = (direction) => {
    if (rolling || prizesList.length === 0) return;
    const availablePrizes = prizesList.filter((p) => p.remaining_quota > 0);
    if (availablePrizes.length === 0) return;

    let currentIndex = availablePrizes.findIndex((p) => String(p.id) === String(selectedPrizeId));
    let nextIndex;
    if (currentIndex === -1) {
      nextIndex = direction > 0 ? 0 : availablePrizes.length - 1;
    } else {
      nextIndex = (currentIndex + direction + availablePrizes.length) % availablePrizes.length;
    }
    const nextPrize = availablePrizes[nextIndex];
    const pIdStr = String(nextPrize.id);
    setSelectedPrizeId(pIdStr);
    selectedPrizeIdRef.current = pIdStr;
    setPrize(nextPrize.name);
    sendRemoteAction("SELECT_PRIZE", { prizeId: nextPrize.id, prizeName: nextPrize.name });
    playSound("beep");
    setToastMessage(`🎁 Hadiah terpilih: ${nextPrize.name.toUpperCase()} (Sisa Quota: ${nextPrize.remaining_quota})`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const selectPrizeByNumber = (numKey) => {
    if (rolling || prizesList.length === 0) return;
    const index = parseInt(numKey, 10) - 1;
    const availablePrizes = prizesList.filter((p) => p.remaining_quota > 0);
    if (availablePrizes[index]) {
      const p = availablePrizes[index];
      const pIdStr = String(p.id);
      setSelectedPrizeId(pIdStr);
      selectedPrizeIdRef.current = pIdStr;
      setPrize(p.name);
      sendRemoteAction("SELECT_PRIZE", { prizeId: p.id, prizeName: p.name });
      playSound("beep");
      setToastMessage(`🎁 Hadiah terpilih (#${numKey}): ${p.name.toUpperCase()} (Sisa Quota: ${p.remaining_quota})`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Global Keyboard & Remote Presenter Listener (Space, Enter, PageDown, RightArrow, ArrowUp/Down, Numbers 1-9, etc.)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isUnlocked) return;

      // Ignore key events when typing inside text inputs, textareas, or dropdown selects
      const tag = e.target ? e.target.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target && e.target.isContentEditable)) {
        return;
      }

      // Close modal on Escape
      if (e.key === "Escape") {
        if (showSearchModal) {
          setShowSearchModal(false);
          return;
        }
        if (winner) {
          closeWinnerModal();
          return;
        }
        if (showResetModal) {
          setShowResetModal(false);
          return;
        }
        if (cancelTargetWinner) {
          setCancelTargetWinner(null);
          return;
        }
      }

      // Navigate/cycle prize using ArrowUp / ArrowDown
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (viewMode === "spin" && !rolling && !winner && !showResetModal && !cancelTargetWinner) {
          cyclePrize(-1);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (viewMode === "spin" && !rolling && !winner && !showResetModal && !cancelTargetWinner) {
          cyclePrize(1);
        }
        return;
      }

      // Toggle Fullscreen with 'f' or 'F' key
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Fast prize selection with number keys 1-9
      if (/^[1-9]$/.test(e.key)) {
        if (viewMode === "spin" && !rolling && !winner && !showResetModal && !cancelTargetWinner) {
          selectPrizeByNumber(e.key);
        }
        return;
      }

      // Key controls when winner modal is open (Timer & Modal navigation)
      if (winner) {
        if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          if (isTimerRunning) {
            stopTimer();
          } else if (countdown > 0) {
            startTimer();
          }
          return;
        }
        if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          resetTimer();
          return;
        }
      }

      // Trigger draw (or close winner modal) on Space, Enter, PageDown, ArrowRight (supported by keyboard & presenter clickers)
      if (["Space", " ", "Enter", "NumpadEnter", "PageDown", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (winner) {
          // Pressing Space/Enter/Presenter Clicker closes winner modal
          closeWinnerModal();
        } else if (viewMode === "spin" && !rolling && !showResetModal && !cancelTargetWinner) {
          if (startDrawRef.current) {
            startDrawRef.current();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [winner, viewMode, rolling, showResetModal, cancelTargetWinner, selectedPrizeId, prizesList, isTimerRunning, countdown, isDisqualified]);

  // Fetch data from local API (isSilent = true for background polling without UI flickering)
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [participantsRes, prizesRes, resultsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/draw/participants`, { headers: getApiHeaders() }),
        axios.get(`${API_BASE_URL}/draw/prizes`, { headers: getApiHeaders() }),
        axios.get(`${API_BASE_URL}/draw/results`, { headers: getApiHeaders() }),
      ]);

      // 1. Process Participants Data
      const fetchedParticipants = (participantsRes.data?.data || []).map((p) => ({
        ...p,
        nama: p.name,
        telp: p.phone,
        instansi: p.nik ? maskNik(p.nik) : (p.instansi || "Peserta"),
      }));
      setNames(fetchedParticipants);

      // Seed/update reel items with remaining eligible participants when not actively drawing
      if (!isDrawingRef.current) {
        if (fetchedParticipants.length > 0) {
          const eligible = fetchedParticipants.filter((p) => !p.status_peserta);
          const seedPool = eligible.length > 0 ? eligible : fetchedParticipants;
          // Randomly shuffle seed pool so idle wheel displays names sampled across all participants
          const shuffledSeed = [...seedPool].sort(() => 0.5 - Math.random());
          let displayItems = [];
          while (displayItems.length < 10) {
            displayItems = displayItems.concat(shuffledSeed);
          }
          setReelItems(displayItems.slice(0, 10));
        } else {
          // All participants have been drawn
          const emptyPlaceholder = { nama: "Semua Peserta Sudah Diundi", instansi: "Sisa Peserta: 0" };
          setReelItems(Array(10).fill(emptyPlaceholder));
        }
        setActiveIndex(4);
        setTranslateY(0);
        setTransitionStyle("none");
      }

      // 2. Process Results Data (Draw History)
      const fetchedResults = (resultsRes.data?.data || []).map((r) => ({
        id: r.participant_id,
        prizeId: r.prize_id,
        nama: r.participant?.name || "Peserta",
        nik: r.participant?.nik ? String(r.participant.nik) : "-",
        maskedNik: r.participant?.nik ? maskNik(r.participant.nik) : (r.participant?.instansi || r.participant?.kab_name || "Peserta"),
        instansi: r.participant?.instansi || r.participant?.kab_name || "Peserta",
        phone: r.participant?.phone || r.participant?.telp || "-",
        prize: r.prize?.name || "-",
        drawTime: new Date(r.submitted_at || r.created_at).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        isDisqualified: r.result_type === "hangus",
        statusText: r.result_type === "menang" ? "SAH" : "HANGUS",
      }));
      setPastWinners(fetchedResults);

      // 3. Process Prizes Data & recalculate remaining_quota
      // Only SAH ('menang') results consume prize quota!
      // 'HANGUS' results do NOT consume quota, allowing replacement draws for unclaimed prizes.
      const rawPrizes = prizesRes.data?.data || [];
      const processedPrizes = rawPrizes.map((p) => {
        const sahCount = fetchedResults.filter(
          (r) => Number(r.prizeId) === Number(p.id) && r.statusText === "SAH"
        ).length;
        const totalQuota = p.total_quota !== undefined ? Number(p.total_quota) : Number(p.remaining_quota) + sahCount;
        const remainingQuota = Math.max(0, totalQuota - sahCount);
        return {
          ...p,
          total_quota: totalQuota,
          remaining_quota: remainingQuota,
        };
      });
      setPrizesList(processedPrizes);
      if (selectedPrizeIdRef.current && processedPrizes.length > 0) {
        const currentIdStr = String(selectedPrizeIdRef.current);
        let matchedPrize = processedPrizes.find((p) => String(p.id) === currentIdStr);
        
        if (!matchedPrize && !isNaN(Number(currentIdStr))) {
          const idx = Number(currentIdStr) - 1;
          if (processedPrizes[idx]) matchedPrize = processedPrizes[idx];
        }

        if (!matchedPrize && prize) {
          matchedPrize = processedPrizes.find((p) => p.name && p.name.toLowerCase() === prize.toLowerCase());
        }

        if (matchedPrize) {
          setSelectedPrizeId(String(matchedPrize.id));
          selectedPrizeIdRef.current = String(matchedPrize.id);
          setPrize(matchedPrize.name);
        }
      } else if (!selectedPrizeIdRef.current && processedPrizes.length > 0) {
        const available = processedPrizes.find((p) => p.remaining_quota > 0);
        if (available) {
          setSelectedPrizeId(String(available.id));
          selectedPrizeIdRef.current = String(available.id);
          setPrize(available.name);
        }
      }

    } catch (error) {
      console.error("Error fetching data from local API, using fallback data:", error);
      if (names.length === 0) {
        setNames(DUMMY_PARTICIPANTS);
        setReelItems(DUMMY_PARTICIPANTS.slice(0, 10));
      }
      if (prizesList.length === 0) {
        setPrizesList(DUMMY_PRIZES);
        if (selectedPrizeIdRef.current && DUMMY_PRIZES.length > 0) {
          const currentIdStr = String(selectedPrizeIdRef.current);
          let matchedPrize = DUMMY_PRIZES.find((p) => String(p.id) === currentIdStr);
          if (!matchedPrize && !isNaN(Number(currentIdStr))) {
            const idx = Number(currentIdStr) - 1;
            if (DUMMY_PRIZES[idx]) matchedPrize = DUMMY_PRIZES[idx];
          }
          if (matchedPrize) {
            setSelectedPrizeId(String(matchedPrize.id));
            selectedPrizeIdRef.current = String(matchedPrize.id);
            setPrize(matchedPrize.name);
          }
        } else if (!selectedPrizeIdRef.current && DUMMY_PRIZES.length > 0) {
          const available = DUMMY_PRIZES.find((p) => p.remaining_quota > 0);
          if (available) {
            setSelectedPrizeId(String(available.id));
            selectedPrizeIdRef.current = String(available.id);
            setPrize(available.name);
          }
        }
      }
    } finally {
      if (!isSilent) setIsRefreshing(false);
    }
  };

  // Submit winner result to local API
  const submitDrawResult = async (participantId, prizeId, resultType = "menang") => {
    try {
      const payload = {
        participant_id: participantId,
        result_type: resultType,
        prize_id: prizeId ? Number(prizeId) : null,
        external_ref: `draw-${Date.now()}-${participantId}`,
      };

      const res = await axios.post(`${API_BASE_URL}/draw/results`, payload, {
        headers: getApiHeaders(),
      });
      console.log("Hasil undian berhasil disimpan ke server:", res.data);
      return true;
    } catch (error) {
      console.error("Gagal menyimpan hasil undian ke API server:", error?.response?.data || error.message);
      return false;
    }
  };

  const cancelDrawResult = async (participantId) => {
    try {
      const payload = { participant_id: participantId };
      const res = await axios.post(`${API_BASE_URL}/draw/results/cancel`, payload, {
        headers: getApiHeaders(),
      });
      console.log("Hasil undian berhasil dibatalkan dari server:", res.data);
      return true;
    } catch (error) {
      console.error("Gagal membatalkan hasil undian di API server:", error?.response?.data || error.message);
      return false;
    }
  };

  // Listen to hash change for direct URL routing (#mc / #spin)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#mc" || window.location.search.includes("mode=mc")) {
        setViewMode("mc");
      } else if (window.location.hash === "#spin") {
        setViewMode("spin");
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Continuous Realtime Auto-polling every 2.5 seconds for both Videotron (#spin) and MC (#mc) views
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // Only auto-fetch silently in background when spin animation is not active
      if (!isDrawingRef.current) {
        fetchData(true);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Effect for 10-second caller timer
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setIsDisqualified(true);
            playSound("fail");

            // Mark current winner in pastWinners log as HANGUS
            setPastWinners((prevLog) => {
              if (prevLog.length === 0) return prevLog;
              const updated = [...prevLog];
              updated[0] = { ...updated[0], isDisqualified: true, statusText: "HANGUS" };
              return updated;
            });

            // Submit hangus status to API server (quota remains consumed)
            if (winnerData && winnerData.id) {
              submitDrawResult(winnerData.id, selectedPrizeId, "hangus").then(() => {
                fetchData();
              });
            }

            return 0;
          }
          playSound("beep");
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, countdown, winnerData, selectedPrizeId]);

  // Helper to mask phone numbers
  const maskPhoneNumber = (phone) => {
    if (!phone) return "---";
    if (phone.length <= 7) return phone;
    const firstPart = phone.substring(0, 5);
    const lastPart = phone.substring(phone.length - 4);
    return `${firstPart}***${lastPart}`;
  };

  // Helper to mask NIK (keep first 4 digits, replace the rest with 'x')
  const maskNik = (nik) => {
    if (!nik) return "Peserta";
    const cleanNik = String(nik).trim();
    if (cleanNik.length <= 4) return `NIK: ${cleanNik}`;
    const firstFour = cleanNik.substring(0, 4);
    const maskedPart = "x".repeat(cleanNik.length - 4);
    return `NIK: ${firstFour}${maskedPart}`;
  };

  // Sound ticker engine
  const playSpinTicker = () => {
    let delay = 40;
    const maxDelay = 550;
    const duration = 9900;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) return;

      playSound("tick");

      const progress = elapsed / duration;
      // Exponential slowing effect
      delay = 40 + Math.pow(progress, 3) * (maxDelay - 40);
      setTimeout(tick, delay);
    };

    tick();
  };

  const startDraw = (isRemoteCall = false, presetWinner = null) => {
    // GUARD 1: Prize must be selected and have remaining quota > 0
    const selectedPrizeObj = prizesList.find((p) => String(p.id) === String(selectedPrizeId));
    if (!selectedPrizeId || !selectedPrizeObj) {
      setToastMessage("⚠️ Silakan pilih hadiah terlebih dahulu sebelum mengacak!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    if (selectedPrizeObj.remaining_quota <= 0) {
      setToastMessage(`⚠️ Kuota hadiah "${selectedPrizeObj.name}" sudah habis! Silakan pilih hadiah lain.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    // GUARD 2: Synchronous ref lock — prevents double-click race condition
    if (isDrawingRef.current) return;

    // GUARD 4: Build eligible list — exclude anyone with status_peserta set
    const eligible = names.filter((peserta) => !peserta.status_peserta);
    const pastWinnerIds = new Set(pastWinners.map((w) => w.id));
    const safeEligible = eligible.filter((p) => !pastWinnerIds.has(p.id));

    if (rolling || (safeEligible.length === 0 && !presetWinner)) return;

    // Determine chosen winner (Use presetWinner if received via remote socket, otherwise pick locally)
    let chosenWinner = presetWinner;
    if (!chosenWinner) {
      let randomValue;
      if (window.crypto && window.crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        randomValue = arr[0] / (0xFFFFFFFF + 1);
      } else {
        randomValue = Math.random();
      }
      const targetIdx = Math.floor(randomValue * safeEligible.length);
      chosenWinner = safeEligible[targetIdx];
    }

    if (!chosenWinner) return;

    // Emit remote event if triggered locally (Include chosenWinner so Display uses exact same winner!)
    if (!isRemoteCall) {
      sendRemoteAction("SPIN_START", { prizeId: selectedPrizeId, prizeName: prize, winner: chosenWinner });
    }

    // LOCK the draw — synchronous, no race condition possible
    isDrawingRef.current = true;
    setWinner(false);
    setRolling(true);
    setWinnerData(null);

    // Immediately remove chosen winner from local candidate list state to prevent re-selection
    setNames((prevNames) => prevNames.filter((p) => p.id !== chosenWinner.id));

    // 2. Create a fully shuffled pool of ALL participants (Fisher-Yates Shuffle)
    const shuffledPool = safeEligible.length > 0 ? [...safeEligible] : [chosenWinner, ...DUMMY_PARTICIPANTS];
    for (let j = shuffledPool.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffledPool[j], shuffledPool[k]] = [shuffledPool[k], shuffledPool[j]];
    }

    const newReel = Array(160).fill(null);

    // Keep initial items (0..8) matching currently visible viewport items (indices 140..148 from previous spin) to prevent jumpiness on initial spin frame
    for (let i = 0; i < 9; i++) {
      newReel[i] = reelItems[140 + i] || reelItems[i] || shuffledPool[i % shuffledPool.length];
    }

    // Winner will be centered in the highlight box at index 144 (viewport offset 4 + 140 scrolled slots = 144)
    const TARGET_WINNER_INDEX = 144;
    newReel[TARGET_WINNER_INDEX] = chosenWinner;

    // Fill all other slots (9 to 159) sequentially from shuffled pool (zero duplicate names in 10-item window)
    const winnerPos = shuffledPool.findIndex((p) => p.id === chosenWinner.id);
    const validWinnerPos = winnerPos >= 0 ? winnerPos : 0;
    for (let i = 9; i < 160; i++) {
      if (i === TARGET_WINNER_INDEX) continue;
      const offset = TARGET_WINNER_INDEX - i;
      const pos = ((validWinnerPos - offset) % shuffledPool.length + shuffledPool.length * 1000) % shuffledPool.length;
      newReel[i] = shuffledPool[pos];
    }

    // Set reel items and reset translate position to 0 instantly
    setReelItems(newReel);
    setActiveIndex(TARGET_WINNER_INDEX);
    setTranslateY(0);
    setTransitionStyle("none");

    // Play tick sound pattern
    playSpinTicker();

    // Trigger the CSS transition slide (10 seconds duration across 140 slots)
    setTimeout(() => {
      setTranslateY(7280);
      setTransitionStyle("transform 10s cubic-bezier(0.12, 0.88, 0.3, 1)");
    }, 50);

    // When the animation completes (10050ms)
    setTimeout(async () => {
      setRolling(false);
      setWinner(true);
      setWinnerData(chosenWinner);
      setCountdown(10);
      setIsTimerRunning(false);
      setIsDisqualified(false);
      playSound("win");

      sendRemoteAction("SPIN_WIN", { winnerData: chosenWinner });

      // Submit winner result to local API database
      if (chosenWinner.id) {
        await submitDrawResult(chosenWinner.id, selectedPrizeId, "menang");
      }

      // Re-fetch fresh data from API
      await fetchData();

      // Release the draw lock
      isDrawingRef.current = false;
    }, 10050);
  };

  const handleCancelWinner = (winnerItem) => {
    if (!winnerItem || !winnerItem.id) return;
    setCancelTargetWinner(winnerItem);
  };

  const confirmCancelWinner = async () => {
    if (!cancelTargetWinner) return;
    const winnerItem = cancelTargetWinner;
    setCancelTargetWinner(null);
    setIsRefreshing(true);

    const success = await cancelDrawResult(winnerItem.id);
    if (success) {
      playSound("fail");
      setToastMessage(`✅ Kemenangan ${winnerItem.nama} dibatalkan. Peserta telah dikembalikan ke daftar acak spinner & kuota ${winnerItem.prize} dikembalikan!`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } else {
      setToastMessage("⚠️ Gagal membatalkan kemenangan di server. Silakan coba lagi.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
    await fetchData();
  };

  const closeWinnerModal = async () => {
    sendRemoteAction("CLOSE_WINNER");
    setWinner(false);
    setWinnerData(null);
    setIsTimerRunning(false);
    setCountdown(10);
    setIsDisqualified(false);
    // Re-sync with API to get fresh eligible list & prizes
    await fetchData();
  };

  const startTimer = () => {
    if (countdown > 0) {
      sendRemoteAction("START_TIMER");
      setIsTimerRunning(true);
      playSound("beep");
    }
  };

  const stopTimer = () => {
    sendRemoteAction("STOP_TIMER");
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    sendRemoteAction("RESET_TIMER");
    setIsTimerRunning(false);
    setCountdown(10);
    setIsDisqualified(false);
    // Restore status back to SAH if reset before close
    setPastWinners((prevLog) => {
      if (prevLog.length === 0) return prevLog;
      const updated = [...prevLog];
      if (updated[0].statusText === "GUGUR") {
        updated[0] = { ...updated[0], isDisqualified: false, statusText: "SAH" };
      }
      return updated;
    });
  };

  const resetLottery = () => {
    if (rolling) return;
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/draw/reset`, {}, { headers: getApiHeaders() });
      if (res.data?.status === "success") {
        setPastWinners([]);
        setWinner(false);
        setWinnerData(null);
        setPrize("");
        setSelectedPrizeId("");
      }
    } catch (e) {
      console.error("Gagal melakukan reset ke API server:", e);
      alert("⚠️ Gagal melakukan reset di server API (10.1.18.99)! File backend di server belum diupdate dengan endpoint /draw/reset.");
    } finally {
      setShowResetModal(false);
      await fetchData(); // Re-sync with API
    }
  };

  const eligibleCount = names.filter((peserta) => !peserta.status_peserta).length;
  const selectedPrizeObj = prizesList.find((p) => String(p.id) === String(selectedPrizeId));
  const isPrizeQuotaExhausted = !selectedPrizeObj || (selectedPrizeObj.remaining_quota !== undefined && selectedPrizeObj.remaining_quota <= 0);

  // Filtered winners for MC search box
  const filteredMcWinners = pastWinners.filter((w) => {
    if (!mcSearchQuery) return true;
    const q = mcSearchQuery.toLowerCase();
    return (
      (w.nama && w.nama.toLowerCase().includes(q)) ||
      (w.instansi && w.instansi.toLowerCase().includes(q)) ||
      (w.prize && w.prize.toLowerCase().includes(q)) ||
      (w.phone && w.phone.toLowerCase().includes(q))
    );
  });

  if (!isUnlocked) {
    return (
      <div className="app-lock-overlay">
        <div className="app-lock-card animate-zoom-in">
          <div className="app-lock-logo-wrapper">
            <img src={sidoarjoImage} alt="Logo Sidoarjo" className="app-lock-logo" />
          </div>

          <div className="app-lock-badge">🔒 AKSES DILINDUNGI KHUSUS PANITIA / MC</div>
          <h2 className="app-lock-title">SIDOARJO LUCKY DRAW</h2>
          <p className="app-lock-desc">
            Sistem pengundian dikunci untuk mencegah akses tidak sah dari perangkat luar di alamat <code>http://10.1.18.100</code>.
          </p>

          <form onSubmit={handleUnlockSubmit} className="app-lock-form">
            <input
              type="password"
              placeholder="🔑 Masukkan PIN Keamanan..."
              value={pinInputValue}
              onChange={(e) => {
                setPinInputValue(e.target.value);
                setPinErrorMsg("");
              }}
              className="app-lock-input"
              autoFocus
            />

            {pinErrorMsg && <div className="app-lock-error">{pinErrorMsg}</div>}

            <button type="submit" className="btn-app-unlock">
              🔓 Buka Akses Aplikasi
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`lucky-draw-root ${viewMode === "spin" ? "videotron-mode" : "mc-mode"} ${isFullscreen ? "is-fullscreen" : ""}`}>

      {/* Top Header Navigation Bar with View Switcher */}
      <nav className="top-nav-tabs">
        <div className="top-nav-brand">
          <img src={sidoarjoImage} alt="Logo Sidoarjo" />
          <span>SIDOARJO LUCKY DRAW</span>
        </div>

        <div className="view-switcher">
          <button
            className={`view-tab-btn ${appMode === "display" || (appMode !== "controller" && viewMode === "spin") ? "active" : ""}`}
            onClick={() => {
              setAppMode("display");
              setViewMode("spin");
              window.history.pushState({}, "", "?mode=display");
            }}
          >
            📺 Tampilan Videotron
          </button>
          <button
            className={`view-tab-btn ${appMode === "controller" ? "active" : ""}`}
            onClick={() => {
              setAppMode("controller");
              window.history.pushState({}, "", "?mode=controller");
            }}
          >
            🎮 Remote Controller (Komputer A)
          </button>
          <button
            className={`view-tab-btn ${appMode === "mc" || viewMode === "mc" ? "active" : ""}`}
            onClick={() => {
              setAppMode("mc");
              setViewMode("mc");
              window.history.pushState({}, "", "?mode=mc#mc");
            }}
          >
            🎤 Mode MC / Presenter
          </button>
        </div>

        <div className="top-nav-right-actions">
          <button
            className="btn-search-participant-toggle"
            onClick={() => setShowSearchModal(true)}
            title="Cari & Cek Status Peserta (Apakah Masuk Daftar / Dikembalikan)"
          >
            🔍 Cek Status Peserta
          </button>

          <button
            className={`btn-fullscreen-toggle ${isFullscreen ? "is-active" : ""}`}
            onClick={toggleFullscreen}
            title="Toggle Mode Fullscreen / Layar Penuh (Tekan 'F')"
          >
            {isFullscreen ? "↙ Keluar Fullscreen" : "⛶ Mode Fullscreen (F)"}
          </button>

          <button
            className="btn-lock-app-toggle"
            onClick={handleLockApp}
            title="Kunci Akses Aplikasi (Memerlukan PIN lagi)"
          >
            🔒 Kunci App
          </button>

          <div className="live-indicator">
            <span className={`pulse-dot ${socketConnected ? "green" : "red"}`}></span>
            <span>
              {socketConnected
                ? `LAN SOCKET OK (${socketClients.display} Display)`
                : "OFFLINE / SINGLE"}
            </span>
          </div>
        </div>
      </nav>

      {/* Toast Alert */}
      {showToast && (
        <div className="toast-top-center animate-slide-down">
          {toastMessage}
        </div>
      )}

      {/* Confetti Celebration */}
      {winner && (viewMode === "spin" || appMode === "display") && <Confetti />}

      {/* ============================================================
         VIEW MODE: REMOTE CONTROLLER DASHBOARD (KOMPUTER A)
         ============================================================ */}
      {appMode === "controller" ? (
        <div className="controller-container animate-fade-in" style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header Banner */}
          <div style={{ background: "#1a1a1a", color: "#fff", padding: "16px 24px", borderRadius: "12px", border: "3px solid #1a1a1a", boxShadow: "4px 4px 0px #1a1a1a", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.4rem", color: "var(--color-yellow)" }}>🎮 REMOTE CONTROLLER (KOMPUTER A)</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "#bbb" }}>Operator Tombol Pengacak Doorprize Panggung</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "800", background: socketConnected ? "rgba(76, 175, 80, 0.2)" : "rgba(239, 83, 80, 0.2)", color: socketConnected ? "#4caf50" : "#ef5350", border: socketConnected ? "1px solid #4caf50" : "1px solid #ef5350" }}>
                {socketConnected ? "🟢 Socket LAN Active" : "🔴 Disconnected"}
              </span>
              <span style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "800", background: "rgba(33, 150, 243, 0.2)", color: "#2196f3", border: "1px solid #2196f3" }}>
                📺 Layar Display: {socketClients.display} Online
              </span>
            </div>
          </div>

          {/* Grid Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            {/* Left Card: Big Spin Control */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "3px solid #1a1a1a", boxShadow: "6px 6px 0px #1a1a1a", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "900", marginBottom: "12px", borderBottom: "2px dashed #1a1a1a", paddingBottom: "8px" }}>
                  1. KONTROL UTAMA TOMBOL ACAK
                </h3>
                <div style={{ background: "var(--bg-warm)", border: "2px solid #1a1a1a", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: "800", color: "#666" }}>HADIAH TERPILIH DI PANGGUNG:</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "var(--color-orange)", marginTop: "4px" }}>
                    {selectedPrizeObj ? `🎁 ${selectedPrizeObj.name.toUpperCase()} (Sisa: ${selectedPrizeObj.remaining_quota}/${selectedPrizeObj.total_quota})` : "⚠️ BELUM MEMILIH HADIAH"}
                  </div>
                </div>
              </div>

              <button
                disabled={rolling}
                onClick={() => startDraw(false)}
                style={{
                  width: "100%",
                  padding: "28px 20px",
                  fontSize: "1.6rem",
                  fontWeight: "900",
                  color: "#fff",
                  background: rolling ? "#9e9e9e" : isPrizeQuotaExhausted ? "linear-gradient(135deg, #e67e22, #d35400)" : "linear-gradient(135deg, #f5a623, #ff5722)",
                  border: "4px solid #1a1a1a",
                  borderRadius: "16px",
                  boxShadow: rolling ? "none" : "6px 6px 0px #1a1a1a",
                  cursor: rolling ? "not-allowed" : "pointer",
                  transition: "transform 0.1s, boxShadow 0.1s",
                  marginTop: "16px"
                }}
              >
                {rolling ? "🎰 SEDANG MENGACAK DI PANGGUNG..." : "🎲 ACAK PEMENANG DI PANGGUNG"}
              </button>
            </div>

            {/* Right Card: Prize Picker Grid */}
            <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "3px solid #1a1a1a", boxShadow: "6px 6px 0px #1a1a1a" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", marginBottom: "12px", borderBottom: "2px dashed #1a1a1a", paddingBottom: "8px" }}>
                2. PILIH HADIAH UNDIAN
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px", maxHeight: "320px", overflowY: "auto" }}>
                {prizesList.map((p, idx) => {
                  const isSelected = String(p.id) === String(selectedPrizeId);
                  const isZero = p.remaining_quota <= 0;
                  return (
                    <button
                      key={p.id}
                      disabled={rolling || isZero}
                      onClick={() => selectPrizeDirect(p)}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "10px",
                        border: isSelected ? "3px solid #1a1a1a" : "2px solid #ddd",
                        background: isSelected ? "var(--color-orange-light)" : isZero ? "#f5f5f5" : "#fff",
                        color: isZero ? "#aaa" : "#1a1a1a",
                        fontWeight: "800",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: rolling || isZero ? "not-allowed" : "pointer",
                        boxShadow: isSelected ? "3px 3px 0px #1a1a1a" : "none"
                      }}
                    >
                      <span>#{idx + 1} 🎁 {p.name}</span>
                      <span style={{ fontSize: "0.85rem", padding: "4px 8px", borderRadius: "6px", background: isZero ? "#e0e0e0" : "var(--color-yellow)", border: "1px solid #1a1a1a" }}>
                        {isZero ? "HABIS" : `Sisa: ${p.remaining_quota}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Winner Control Panel */}
          {winner && winnerData && (
            <div style={{ background: "#fff", padding: "24px", borderRadius: "16px", border: "3px solid #1a1a1a", boxShadow: "6px 6px 0px #1a1a1a", marginTop: "20px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1a1a1a", borderBottom: "2px dashed #1a1a1a", paddingBottom: "8px", marginBottom: "16px" }}>
                🏆 PEMENANG TERPILIH DI LAYAR PANGGUNG
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1a1a1a", margin: 0 }}>{winnerData.nama}</h2>
                  <p style={{ margin: "6px 0", fontSize: "1.05rem", fontWeight: "700" }}>🏛️ {winnerData.instansi}</p>
                  <p style={{ margin: "6px 0", fontSize: "1rem", fontWeight: "800", color: "var(--color-orange)" }}>📞 {maskPhoneNumber(winnerData.phone || winnerData.telp)}</p>
                  <p style={{ margin: "6px 0", fontSize: "1.1rem", fontWeight: "900", color: "var(--color-green)" }}>🎁 Hadiah: {prize}</p>
                </div>

                <div style={{ background: "var(--bg-warm)", border: "2px solid #1a1a1a", padding: "16px", borderRadius: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontWeight: "800" }}>⏱️ Timer Pemanggilan:</span>
                    <span style={{ fontSize: "1.8rem", fontWeight: "900", color: countdown <= 3 ? "#ef5350" : "#1a1a1a" }}>{countdown}s</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {!isTimerRunning ? (
                      <button onClick={startTimer} style={{ flex: 1, padding: "10px", fontWeight: "800", background: "var(--color-green)", color: "#fff", border: "2px solid #1a1a1a", borderRadius: "8px", cursor: "pointer" }}>
                        ▶️ Start Timer (10s)
                      </button>
                    ) : (
                      <button onClick={stopTimer} style={{ flex: 1, padding: "10px", fontWeight: "800", background: "var(--color-orange)", color: "#fff", border: "2px solid #1a1a1a", borderRadius: "8px", cursor: "pointer" }}>
                        ⏸️ Pause Timer
                      </button>
                    )}
                    <button onClick={resetTimer} style={{ padding: "10px", fontWeight: "800", background: "#fff", border: "2px solid #1a1a1a", borderRadius: "8px", cursor: "pointer" }}>
                      🔄 Reset
                    </button>
                    <button onClick={closeWinnerModal} style={{ width: "100%", padding: "10px", fontWeight: "800", background: "#1a1a1a", color: "#fff", border: "2px solid #1a1a1a", borderRadius: "8px", cursor: "pointer", marginTop: "4px" }}>
                      ✅ Tutup Modal (Panggung)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <a href="?mode=display" target="_blank" rel="noreferrer" style={{ padding: "10px 16px", borderRadius: "8px", background: "var(--color-blue)", color: "#fff", textDecoration: "none", fontWeight: "800", border: "2px solid #1a1a1a" }}>
              📺 Buka Display Panggung (Tab Baru)
            </a>
            <button onClick={() => setShowSearchModal(true)} style={{ padding: "10px 16px", borderRadius: "8px", background: "#fff", color: "#1a1a1a", fontWeight: "800", border: "2px solid #1a1a1a", cursor: "pointer" }}>
              🔍 Cek Status Peserta
            </button>
            <button onClick={resetLottery} style={{ padding: "10px 16px", borderRadius: "8px", background: "var(--color-red-light)", color: "var(--color-red)", fontWeight: "800", border: "2px solid var(--color-red)", cursor: "pointer" }}>
              ⚠️ Reset Data Undian
            </button>
          </div>
        </div>
      ) : viewMode === "mc" ? (
        <div className="mc-container animate-fade-in">
          {/* Spotlight Banner: Latest Winner */}
          {pastWinners.length > 0 && (
            <div className="mc-spotlight-card">
              <div className="mc-spotlight-badge">
                <span>🏆 PEMENANG TERBARU (SIAP DIUMUMKAN MC)</span>
              </div>
              <div className="mc-spotlight-grid">
                <div className="mc-spotlight-name-box">
                  <div className="mc-spotlight-prize">
                    🎁 HADIAH: {pastWinners[0].prize ? pastWinners[0].prize.toUpperCase() : "-"}
                  </div>
                  <div className="mc-spotlight-name">{pastWinners[0].nama}</div>
                  <div className="mc-spotlight-instansi" style={{ color: "var(--color-orange)", fontWeight: "800", fontSize: "1.1rem" }}>
                    🆔 NIK: {pastWinners[0].nik !== "-" ? pastWinners[0].nik : "---"}
                  </div>
                  <div className="mc-spotlight-instansi" style={{ fontSize: "1.05rem", marginTop: "4px" }}>
                    🏛️ Kota / Kabupaten: {pastWinners[0].instansi || pastWinners[0].kab_name || "Peserta"}
                  </div>
                </div>
                <div className="mc-spotlight-meta-list">
                  <div className="mc-meta-item">
                    <span className="mc-meta-label">📞 No. Telepon (Lengkap)</span>
                    <span className="mc-meta-val" style={{ color: "var(--color-yellow)", fontSize: "1.1rem", fontWeight: "900" }}>
                      {pastWinners[0].phone || "---"}
                    </span>
                  </div>
                  <div className="mc-meta-item">
                    <span className="mc-meta-label">🆔 NIK Lengkap</span>
                    <span className="mc-meta-val" style={{ color: "var(--color-orange)", fontSize: "1.1rem", fontWeight: "900" }}>
                      {pastWinners[0].nik !== "-" ? pastWinners[0].nik : "---"}
                    </span>
                  </div>
                  <div className="mc-meta-item">
                    <span className="mc-meta-label">⏱️ Waktu Undian</span>
                    <span className="mc-meta-val">{pastWinners[0].drawTime} WIB</span>
                  </div>
                  <div className="mc-meta-item">
                    <span className="mc-meta-label">Status Verifikasi</span>
                    <span className="mc-meta-val">
                      {pastWinners[0].isDisqualified || pastWinners[0].statusText === "HANGUS" ? (
                        <span style={{ color: "var(--color-red)", fontWeight: "900" }}>❌ HANGUS</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ color: "var(--color-green)", fontWeight: "900" }}>✅ SAH</span>
                          <button
                            className="btn-cancel-winner"
                            onClick={() => handleCancelWinner(pastWinners[0])}
                            style={{ marginTop: 0, padding: "4px 10px", fontSize: "0.8rem" }}
                          >
                            🚫 Batalkan Pemenang (Kuota Kembali)
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls & Toolbar */}
          <div className="mc-toolbar-card">
            <div className="mc-search-box">
              <input
                type="text"
                placeholder="🔍 Cari nama pemenang, NIK, Kota/Kabupaten, atau telepon..."
                value={mcSearchQuery}
                onChange={(e) => setMcSearchQuery(e.target.value)}
                className="mc-input-field"
              />
            </div>

            <div className="mc-action-btns">
              <button
                className="btn-mc-action primary"
                onClick={fetchData}
                disabled={isRefreshing}
              >
                {isRefreshing ? "⏳ Syncing..." : "🔄 Refresh Manual"}
              </button>
              <button
                className="btn-mc-action print"
                onClick={() => window.print()}
              >
                🖨️ Cetak / Print List
              </button>
            </div>
          </div>

          {/* Winner List Table Panel */}
          <div className="mc-table-panel">
            <div className="mc-table-header-row">
              <div className="mc-table-title">
                📜 List Pemenang Doorprize Terkini ({filteredMcWinners.length} Orang)
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", fontWeight: "700" }}>
                Auto-Sync API Setiap 2.5 Detik
              </div>
            </div>

            {filteredMcWinners.length > 0 ? (
              <div className="mc-table-wrapper">
                <table className="mc-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Waktu</th>
                      <th>Nama Pemenang</th>
                      <th>NIK (Lengkap)</th>
                      <th>Kota / Kabupaten</th>
                      <th>No. Telepon (Lengkap)</th>
                      <th>Hadiah</th>
                      <th>Status & Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMcWinners.map((w, idx) => {
                      const isLatest = idx === 0 && !mcSearchQuery;
                      return (
                        <tr
                          key={idx}
                          className={isLatest ? "latest-winner-row" : ""}
                        >
                          <td data-label="No">{filteredMcWinners.length - idx}</td>
                          <td data-label="Waktu">{w.drawTime}</td>
                          <td data-label="Nama Pemenang" style={{ color: "#1a1a1a", fontSize: "1.05rem", fontWeight: "800" }}>
                            {w.nama} {isLatest && <span style={{ fontSize: "0.8rem", color: "var(--color-orange)", marginLeft: "6px" }}>(Terbaru)</span>}
                          </td>
                          <td data-label="NIK (Lengkap)" style={{ fontWeight: "800", letterSpacing: "0.5px", color: "var(--text-dark)" }}>
                            {w.nik !== "-" ? w.nik : "-"}
                          </td>
                          <td data-label="Kota / Kabupaten">{w.instansi || "Peserta"}</td>
                          <td data-label="No. Telepon (Lengkap)" style={{ fontWeight: "800", color: "#1a1a1a" }}>
                            {w.phone || "-"}
                          </td>
                          <td data-label="Hadiah">🎁 {w.prize ? w.prize.toUpperCase() : "-"}</td>
                          <td data-label="Status & Aksi">
                            {w.isDisqualified || w.statusText === "HANGUS" ? (
                              <span className="status-pill fail">❌ HANGUS</span>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center" }}>
                                <span className="status-pill success">✅ SAH</span>
                                <button
                                  className="btn-table-cancel"
                                  onClick={() => handleCancelWinner(w)}
                                  title="Batalkan kemenangan & kembalikan kuota hadiah"
                                >
                                  🚫 Batalkan
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-winners-placeholder">
                <div className="empty-icon">📜</div>
                <p className="empty-text">Belum ada pemenang yang terdaftar</p>
                <p className="empty-subtext">Halaman ini terhubung langsung secara real-time dengan pengundian videotron.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================
           VIEW MODE: MAIN VIDEOTRON SPIN SLOT
           ============================================================ */
        <div className="lucky-draw-container wide-layout">
          {/* Header */}
          <header className="lucky-draw-header">
            <div className="logo-wrapper">
              <img src={sidoarjoImage} alt="Logo Sidoarjo" className="sidoarjo-logo" />
            </div>
            <h1 className="main-title">SIDOARJO LUCKY DRAW</h1>
            <p className="subtitle">Sistem Pengundian Doorprize Digital Terpadu</p>
          </header>

          {/* Stats Row */}
          <section className="stats-dashboard single-card">
            <div className="stat-card gold">
              <span className="stat-label">🎁 Hadiah Terpilih</span>
              <span className="stat-value">{prize ? prize.toUpperCase() : "BELUM DIPILIH"}</span>
            </div>
          </section>

          {/* 2-Column Side-by-Side Dashboard Layout for Videotron */}
          <div className="videotron-grid-layout">
            {/* Left Column: Controls & Slot Wheel */}
            <div className="videotron-col-left">
              {/* Prize Selector */}
              <section className="prize-selection-panel">
                <div className="panel-card">
                  <div className="card-header-icon">🎁</div>
                  <h3 className="panel-title">Langkah 1: Pilih Hadiah Menarik</h3>
                  <div className="select-dropdown-wrapper">
                    <select
                      value={selectedPrizeId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setSelectedPrizeId(selectedId);
                        const selectedObj = prizesList.find((p) => String(p.id) === String(selectedId));
                        if (selectedObj) {
                          setPrize(selectedObj.name);
                        }
                      }}
                      className="custom-dropdown"
                      disabled={rolling || prizesList.length === 0}
                    >
                      <option value="" disabled hidden>
                        {prizesList.length > 0 ? "-- Silakan Pilih Hadiah --" : "-- Hadiah Tidak Tersedia / Kuota Habis --"}
                      </option>
                      {prizesList.map((p) => {
                        const isZero = p.remaining_quota <= 0;
                        return (
                          <option key={p.id} value={p.id} disabled={isZero}>
                            🎁 {p.name.toUpperCase()} (Sisa Quota: {p.remaining_quota}){isZero ? " - HABIS" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#666", marginTop: "8px", textAlign: "center" }}>
                    💡 Tip Keyboard: Tekan <strong>Panah (↑/↓)</strong> / <strong>Angka (1-9)</strong> ganti hadiah | <strong>F</strong> Fullscreen | <strong>SPACE/ENTER</strong> acak
                  </div>
                </div>
              </section>

              {/* Slot Machine Area */}
              <section className="slot-machine-panel">
                <h3 className="panel-title text-center mb-3">Langkah 2: Putar Roda Keberuntungan</h3>

                <div className="slot-machine-console">
                  <div className={`console-neon-bar left ${rolling ? "rolling" : ""}`}></div>
                  <div className={`console-neon-bar right ${rolling ? "rolling" : ""}`}></div>

                  <div className="slot-machine-viewport">
                    {/* Highlight selection box */}
                    <div className="slot-machine-highlight-box">
                      <div className="arrow left">▶</div>
                      <div className="arrow right">◀</div>
                    </div>

                    {/* Scrollable Reel */}
                    <div
                      className={`slot-machine-reel ${rolling ? "is-spinning" : ""}`}
                      style={{
                        transform: `translateY(-${translateY}px)`,
                        transition: transitionStyle,
                      }}
                    >
                      {reelItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`slot-machine-item ${idx === activeIndex && winner ? "is-winner" : ""
                            }`}
                        >
                          {item ? (
                            <div className="slot-item-card">
                              <div className="slot-item-name">{item.nama}</div>
                              <div className="slot-item-instansi">
                                {item.instansi || "Peserta"}
                              </div>
                            </div>
                          ) : (
                            <div className="slot-item-card placeholder">
                              <div className="slot-item-name">---</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="console-controls">
                  <button
                    className="btn-draw-main"
                    onClick={startDraw}
                    disabled={rolling || eligibleCount === 0 || isPrizeQuotaExhausted}
                  >
                    <div className="btn-draw-content">
                      <span className="btn-text">
                        {rolling
                          ? "MENGACAK NAMA..."
                          : eligibleCount === 0
                            ? "SEMUA PESERTA SUDAH DIUNDI"
                            : !selectedPrizeId
                              ? "PILIH HADIAH TERLEBIH DAHULU"
                              : isPrizeQuotaExhausted
                                ? "KUOTA HADIAH HABIS"
                                : "ACAK PEMENANG"}
                      </span>
                      {!rolling && eligibleCount > 0 && selectedPrizeId && !isPrizeQuotaExhausted && (
                        <span className="btn-key-hint">⌨️ Tekan SPACE / ENTER / Remote Clicker</span>
                      )}
                    </div>
                    <span className="btn-glow"></span>
                  </button>

                  <button
                    className="btn-reset-secondary"
                    onClick={fetchData}
                    disabled={rolling || isRefreshing}
                    style={{ marginRight: "10px" }}
                  >
                    🔄 Refresh Data API
                  </button>
                  <button
                    className="btn-reset-secondary"
                    onClick={resetLottery}
                    disabled={rolling || isRefreshing}
                  >
                    🗑️ Reset Pemenang
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Real-Time Past Winners Log */}
            <div className="videotron-col-right">
              <section className="past-winners-log animate-fade-in full-height">
                <div className="log-panel-card">
                  <div className="log-header">
                    <span className="log-icon">📜</span>
                    <h3 className="log-title">Daftar Pemenang Terkini</h3>
                  </div>

                  {pastWinners.length > 0 ? (
                    <div className="log-table-container">
                      <table className="log-table">
                        <thead>
                          <tr>
                            <th>Waktu</th>
                            <th>Nama Pemenang</th>
                            <th>Kota / Kabupaten</th>
                            <th>Hadiah</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastWinners.map((w, idx) => {
                            const isFail = w.isDisqualified || w.statusText === "HANGUS" || w.statusText === "GUGUR";
                            return (
                              <tr key={idx} className={`winner-row-entry ${isFail ? "is-gugur" : ""}`}>
                                <td data-label="Waktu" className="col-time">{w.drawTime}</td>
                                <td data-label="Nama Pemenang" className="col-name">{w.nama}</td>
                                <td data-label="Kota / Kabupaten" className="col-instansi">{w.instansi || "Peserta"}</td>
                                <td data-label="Hadiah" className="col-prize">🎁 {w.prize && w.prize !== "-" ? w.prize.toUpperCase() : "-"}</td>
                                <td data-label="Status" className="col-status">
                                  {isFail ? (
                                    <span className="status-pill fail">❌ HANGUS</span>
                                  ) : (
                                    <span className="status-pill success">✅ SAH</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-winners-placeholder">
                      <div className="empty-icon">🏆</div>
                      <p className="empty-text">Belum ada pemenang yang terundi.</p>
                      <p className="empty-subtext">Pilih hadiah dan klik "ACAK PEMENANG" untuk memulai.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Winner Showcase Modal/Card */}
          {winner && winnerData && (
            <section className="winner-announcement-overlay">
              <div className={`winner-announcement-card animate-zoom-in ${isDisqualified ? "disqualified" : ""}`}>
                <div className="celebration-ribbon">
                  {isDisqualified ? "❌ PEMENANG GUGUR ❌" : "🏆 PEMENANG UTAMA 🏆"}
                </div>

                <div className="card-trophy">{isDisqualified ? "❌" : "🎉"}</div>

                <div className="winner-details">
                  <p className="prize-won-tag">MEMENANGKAN {prize.toUpperCase()}</p>

                  <h2 className="winner-name-glow">{winnerData.nama}</h2>
                  <h4 className="winner-instansi-detail">{winnerData.instansi || "Peserta"}</h4>

                  <div className="winner-metadata-box">
                    <div className="meta-row">
                      <span className="meta-label">Nomor Telepon</span>
                      <span className="meta-val">
                        {maskPhoneNumber(winnerData.telp)}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Waktu Undian</span>
                      <span className="meta-val">
                        {new Date().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })} WIB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Countdown Timer Calling Box */}
                <div className="timer-caller-box">
                  <div className="timer-display-header">⏱️ Hitung Mundur Panggilan (10 Detik)</div>
                  <div className={`timer-number ${countdown <= 3 && countdown > 0 ? "urgent" : ""} ${isDisqualified ? "expired" : ""}`}>
                    {countdown} <span className="timer-unit">Detik</span>
                  </div>

                  {isDisqualified && (
                    <div className="timer-status-badge fail">
                      ⚠️ Waktu habis! Peserta dianggap GUGUR / Tidak Ada di Tempat.
                    </div>
                  )}

                  <div className="timer-controls">
                    {!isTimerRunning && countdown > 0 && (
                      <button className="btn-timer start" onClick={startTimer}>
                        ▶️ Mulai Hitung (10s) <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>(Tekan T / Klik)</span>
                      </button>
                    )}
                    {isTimerRunning && (
                      <button className="btn-timer stop" onClick={stopTimer}>
                        ⏸️ Hentikan Counter (Hadir) <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>(T)</span>
                      </button>
                    )}
                    {(isDisqualified || countdown < 10) && (
                      <button className="btn-timer reset" onClick={resetTimer}>
                        🔄 Reset Timer (10s) <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>(R)</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="card-footer-note">
                  {isDisqualified
                    ? "Status peserta telah tercatat. Tutup modal untuk melakukan pengundian ulang."
                    : "Selamat! Hubungi Panitia / Dinas Kominfo Sidoarjo untuk penyerahan hadiah."}
                </p>

                <button className="btn-close-winner" onClick={closeWinnerModal}>
                  {isDisqualified ? "Tutup & Diundi Lagi (Space/Enter/Esc)" : "Tutup (Space/Enter/Esc)"}
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="reset-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="reset-modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-icon">
              <img src={sidoarjoImage} alt="Logo Sidoarjo" className="reset-modal-logo" />
            </div>

            <h3 className="reset-modal-title">Reset Seluruh Data Pemenang?</h3>

            <p className="reset-modal-desc">
              Semua riwayat pemenang akan dihapus dari database server, kuota hadiah dikembalikan, dan status peserta di-reset ke belum diundi.
            </p>

            <div className="reset-modal-actions">
              <button
                className="reset-modal-btn cancel"
                onClick={() => setShowResetModal(false)}
              >
                Batal
              </button>
              <button
                className="reset-modal-btn confirm"
                onClick={confirmReset}
              >
                Ya, Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelTargetWinner && (
        <div className="cancel-modal-overlay" onClick={() => setCancelTargetWinner(null)}>
          <div className="cancel-modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-modal-badge">
              <span>🚫 KONFIRMASI PEMBATALAN PEMENANG</span>
            </div>

            <h3 className="cancel-modal-title">Batalkan Kemenangan Peserta Ini?</h3>

            <div className="cancel-winner-preview">
              <div className="cancel-winner-name">{cancelTargetWinner.nama}</div>
              <div className="cancel-winner-meta">
                <span>🎁 Hadiah: {cancelTargetWinner.prize ? cancelTargetWinner.prize.toUpperCase() : "-"}</span>
                <span>🆔 NIK: {cancelTargetWinner.nik !== "-" ? cancelTargetWinner.nik : "---"}</span>
                <span>🏛️ Kota/Kab: {cancelTargetWinner.instansi || cancelTargetWinner.kab_name || "Peserta"}</span>
                <span>📞 Telp: {cancelTargetWinner.phone || "---"}</span>
              </div>
            </div>

            <div className="cancel-warning-box">
              🔄 Nama peserta akan <strong>DIKEMBALIKAN KE DAFTAR ACAK SPINNER</strong> (dapat diundi kembali), dan 1 kuota hadiah <strong>{cancelTargetWinner.prize}</strong> akan dikembalikan ke server secara real-time.
            </div>

            <div className="cancel-modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={() => setCancelTargetWinner(null)}
              >
                Batal
              </button>
              <button
                className="btn-modal-confirm-delete"
                onClick={confirmCancelWinner}
              >
                Ya, Batalkan Pemenang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Participant Status Modal */}
      {showSearchModal && (
        <div className="search-modal-overlay" onClick={() => setShowSearchModal(false)}>
          <div className="search-modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <div className="search-modal-title">
                🔍 Cari & Cek Status Peserta Undian
              </div>
              <button className="search-modal-close" onClick={() => setShowSearchModal(false)}>✕</button>
            </div>

            <div className="search-modal-body">
              <div className="search-modal-input-wrapper">
                <input
                  type="text"
                  placeholder="🔍 Masukkan nama peserta, NIK, No. Telepon, atau Instansi/Kota..."
                  value={participantSearchQuery}
                  onChange={(e) => setParticipantSearchQuery(e.target.value)}
                  className="search-modal-input"
                  autoFocus
                />
                {participantSearchQuery && (
                  <button className="btn-clear-search" onClick={() => setParticipantSearchQuery("")}>✕ Clear</button>
                )}
              </div>

              <div className="search-modal-stats-bar">
                <span>📊 Total Peserta Siap Diundi: <strong>{eligibleCount.toLocaleString("id-ID")} Orang</strong></span>
                <span>🏆 Total Pemenang: <strong>{pastWinners.length.toLocaleString("id-ID")} Orang</strong></span>
              </div>

              <div className="search-modal-results-container">
                {participantSearchQuery.trim() === "" ? (
                  <div className="search-empty-prompt">
                    💡 Ketik nama atau NIK peserta untuk mengecek apakah statusnya <strong>🟢 SIAP DIUNDI (Ada Dalam Daftar)</strong> atau telah dikembalikan.
                  </div>
                ) : filteredParticipantsSearch.length > 0 ? (
                  <table className="search-results-table">
                    <thead>
                      <tr>
                        <th>Nama Peserta</th>
                        <th>NIK</th>
                        <th>Instansi / Kota</th>
                        <th>No. Telepon</th>
                        <th>Status Saat Ini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParticipantsSearch.map((p, idx) => (
                        <tr key={idx} className={`search-row ${p.statusType}`}>
                          <td style={{ fontWeight: "800", color: "#1a1a1a" }}>{p.nama}</td>
                          <td>{p.nik}</td>
                          <td>{p.instansi}</td>
                          <td>{p.phone}</td>
                          <td>
                            <span className={`status-badge-pill ${p.statusType}`}>
                              {p.statusBadge}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="search-empty-prompt">
                    ❌ Tidak ditemukan peserta dengan kata kunci "<strong>{participantSearchQuery}</strong>".
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN Settings Modal */}
      {showPinSettings && (
        <div className="reset-modal-overlay" onClick={() => setShowPinSettings(false)}>
          <div className="reset-modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-icon">🔑</div>
            <h3 className="reset-modal-title">Ganti PIN Keamanan Aplikasi</h3>
            <p className="reset-modal-desc">
              PIN saat ini: <strong>{securityPin}</strong>. Masukkan PIN baru minimal 4 karakter:
            </p>
            <form onSubmit={handleChangePinSubmit} style={{ marginTop: "12px" }}>
              <input
                type="text"
                placeholder="Masukkan PIN Baru..."
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="mc-input-field"
                style={{ textAlign: "center", fontSize: "1.2rem", fontWeight: "900", letterSpacing: "2px" }}
                autoFocus
              />
              <div className="reset-modal-actions" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="reset-modal-btn cancel"
                  onClick={() => setShowPinSettings(false)}
                >
                  Batal
                </button>
                <button type="submit" className="reset-modal-btn confirm">
                  Simpan PIN Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
