import React, { useMemo } from 'react';

const BackgroundHearts: React.FC = () => {
  // We generate 300 hearts with random positions, delays, and durations
  const hearts = useMemo(() => {
    return [...Array(300)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * -30}s`, // Negative delay so some start midway
      duration: `${15 + Math.random() * 20}s`,
      size: `${8 + Math.random() * 16}px`
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((h) => (
        <div
          key={h.id}
          className="bg-heart-particle"
          style={{
            '--left': h.left,
            '--delay': h.delay,
            '--dur': h.duration,
            '--size': h.size
          } as React.CSSProperties}
        >
          <i className="fa-solid fa-heart"></i>
        </div>
      ))}
    </div>
  );
};

export default BackgroundHearts;