import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import sidoarjoImage from "../public/sidoarjo.png";
import axios from "axios";

// Server API Configuration
const API_BASE_URL = "http://10.1.18.99/api";
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
  const [prizesList, setPrizesList] = useState([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const [prize, setPrize] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for past winners list
  const [pastWinners, setPastWinners] = useState([]);

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

  // Fetch data from local API
  const fetchData = async () => {
    setIsRefreshing(true);
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
      if (fetchedParticipants.length > 0 && !isDrawingRef.current) {
        setReelItems(fetchedParticipants.slice(0, 3));
        setActiveIndex(1);
        setTranslateY(0);
        setTransitionStyle("none");
      }

      // 2. Process Prizes Data
      const fetchedPrizes = prizesRes.data?.data || [];
      setPrizesList(fetchedPrizes);

      // 3. Process Results Data (Draw History)
      const fetchedResults = (resultsRes.data?.data || []).map((r) => ({
        id: r.participant_id,
        nama: r.participant?.name || "Peserta",
        instansi: r.participant?.nik ? maskNik(r.participant.nik) : (r.participant?.instansi || "Peserta"),
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

    } catch (error) {
      console.error("Error fetching data from local API, using fallback data:", error);
      if (names.length === 0) {
        setNames(DUMMY_PARTICIPANTS);
        setReelItems(DUMMY_PARTICIPANTS.slice(0, 3));
      }
      if (prizesList.length === 0) {
        setPrizesList(DUMMY_PRIZES);
      }
    } finally {
      setIsRefreshing(false);
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
              updated[0] = { ...updated[0], isDisqualified: true, statusText: "GUGUR", prize: "GUGUR" };
              return updated;
            });

            // Submit hangus status to API server and restore prize quota
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
    if (!selectedPrizeId && !prize) {
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

    // GUARD 5: Cross-check against pastWinners as safety net
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

    // Immediately remove chosen winner from local candidate list state to prevent re-selection
    setNames((prevNames) => prevNames.filter((p) => p.id !== chosenWinner.id));

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

      // Submit winner result to local API database
      if (chosenWinner.id) {
        await submitDrawResult(chosenWinner.id, selectedPrizeId, "menang");
      }

      // Re-fetch fresh data from API
      await fetchData();

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
    // Re-sync with API to get fresh eligible list & prizes
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
                    {prizesList.map((p) => (
                      <option key={p.id} value={p.id}>
                        🎁 {p.name.toUpperCase()} (Sisa Quota: {p.remaining_quota})
                      </option>
                    ))}
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
                          <th>Peserta</th>
                          <th>Hadiah</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastWinners.map((w, idx) => {
                          const isFail = w.isDisqualified || w.statusText === "HANGUS" || w.statusText === "GUGUR";
                          return (
                            <tr key={idx} className={`winner-row-entry ${isFail ? "is-gugur" : ""}`}>
                              <td className="col-time">{w.drawTime}</td>
                              <td className="col-name">{w.nama}</td>
                              <td className="col-instansi">{w.instansi || "Peserta"}</td>
                              <td className="col-prize">🎁 {w.prize && w.prize !== "-" ? w.prize.toUpperCase() : "-"}</td>
                              <td className="col-status">
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
    </div>
  );
};

export default App;
