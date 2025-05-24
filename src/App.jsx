import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import sidoarjoImage from '../public/sidoarjo.png';

const App = () => {
  const [names, setNames] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState(false);
  const [slotPosition, setSlotPosition] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'https://daftarhadir.sidoarjokab.go.id/api/get-peserta-doorprize?menerima=semua',
          {
            headers: {
              'Authorization': 'fkngdfngndngfogmvo95t6509rjgr8u98-=p=-'
            }
          }
        );
        setNames(response.data.data || []); // Assuming the data is in response.data.data
      } catch (error) {
        console.error('Error fetching data:', error);
        setNames([]);
      }
    };
    fetchData();
  }, []);

  const getRandomName = () => {
    if (rolling || names.length === 0) return;

    setWinner(false);
    setRolling(true);
    setSelectedName('');
    setSelectedPhone('');

    const duration = 3000;
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
        setSlotPosition(targetIndex);
        setSelectedName(names[targetIndex].nama);
        setSelectedPhone(names[targetIndex].telp);
        setRolling(false);
        setWinner(true);
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
      <img src={sidoarjoImage} alt="Sidoarjo" className="img-fluid mb-3" />
      <h1>Acak Doorprize Peserta</h1>

      <div className="slot-machine">
        <div className={`slot-window ${winner ? 'hidden' : ''}`}></div>
        <div className={`slot-reel ${rolling ? 'rolling' : ''}`}>
          <div
            className="slot-items"
            style={{ top: `-${(slotPosition % 1) * 60}px` }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={`${item.id || index}-${item.nama}`}
                className={`slot-item ${!rolling && selectedName === item.nama && winner ? 'winner' : ''}`}
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
        disabled={rolling || names.length === 0}
      >
        {rolling ? 'Mengacak...' : 'Acak Nama Pemenang'}
      </button>
      <h2>Nama Terpilih: <span className="text-success">{selectedName || '---'}</span></h2>
      <h2>Nomor Telepon: <span className="text-success">{selectedPhone || '---'}</span></h2>
    </div>
  );
};

export default App;