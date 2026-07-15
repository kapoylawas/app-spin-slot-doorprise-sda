import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import sidoarjoImage from "../public/sidoarjo.png";
import axios from "axios"; // LIVE API INTEGRATION

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

// Helper to play synthesized sounds using Web Audio API
const playSound = (type) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for past winners list
  const [pastWinners, setPastWinners] = useState(() => {
    const saved = localStorage.getItem("sidoarjo_doorprize_winners");
    return saved ? JSON.parse(saved) : [];
  });

  const [prize, setPrize] = useState("");
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(false);
  const [winnerData, setWinnerData] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Timer states for caller countdown (10s)
  const [countdown, setCountdown] = useState(10);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isDisqualified, setIsDisqualified] = useState(false);

  // Hard lock to prevent double-click rapid spin (useRef is synchronous, unlike setState)
  const isDrawingRef = useRef(false);

  // Reel-specific animation states
  const [reelItems, setReelItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState("none");

  // Fetch data from real production API
  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.get(
        "https://daftarhadir.sidoarjokab.go.id/api/get-peserta-doorprize?menerima=semua",
        {
          headers: {
            Authorization: "fkngdfngndngfogmvo95t6509rjgr8u98-=p=-",
          },
        }
      );

      const eligibleParticipants = response.data.data.filter(
        (peserta) =>
          peserta.status_peserta === "" ||
          peserta.status_peserta === undefined ||
          peserta.status_peserta === null
      );

      setNames(eligibleParticipants);

      // Seed reel items initially if they are empty
      if (eligibleParticipants.length > 0 && reelItems.length === 0) {
        setReelItems(eligibleParticipants.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching data from API, using fallback data:", error);
      // Fallback to dummy data to avoid blank screen if server is down
      if (names.length === 0) {
        setNames(DUMMY_PARTICIPANTS);
        setReelItems(DUMMY_PARTICIPANTS.slice(0, 3));
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update winner status in real production API database (with retry)
  const updateWinnerStatus = async (id, prizeValue) => {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await axios.get(
          `https://daftarhadir.sidoarjokab.go.id/api/changestatus-peserta-doorprize?id=${id}&status=1&hadiah=${prizeValue}`,
          {
            headers: {
              Authorization: "fkngdfngndngfogmvo95t6509rjgr8u98-=p=-",
            },
          }
        );
        console.log(`Status peserta ID ${id} berhasil diupdate ke database (attempt ${attempt})`);
        return true; // Success
      } catch (error) {
        console.error(`Gagal mengupdate status peserta (attempt ${attempt}/${maxRetries}):`, error);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt)); // Backoff delay
        }
      }
    }
    console.error(`CRITICAL: Gagal mengupdate status peserta ID ${id} setelah ${maxRetries} percobaan!`);
    return false;
  };

  // Fetch initial data on load
  useEffect(() => {
    fetchData();
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

            // Mark current winner in pastWinners log as GUGUR
            setPastWinners((prevLog) => {
              if (prevLog.length === 0) return prevLog;
              const updated = [...prevLog];
              updated[0] = { ...updated[0], isDisqualified: true, statusText: "GUGUR" };
              localStorage.setItem("sidoarjo_doorprize_winners", JSON.stringify(updated));
              return updated;
            });

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
  }, [isTimerRunning, countdown]);

  // Helper to mask phone numbers
  const maskPhoneNumber = (phone) => {
    if (!phone) return "---";
    if (phone.length <= 7) return phone;
    const firstPart = phone.substring(0, 5);
    const lastPart = phone.substring(phone.length - 4);
    return `${firstPart}***${lastPart}`;
  };

  // Sound ticker engine
  const playSpinTicker = () => {
    let delay = 40;
    const maxDelay = 550;
    const duration = 4400;
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

  const startDraw = () => {
    // GUARD 1: Prize must be selected
    if (!prize) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }

    // GUARD 2: Synchronous ref lock — prevents double-click race condition
    if (isDrawingRef.current) return;

    // GUARD 3: Block during data refresh
    if (isRefreshing) return;

    // GUARD 4: Build eligible list — exclude anyone with status_peserta set
    const eligible = names.filter((peserta) => !peserta.status_peserta);

    // GUARD 5: Cross-check against local pastWinners as a safety net
    const pastWinnerIds = new Set(pastWinners.map((w) => w.id));
    const safeEligible = eligible.filter((p) => !pastWinnerIds.has(p.id));

    if (rolling || safeEligible.length === 0) return;

    // LOCK the draw — synchronous, no race condition possible
    isDrawingRef.current = true;
    setWinner(false);
    setRolling(true);
    setWinnerData(null);

    // Use crypto-grade randomness when available, fallback to Math.random
    let randomValue;
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      randomValue = arr[0] / (0xFFFFFFFF + 1);
    } else {
      randomValue = Math.random();
    }

    const targetIdx = Math.floor(randomValue * safeEligible.length);
    const chosenWinner = safeEligible[targetIdx];

    // Immediately mark as ineligible in local state to prevent any re-selection
    setNames((prevNames) =>
      prevNames.map((p) =>
        p.id === chosenWinner.id ? { ...p, status_peserta: "1" } : p
      )
    );

    // Seed index 0, 1, 2 with currently visible items to prevent jumpiness
    const currentTop = reelItems[activeIndex - 1] || safeEligible[0];
    const currentMiddle = reelItems[activeIndex] || safeEligible[1 % safeEligible.length];
    const currentBottom = reelItems[activeIndex + 1] || safeEligible[2 % safeEligible.length];

    const newReel = Array(45).fill(null);
    newReel[0] = currentTop;
    newReel[1] = currentMiddle;
    newReel[2] = currentBottom;

    // Winner will be centered at index 40
    newReel[40] = chosenWinner;

    // Fill other spots with random eligible items (excluding the winner to avoid visual confusion)
    const fillPool = safeEligible.filter((p) => p.id !== chosenWinner.id);
    const fillSource = fillPool.length > 0 ? fillPool : safeEligible;
    for (let i = 3; i < 45; i++) {
      if (i === 40) continue;
      newReel[i] = fillSource[Math.floor(Math.random() * fillSource.length)];
    }

    // Set reel items and reset translate position to 0 instantly
    setReelItems(newReel);
    setActiveIndex(40);
    setTranslateY(0);
    setTransitionStyle("none");

    // Play tick sound pattern
    playSpinTicker();

    // Trigger the CSS transition slide
    setTimeout(() => {
      setTranslateY(3900);
      setTransitionStyle("transform 4.5s cubic-bezier(0.15, 0.85, 0.35, 1)");
    }, 50);

    // When the animation completes
    setTimeout(async () => {
      setRolling(false);
      setWinner(true);
      setWinnerData(chosenWinner);
      setCountdown(10);
      setIsTimerRunning(false);
      setIsDisqualified(false);
      playSound("win");

      // Update winner status in production database via API (with retry)
      if (chosenWinner.id) {
        await updateWinnerStatus(chosenWinner.id, prize);
      }

      // Add to past winners log (default: SAH)
      const timeStr = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const newWinnerRecord = {
        ...chosenWinner,
        prize: prize,
        drawTime: timeStr,
        isDisqualified: false,
        statusText: "SAH",
      };
      setPastWinners((prev) => {
        const updated = [newWinnerRecord, ...prev];
        localStorage.setItem("sidoarjo_doorprize_winners", JSON.stringify(updated));
        return updated;
      });

      // Release the draw lock
      isDrawingRef.current = false;
    }, 4550);
  };

  const closeWinnerModal = async () => {
    setWinner(false);
    setWinnerData(null);
    setIsTimerRunning(false);
    setCountdown(10);
    setIsDisqualified(false);
    // Re-sync with API to get fresh eligible list (will exclude winners in DB)
    await fetchData();
  };

  const startTimer = () => {
    if (countdown > 0) {
      setIsTimerRunning(true);
      playSound("beep");
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setCountdown(10);
    setIsDisqualified(false);
    // Restore status back to SAH if reset before close
    setPastWinners((prevLog) => {
      if (prevLog.length === 0) return prevLog;
      const updated = [...prevLog];
      if (updated[0].statusText === "GUGUR") {
        updated[0] = { ...updated[0], isDisqualified: false, statusText: "SAH" };
        localStorage.setItem("sidoarjo_doorprize_winners", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const resetLottery = () => {
    if (rolling) return;
    setShowResetModal(true);
  };

  const confirmReset = () => {
    localStorage.removeItem("sidoarjo_doorprize_winners");
    setPastWinners([]);
    setWinner(false);
    setWinnerData(null);
    setPrize("");
    setShowResetModal(false);
    fetchData(); // Re-sync with API
  };

  const eligibleCount = names.filter((peserta) => !peserta.status_peserta).length;

  return (
    <div className="lucky-draw-root">

      {/* Toast Alert */}
      {showToast && (
        <div className="toast-top-center animate-slide-down">
          ⚠️ Silakan pilih hadiah terlebih dahulu sebelum mengacak!
        </div>
      )}

      {/* Confetti Celebration */}
      {winner && <Confetti />}

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
        <section className="stats-dashboard">
          <div className="stat-card gold">
            <span className="stat-label">🎁 Hadiah Terpilih</span>
            <span className="stat-value">{prize ? prize.toUpperCase() : "BELUM DIPILIH"}</span>
          </div>
          <div className="stat-card cyan">
            <span className="stat-label">👥 Sisa Peserta {isRefreshing && "🔄"}</span>
            <span className="stat-value">{eligibleCount}</span>
          </div>
          <div className="stat-card emerald">
            <span className="stat-label">🏆 Total Pemenang</span>
            <span className="stat-value">{pastWinners.length}</span>
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
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    className="custom-dropdown"
                    disabled={rolling}
                  >
                    <option value="" disabled hidden>
                      -- Silakan Pilih Hadiah --
                    </option>
                    <option value="tv lg 55 inch">📺 TV LG 55 Inch</option>
                    <option value="sepeda listrik">⚡ Sepeda Listrik</option>
                    <option value="lemari es 2 pintu polytron">🥶 Lemari Es 2 Pintu Polytron</option>
                    <option value="huawe watch fit 3">⌚ Huawei Watch FIT 3</option>
                    <option value="tv 32 inch">📺 TV 32"</option>
                    <option value="huawe watch gt 5">⌚ Huawei Watch GT 5</option>
                    <option value="sepeda phoenix">🚲 Sepeda Phoenix</option>
                    <option value="sepeda trex">🚲 Sepeda Trex</option>
                    <option value="hp redmi a5">📱 HP Redmi A5</option>
                    <option value="magiccom miyako">🍚 MagicCom Miyako</option>
                    <option value="magiccom">🍚 MagicCom</option>
                    <option value="oven">🍪 Oven</option>
                    <option value="almari plastik">🗄️ Almari Plastik</option>
                    <option value="tabungan delta arta 500k">💰 Tabungan Delta Art @Rp.500.000</option>
                    <option value="kominfo jatim 500k">💰 Kominfo Jatim 500k</option>
                    <option value="tabungan bank jatim">💰 Tabungan Bank Jatim</option>
                    <option value="set alat makan">🍽️ Set Alat Makan</option>
                    <option value="kompor gas rinai">🔥 Kompor Gas Rinai</option>
                    <option value="kompor gas miyako">🔥 Kompor Gas Miyako</option>
                    <option value="kipas angin miyako">🌀 Kipas Angin Miyako</option>
                    <option value="kipas angin">🌀 Kipas Angin</option>
                    <option value="set cangkir">🍵 Set Cangkir</option>
                    <option value="setrika listrik">👔 Setrika Listrik</option>
                    <option value="setrika maspion">👔 Setrika Maspion</option>
                    <option value="setrika">👔 Setrika</option>
                    <option value="blender maspion">🧃 Blender Maspion</option>
                    <option value="dispenser miyako">🚰 Dispenser Miyako</option>
                    <option value="payung">☂️ Payung</option>
                    <option value="mug">☕ Mug</option>
                    <option value="tumbler">💧 Tumbler</option>
                    <option value="bantal">🛏️ Bantal</option>
                    <option value="headphone">🎧 Headphone</option>
                    <option value="rice cooker philip">🍚 Rice Cooker Philip</option>
                  </select>
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
                  disabled={rolling || eligibleCount === 0 || isRefreshing}
                >
                  <span className="btn-text">
                    {rolling ? "MENGACAK NAMA..." : isRefreshing ? "SINKRONISASI DATA..." : "ACAK PEMENANG"}
                  </span>
                  <span className="btn-glow"></span>
                </button>

                <button
                  className="btn-reset-secondary"
                  onClick={resetLottery}
                  disabled={rolling}
                >
                  Reset Winner Log
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
                          <th>Peserta</th>
                          <th>Hadiah</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastWinners.map((w, idx) => (
                          <tr key={idx} className={`winner-row-entry ${w.isDisqualified || w.statusText === "GUGUR" ? "is-gugur" : ""}`}>
                            <td className="col-time">{w.drawTime}</td>
                            <td className="col-name">{w.nama}</td>
                            <td className="col-instansi">{w.instansi || "Peserta"}</td>
                            <td className="col-prize">🎁 {w.prize.toUpperCase()}</td>
                            <td className="col-status">
                              {w.isDisqualified || w.statusText === "GUGUR" ? (
                                <span className="status-pill fail">❌ GUGUR</span>
                              ) : (
                                <span className="status-pill success">✅ SAH</span>
                              )}
                            </td>
                          </tr>
                        ))}
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
                      ▶️ Mulai Hitung (10s)
                    </button>
                  )}
                  {isTimerRunning && (
                    <button className="btn-timer stop" onClick={stopTimer}>
                      ⏸️ Hentikan Counter (Hadir)
                    </button>
                  )}
                  {(isDisqualified || countdown < 10) && (
                    <button className="btn-timer reset" onClick={resetTimer}>
                      🔄 Reset Timer (10s)
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
                {isDisqualified ? "Tutup & Diundi Lagi" : "Tutup"}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="reset-modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="reset-modal-card animate-zoom-in" onClick={(e) => e.stopPropagation()}>
            {/* Warning Icon */}
            <div className="reset-modal-icon">
              <img src={sidoarjoImage} alt="Logo Sidoarjo" className="reset-modal-logo" />
            </div>

            <h3 className="reset-modal-title">Reset Data Pemenang?</h3>

            <p className="reset-modal-desc">
              Seluruh daftar pemenang lokal akan dihapus dan hadiah yang dipilih akan direset.
              Data peserta akan disinkronkan ulang dari server.
            </p>

            <div className="reset-modal-warning-box">
              <span className="reset-warning-icon">💡</span>
              <span className="reset-warning-text">
                Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.
              </span>
            </div>

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
    </div>
  );
};

export default App;
