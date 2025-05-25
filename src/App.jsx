import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import sidoarjoImage from "../public/sidoarjo.png";

const App = () => {
  const [names, setNames] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(false);
  const [slotPosition, setSlotPosition] = useState(0);
  const [prize, setPrize] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);

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
    } catch (error) {
      console.error("Error fetching data:", error);
      setNames([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maskPhoneNumber = (phone) => {
    if (!phone) return "---";
    if (phone.length <= 7) return phone;

    const firstPart = phone.substring(0, 5);
    const lastPart = phone.substring(phone.length - 4);
    return `${firstPart}***${lastPart}`;
  };

  const updateWinnerStatus = async (id) => {
    try {
      await axios.get(
        `https://daftarhadir.sidoarjokab.go.id/api/changestatus-peserta-doorprize?id=${id}&status=1&hadiah=${prize}`,
        {
          headers: {
            Authorization: "fkngdfngndngfogmvo95t6509rjgr8u98-=p=-",
          },
        }
      );
      console.log("Status peserta berhasil diupdate");
    } catch (error) {
      console.error("Gagal mengupdate status peserta:", error);
    }
  };

  const getRandomName = () => {
    // Cek jika hadiah belum dipilih
    if (!prize) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 6000);
      return;
    }

    if (rolling || names.length === 0 || isRefreshing) return;

    setWinner(false);
    setRolling(true);
    setSelectedName("");
    setSelectedPhone("");
    setSelectedId(null);

    const duration = 4000;
    const startTime = Date.now();
    const targetIndex = Math.floor(Math.random() * names.length);

    const roll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const position = easeOut(progress, names.length * 3);
        setSlotPosition(position);
        requestAnimationFrame(roll);
      } else {
        const winnerData = names[targetIndex];
        setSlotPosition(targetIndex);
        setSelectedName(winnerData.nama);
        setSelectedPhone(winnerData.telp);
        setSelectedId(winnerData.id);
        setRolling(false);
        setWinner(true);

        if (winnerData.id) {
          updateWinnerStatus(winnerData.id);
        }

        // Auto-refresh data after 2 seconds
        setTimeout(() => {
          fetchData();
          setSelectedId(null);
          setWinner(false);
        }, 5000);
      }
    };

    requestAnimationFrame(roll);
  };

  const easeOut = (t, max) => {
    return max * (1 - Math.pow(1 - t, 3));
  };

  const visibleItems = names.slice(
    Math.floor(slotPosition % names.length),
    Math.floor(slotPosition % names.length) + 10
  );

  return (
    <div className="container text-center mt-5">
      {showToast && (
        <div className="toast-top-center">
          ⚠️ Silakan pilih hadiah terlebih dahulu!
        </div>
      )}
      <img src={sidoarjoImage} alt="Sidoarjo" className="img-fluid mb-3" />
      <h1>Acak Doorprize Peserta</h1>

      <div className="prize-selector-container">
        <div className="prize-selector-wrapper">
          <label className="prize-selector-label">
            <span className="prize-selector-icon">🎁</span>
            Pilih Hadiah:
          </label>
          <select
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            className="prize-selector-dropdown"
            disabled={rolling || isRefreshing}
          >
            <option value="" disabled hidden>
              -- Pilih Hadiah --
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
            <option value="tabungan delta arta 500k">💰 Tabungan Delta Arta @Rp.500.000</option>
            <option value="kominfo jatim 500k">💰 kominfo jatim 500k</option>
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
          <div className="prize-selector-arrow mt-3">▼</div>
        </div>
      </div>

      {isRefreshing && (
        <div className="text-info mb-3">Memperbarui data peserta...</div>
      )}

      <div className="slot-machine">
        <div className={`slot-window ${winner ? "hidden" : ""}`}></div>
        <div className={`slot-reel ${rolling ? "rolling" : ""}`}>
          <div
            className="slot-items"
            style={{ top: `-${(slotPosition % 1) * 60}px` }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={`${item.id || index}-${item.nama}`}
                className={`slot-item ${!rolling && selectedName === item.nama && winner ? "winner" : ""}`}
              >
                {item.nama}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="button mb-2"
        onClick={getRandomName}
        disabled={rolling || names.length === 0 || isRefreshing}
      >
        {rolling ? "Mengacak..." : "Acak Nama Pemenang"}
      </button>

      <div className="winner-container">
        {selectedName && (
          <>
            <div className="confetti-animation"></div>
            <div className="winner-header">
              <h2 className="winner-title">🎉 SELAMAT! 🎉</h2>
              <p className="winner-subtitle">
                Anda memenangkan {prize.toUpperCase()}!
              </p>
            </div>
          </>
        )}

        <div className="winner-card">
          <div className="winner-info">
            <div className="winner-row">
              <span className="winner-label">Nama Terpilih:</span>
              <span className="winner-value highlight">
                {selectedName || "---"}
              </span>
            </div>
            <div className="winner-row">
              <span className="winner-label">Nomor Telepon:</span>
              <span className="winner-value">
                {selectedPhone ? maskPhoneNumber(selectedPhone) : "---"}
              </span>
            </div>
          </div>

          {selectedName && (
            <div className="winner-footer">
              <p className="congrats-message">
                "Selamat atas kemenangan Anda! Hadiah akan segera dihubungi oleh
                panitia."
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
