import React, { useEffect, useRef } from 'react';

interface Props {
  landmarks?: { x: number; y: number; z?: number }[];
  detectedPose?: string;
  fps?: number;
}

const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 17]                               // Palm base
];

const FINGER_NAMES: Record<number, string> = {
  4: 'THUMB', 8: 'INDEX', 12: 'MIDDLE', 16: 'RING', 20: 'PINKY'
};

export const HandSkeletonCanvas: React.FC<Props> = ({ landmarks, detectedPose = 'NONE', fps = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, width, height);

    // Draw Working Area Bounds Box Overlay (Default 0.2 to 0.8)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(width * 0.2, height * 0.2, width * 0.6, height * 0.6);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.font = '9px monospace';
    ctx.fillText('WORKING AREA BOUNDS', width * 0.2 + 6, height * 0.2 + 12);

    if (!landmarks || landmarks.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO HAND DETECTED', width / 2, height / 2);
      return;
    }

    // Convert landmarks to canvas pixels
    const pts = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height
    }));

    // Calculate bounding box
    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));

    // Calculate Palm Center (Average of wrist 0, index MCP 5, pinky MCP 17)
    const palmX = (pts[0].x + pts[5].x + pts[17].x) / 3;
    const palmY = (pts[0].y + pts[5].y + pts[17].y) / 3;

    // Draw Bounding Box
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(minX - 12, minY - 12, (maxX - minX) + 24, (maxY - minY) + 24);
    ctx.setLineDash([]);

    // Draw Connections
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    CONNECTIONS.forEach(([i, j]) => {
      if (pts[i] && pts[j]) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        ctx.stroke();
      }
    });

    // Draw Palm Center Node
    ctx.beginPath();
    ctx.arc(palmX, palmY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('PALM CENTER', palmX + 10, palmY + 3);

    // Draw Joint Nodes & Labels
    pts.forEach((p, idx) => {
      const isTip = FINGER_NAMES[idx] !== undefined;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isTip ? 6 : 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#4ade80' : '#e879f9';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isTip) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(FINGER_NAMES[idx], p.x + 8, p.y - 4);
      }
    });

    // Draw Filtered & Predicted Index Tip Indicators
    const indexTip = pts[8];
    ctx.beginPath();
    ctx.arc(indexTip.x, indexTip.y, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.fillText('ACTIVE TIP (FILTERED)', indexTip.x + 12, indexTip.y + 12);

    // Active Gesture & Performance Overlay Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(8, 8, 160, 28);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(8, 8, 160, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`POSE: ${detectedPose}`, 14, 26);

  }, [landmarks, detectedPose]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-purple-500/30 bg-black shadow-lg">
      <canvas ref={canvasRef} width={400} height={260} className="w-full h-auto block" />
    </div>
  );
};
