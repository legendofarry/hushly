import React, { useEffect, useMemo, useState } from "react";

interface Props {
  src?: string | null;
  progress?: number;
  bars?: number;
  className?: string;
}

const AudioWaveform: React.FC<Props> = ({
  src,
  progress = 0,
  bars = 28,
  className,
}) => {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setPeaks([]);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    const decode = async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const samplesPerBar = Math.floor(channelData.length / bars);
        const nextPeaks: number[] = [];
        for (let i = 0; i < bars; i += 1) {
          let max = 0;
          const start = i * samplesPerBar;
          const end = Math.min(start + samplesPerBar, channelData.length);
          for (let j = start; j < end; j += 1) {
            const value = Math.abs(channelData[j]);
            if (value > max) {
              max = value;
            }
          }
          nextPeaks.push(max);
        }
        await audioContext.close();
        if (!cancelled) {
          setPeaks(nextPeaks);
          setLoadFailed(false);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setLoadFailed(true);
          setPeaks([]);
        }
      }
    };

    void decode();

    return () => {
      cancelled = true;
    };
  }, [src, bars]);

  const normalizedPeaks = useMemo(() => {
    if (!peaks.length) return [];
    const max = Math.max(...peaks, 1);
    return peaks.map((value) => Math.max(0.08, value / max));
  }, [peaks]);

  if (!src || loadFailed) {
    return (
      <div
        className={`h-12 rounded-2xl bg-white/5 border border-white/10 ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`flex items-end gap-[3px] h-12 ${className ?? ""}`}
      aria-hidden="true"
    >
      {normalizedPeaks.map((value, index) => {
        const active = progress >= (index + 1) / normalizedPeaks.length;
        return (
          <div
            key={`wave-${index}`}
            className={`flex-1 rounded-full transition-colors ${
              active ? "bg-kipepeo-pink" : "bg-white/10"
            }`}
            style={{ height: `${value * 100}%` }}
          />
        );
      })}
    </div>
  );
};

export default AudioWaveform;
