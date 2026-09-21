import { useEffect, useRef } from "react";

/**
 * AudioVisualizer — canvas-based waveform bar visualizer.
 * When isMicActive is true, animates bars to simulate mic activity.
 * When status is SPEAKING, animates differently for agent output.
 */
export function AudioVisualizer({ isMicActive, status }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const barsRef = useRef([]);

  const NUM_BARS = 32;
  const isActive =
    isMicActive || status === "SPEAKING" || status === "THINKING";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize bar heights
    if (barsRef.current.length === 0) {
      barsRef.current = Array.from({ length: NUM_BARS }, () => ({
        height: 2,
        velocity: 0,
        target: 2,
      }));
    }

    const animate = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barWidth = (W / NUM_BARS) * 0.6;
      const gap = (W / NUM_BARS) * 0.4;

      barsRef.current.forEach((bar, i) => {
        if (isActive) {
          // Stagger animation
          if (Math.random() < 0.15) {
            const intensity = status === "SPEAKING" ? 1.2 : 0.8;
            bar.target =
              4 +
              Math.abs(Math.sin((Date.now() / 400 + i * 0.8) * 1.5)) *
                (H * 0.7 * intensity) *
                (0.5 + Math.random() * 0.5);
          }
        } else {
          bar.target = 2;
        }

        // Smooth lerp toward target
        bar.height += (bar.target - bar.height) * 0.18;

        const x = i * (barWidth + gap) + gap / 2;
        const y = (H - bar.height) / 2;

        // Gradient color based on status
        let color1, color2;
        if (status === "SPEAKING") {
          color1 = "#a78bfa";
          color2 = "#7c3aed";
        } else if (status === "LISTENING") {
          color1 = "#34d399";
          color2 = "#059669";
        } else if (status === "THINKING") {
          color1 = "#fbbf24";
          color2 = "#d97706";
        } else {
          color1 = "#4b5563";
          color2 = "#374151";
        }

        const gradient = ctx.createLinearGradient(x, y, x, y + bar.height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(bar.height, 2), 3);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, status]);

  return (
    <div className="audio-visualizer" aria-label="Audio activity visualizer">
      <canvas ref={canvasRef} width={280} height={60} />
    </div>
  );
}
