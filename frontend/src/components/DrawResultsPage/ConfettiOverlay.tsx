import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface ConfettiOverlayProps {
  show: boolean;
  onDismiss: () => void;
}

export default function ConfettiOverlay({ show, onDismiss }: ConfettiOverlayProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);

    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      onClick={() => {
        setIsVisible(false);
        onDismiss();
      }}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-4">
        <div
          className={`text-6xl ${!prefersReducedMotion ? 'animate-bounce' : ''}`}
        >
          <Sparkles className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
        </div>
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">
          Draw Finalized!
        </h2>
      </div>

      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          <Confetti />
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-pulse"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: ['#fbbf24', '#f59e0b', '#d97706', '#10b981', '#3b82f6'][
              Math.floor(Math.random() * 5)
            ],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `fall ${piece.duration}s linear ${piece.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
