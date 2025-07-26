import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const symbolRef = useRef([]);
  const count = 20;
  const symbols = [
    "$",
    "₹",
    "¥",
    "€",
    "Ξ",
    "₮",
    "₩",
    "₽",
    "£",
    "₱",
    "₫",
    "₦",
    "₲",
    "₵",
    "₣",
    "₡",
    "₭",
    "₮",
    "₯",
  ];
  const velocities = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    symbolRef.current = symbolRef.current.slice(0, count);
    velocities.current = Array.from({ length: count }, () => ({
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
    }));

    let animationId;
    const animate = () => {
      symbolRef.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const parent = el.parentElement.getBoundingClientRect();

        let left = parseFloat(el.style.left) || 0;
        let top = parseFloat(el.style.top) || 0;

        left += velocities.current[i].dx;
        top += velocities.current[i].dy;

        if (left <= 0 || left + rect.width >= parent.width) {
          velocities.current[i].dx *= -1;
        }
        if (top <= 0 || top + rect.height >= parent.height) {
          velocities.current[i].dy *= -1;
        }

        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const dotParticles = Array.from({ length: 50 }, (_, i) => {
    const colors = [
      "rgba(239, 68, 68, 0.7)", // Red
      "rgba(34, 197, 94, 0.7)", // Green
      "rgba(59, 130, 246, 0.7)", // Blue
      "rgba(168, 85, 247, 0.7)", // Purple
      "rgba(249, 115, 22, 0.7)", // Orange
      "rgba(236, 72, 153, 0.7)", // Pink
      "rgba(14, 165, 233, 0.7)", // Light blue
      "rgba(234, 179, 8, 0.7)", // Yellow
    ];

    return {
      id: `dot-${i}`,
      size: Math.random() * 12 + 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 10,
      animationDuration: Math.random() * 10 + 15,
      initialColor: colors[Math.floor(Math.random() * colors.length)],
      animationType: Math.random() > 0.3 ? "pulse" : "float",
    };
  });

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center text-center px-4">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-300 to-blue-400 bg-[length:300%_300%] animate-[gradientMove_10s_ease-in-out_infinite] z-0" />

      {/* Dot Particles */}
      {dotParticles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.initialColor,
            boxShadow: "0 0 15px rgba(255, 255, 255, 0.4)",
            animation:
              p.animationType === "float"
                ? `float ${p.animationDuration}s linear infinite, colorShift ${
                    p.animationDuration * 0.8
                  }s ease-in-out infinite`
                : `pulse ${
                    p.animationDuration * 0.6
                  }s ease-in-out infinite, float ${
                    p.animationDuration
                  }s linear infinite`,
            animationDelay: `0s, ${p.animationDelay}s`,
            opacity: 0.7 + Math.random() * 0.3,
          }}
        />
      ))}

      {/* Symbol Particles */}
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`sym-${i}`}
          ref={(el) => (symbolRef.current[i] = el)}
          className="absolute font-bold text-2xl pointer-events-none select-none drop-shadow"
          style={{
            left: `${Math.random() * window.innerWidth}px`,
            top: `${Math.random() * window.innerHeight}px`,
            color: ["#ef4444", "#22c55e", "#a855f7", "#f97316"][i % 4],
          }}
        >
          {symbols[i % symbols.length]}
        </div>
      ))}

      {/* Main Text and Button */}
      <div className="z-10 pointer-events-auto">
        <h1
          className="text-5xl md:text-6xl font-extrabold text-slate-800 animate-fadeInBottom mb-4"
          style={{ fontFamily: "Poppins, Inter, sans-serif" }}
        >
          Welcome to StockPlay
        </h1>
        <p
          className="text-lg md:text-xl text-slate-600 mt-4 mb-10 animate-fadeInUp"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Learn better Stock Investing
        </p>
        <button
          className="text-lg px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:scale-105 hover:shadow-xl shadow-lg transition-transform duration-300 ease-in-out"
          onClick={() => navigate("/login")}
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Let's Start
        </button>
      </div>

      {/* Custom Keyframes */}
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 0%; }
          25% { background-position: 50% 25%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 75%; }
          100% { background-position: 0% 100%; }
        }
        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
          25% { transform: translate(30px, -20px) rotate(90deg); opacity: 1; }
          50% { transform: translate(-15px, 25px) rotate(180deg); opacity: 0.8; }
          75% { transform: translate(25px, -30px) rotate(270deg); opacity: 1; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 0.7; }
        }
        @keyframes colorShift {
          0% { background-color: rgba(239, 68, 68, 0.7); }
          25% { background-color: rgba(34, 197, 94, 0.7); }
          50% { background-color: rgba(168, 85, 247, 0.7); }
          75% { background-color: rgba(249, 115, 22, 0.7); }
          100% { background-color: rgba(239, 68, 68, 0.7); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        @keyframes fadeInBottom {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInBottom {
          animation: fadeInBottom 1s ease-out forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
