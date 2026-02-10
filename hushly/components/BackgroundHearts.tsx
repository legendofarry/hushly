import React, { useMemo } from "react";

const BackgroundHearts: React.FC = () => {
  const hearts = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return [];
    }
    const width = typeof window !== "undefined" ? window.innerWidth : 1024;
    const count = width < 480 ? 50 : width < 768 ? 80 : 120;
    return [...Array(count)].map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * -30}s`,
      duration: `${18 + Math.random() * 18}s`,
      size: `${8 + Math.random() * 14}px`,
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

export default React.memo(BackgroundHearts);
