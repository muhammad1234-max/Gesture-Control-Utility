import React, { useEffect, useRef, memo } from 'react';

interface HandVisualizerProps {
  landmarks?: { x: number; y: number }[];
  width?: number;
  height?: number;
}

function HandVisualizerComponent({ landmarks, width = 200, height = 200 }: HandVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0) return;

    // MediaPipe Hand Connections (simplified skeleton)
    const connections = [
      [0,1],[1,2],[2,3],[3,4], // Thumb
      [0,5],[5,6],[6,7],[7,8], // Index
      [5,9],[9,10],[10,11],[11,12], // Middle
      [9,13],[13,14],[14,15],[15,16], // Ring
      [13,17],[0,17],[17,18],[18,19],[19,20] // Pinky & Palm
    ];

    // Draw connections (bones)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Emerald 500 with opacity
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Draw landmarks (joints)
    ctx.fillStyle = '#10b981'; // Emerald 500
    landmarks.forEach((lm) => {
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [landmarks, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="absolute inset-0 w-full h-full"
    />
  );
}

export const HandVisualizer = memo(HandVisualizerComponent);
