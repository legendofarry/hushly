import React, { useEffect, useRef } from "react";
import lottie, { AnimationItem } from "lottie-web";

interface Props {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

const LottiePlayer: React.FC<Props> = ({
  path,
  loop = true,
  autoplay = true,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animation: AnimationItem | null = null;
    if (containerRef.current) {
      animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop,
        autoplay,
        path,
      });
    }
    return () => {
      animation?.destroy();
    };
  }, [path, loop, autoplay]);

  return <div ref={containerRef} className={className} />;
};

export default LottiePlayer;
