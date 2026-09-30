"use client";

import React from "react";
import styles from "./StatsCard.module.css";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: string; // Hex color code
  progress?: number; // Optional progress percentage (0-100)
  footerText?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = "#F7340C",
  progress,
  footerText
}) => {
  // Convert hex color to rgba for transparency glows
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const glowColor = hexToRgba(color, 0.15);
  const lightGlowColor = hexToRgba(color, 0.04);

  return (
    <div 
      className="glass-card styles.card" 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        justifyContent: "space-between",
        minHeight: "130px",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        transition: "all var(--transition-normal)"
      }}
    >
      {/* Decorative Glow */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "120px",
          height: "120px",
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
          borderRadius: "50%",
          transform: "translate(30%, -30%)",
          pointerEvents: "none"
        }}
      />

      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <div 
          className={styles.iconContainer}
          style={{ 
            color: color,
            background: lightGlowColor,
            borderColor: hexToRgba(color, 0.2)
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        
        {progress !== undefined && (
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBar} 
              style={{ 
                width: `${progress}%`,
                backgroundColor: color
              }}
            />
          </div>
        )}

        {(trend || footerText) && (
          <div className={styles.footer}>
            {trend && (
              <span className={trend.isPositive ? styles.trendUp : styles.trendDown}>
                {trend.isPositive ? <ArrowUpRight size={14} style={{ display: "inline", verticalAlign: "middle" }} /> : <ArrowDownRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />}
                {trend.value}
              </span>
            )}
            <span>{footerText || (trend ? "vs hora anterior" : "")}</span>
          </div>
        )}
      </div>
    </div>
  );
};
