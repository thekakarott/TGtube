import { useEffect, useRef } from "react";

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  height?: number;
}

export default function Visualizer({ audioRef, height = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    let actx: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaElementAudioSourceNode;
    let dataArray: Uint8Array<ArrayBuffer>;
    let connected = false;

    const init = async () => {
      try {
        actx = new AudioContext();
        await actx.resume();
        analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        source = actx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(actx.destination);
        connected = true;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        draw();
      } catch {
        // silently fail - visualizer just won't show
      }
    };

    const draw = () => {
      if (!ctx2d || !canvas || !connected) return;
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const bars = dataArray.length;
      const barWidth = (w / bars) * 2;
      let x = 0;

      for (let i = 0; i < bars; i++) {
        const barHeight = (dataArray[i] / 255) * h;
        const green = Math.round(185 + (dataArray[i] / 255) * 70);
        ctx2d.fillStyle = `rgba(29, ${green}, 84, 0.8)`;
        ctx2d.fillRect(x, h - barHeight, barWidth - 1, barHeight);
        x += barWidth;
        if (x > w) break;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    // Only init if audio is already playing or user has interacted
    if (audio.readyState >= 2) {
      init();
    } else {
      const onPlay = () => { init(); audio.removeEventListener("play", onPlay); };
      audio.addEventListener("play", onPlay);
      return () => {
        audio.removeEventListener("play", onPlay);
        cancelAnimationFrame(animRef.current);
      };
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      try { source?.disconnect(); } catch {}
    };
  }, [audioRef]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-sm)",
        opacity: 0.7,
      }}
    />
  );
}