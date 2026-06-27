import React, { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "motion/react";

interface ParallaxTiltCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  wrapperClassName?: string;
  key?: string | number;
}

export default function ParallaxTiltCard({ children, onClick, className = "", wrapperClassName = "" }: ParallaxTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Create motion values for tracking relative mouse coordinates
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Smooth out coordinate tracking using springs
  const springConfig = { damping: 25, stiffness: 180, mass: 0.6 };
  const rotateXSpring = useSpring(useTransform(y, [0, 1], [10, -10]), springConfig);
  const rotateYSpring = useSpring(useTransform(x, [0, 1], [-10, 10]), springConfig);
  const scaleSpring = useSpring(1, springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate relative mouse position (0 to 1)
    const relativeX = (event.clientX - rect.left) / width;
    const relativeY = (event.clientY - rect.top) / height;
    
    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseEnter = () => {
    scaleSpring.set(1.03);
  };

  const handleMouseLeave = () => {
    // Reset back to center and initial scale
    x.set(0.5);
    y.set(0.5);
    scaleSpring.set(1.0);
  };

  return (
    <div
      className={wrapperClassName}
      style={{
        perspective: "1000px", // Enables 3D space perspective
      }}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          scale: scaleSpring,
          transformStyle: "preserve-3d", // Keeps child elements in the rotated 3D space
        }}
        className={`transition-shadow duration-300 ${className}`}
      >
        <div className="h-full w-full" style={{ transform: "translateZ(10px)", transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
