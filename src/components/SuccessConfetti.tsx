import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface ConfettiPiece {
  id: number;
  size: number;
  color: string;
  isCircle: boolean;
  startX: number;
  midX: number;
  endX: number;
  startY: number;
  midY: number;
  endY: number;
  duration: number;
  delay: number;
  rotation: number;
}

export default function SuccessConfetti({ active, type = "cascade" }: { active: boolean; type?: "cascade" | "burst" }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return;
    }

    const premiumColors = [
      "#9A7B4F", // Matte Antique Brass/Gold
      "#151912", // Midnight Olive
      "#41463D", // Charcoal Olive
      "#DFDBCE", // Platinum Silver-Gold
      "#F4F2EA", // Warm Cream
    ];

    const generatePieces = () => {
      const count = type === "burst" ? 80 : 60;
      return Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 8 + (type === "burst" ? 6 : 8); // size in pixels
        const color = premiumColors[Math.floor(Math.random() * premiumColors.length)];
        const isCircle = Math.random() > 0.55;
        const delay = Math.random() * (type === "burst" ? 0.2 : 1.2);
        const duration = Math.random() * 2 + (type === "burst" ? 1.5 : 3.5);

        let startX = 0;
        let midX = 0;
        let endX = 0;
        let startY = 0;
        let midY = 0;
        let endY = 0;

        if (type === "burst") {
          // Burst outwards from center of screen
          startX = 50; // starts at 50% width
          startY = 50; // starts at 50% height
          
          const angle = Math.random() * Math.PI * 2;
          const distance = 15 + Math.random() * 35; // displacement
          
          midX = 50 + Math.cos(angle) * (distance * 0.6);
          endX = 50 + Math.cos(angle) * distance + (Math.random() - 0.5) * 10;
          
          midY = 50 + Math.sin(angle) * (distance * 0.6) - 10; // offset upwards first
          endY = 50 + Math.sin(angle) * distance + 25 + Math.random() * 15; // fall due to gravity
        } else {
          // Cascade downwards from top of screen
          startX = Math.random() * 100;
          midX = startX + (Math.random() - 0.5) * 15;
          endX = midX + (Math.random() - 0.5) * 20;

          startY = -10;
          midY = 40 + Math.random() * 20;
          endY = 110; // fall offscreen
        }

        return {
          id: i,
          size,
          color,
          isCircle,
          startX,
          midX,
          endX,
          startY,
          midY,
          endY,
          duration,
          delay,
          rotation: Math.random() * 720 - 360,
        };
      });
    };

    setPieces(generatePieces());

    // Auto cleanup after the animation finishes
    const cleanupTime = type === "burst" ? 3800 : 6500;
    const timer = setTimeout(() => {
      setPieces([]);
    }, cleanupTime);

    return () => clearTimeout(timer);
  }, [active, type]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{
              x: `${piece.startX}vw`,
              y: `${piece.startY}vh`,
              rotate: 0,
              opacity: 0,
              scale: 0.1,
            }}
            animate={{
              x: [`${piece.startX}vw`, `${piece.midX}vw`, `${piece.endX}vw`],
              y: [`${piece.startY}vh`, `${piece.midY}vh`, `${piece.endY}vh`],
              rotate: piece.rotation,
              opacity: [0, 1, 1, 0.8, 0],
              scale: [0.2, 1, 1, 0.8, 0.3],
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: type === "burst" ? "easeOut" : "easeInOut",
            }}
            style={{
              position: "absolute",
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: piece.isCircle ? "50%" : "2px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
