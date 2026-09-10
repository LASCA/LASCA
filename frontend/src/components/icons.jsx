// Survey icon pack — drop-in replacements for the lucide-react icons.
// 24x24 grid, 2px stroke, round caps/joins. Default color: #ffffff.
// Same props as lucide-react: size, color, strokeWidth, className, onClick, ...
import { forwardRef } from "react";

export const DashboardIcon = forwardRef(function DashboardIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
});


export const MetriseisStathmouIcon = forwardRef(function MetriseisStathmouIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 8V19H8.5V17.8H15.5V19H19V8L15.5 2H8.5Z" />
      <rect x="5" y="22" width="14" height="0.7" rx="0.2" />
      <path d="M9.3 5H14.7L16.4 9H7.6Z" />
      <circle cx="12" cy="13" r="2.2" />
    </svg>
  );
});

export const GoniometriseisIcon = forwardRef(function GoniometriseisIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 19h16" />
      <path d="M4 19 17 7" />
      <path d="M11 19a7 7 0 0 0-1.9-4.8" />
    </svg>
  );
});

export const SynorthosiStathmouIcon = forwardRef(function SynorthosiStathmouIcon(
  { size = 24, color = "currentColor", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Περιστραμμένη Έλλειψη Σφάλματος */}
      <ellipse cx="12" cy="12" rx="8" ry="4" transform="rotate(-30 12 12)" strokeDasharray="2 2" />
      
      {/* Κεντρικό συνορθωμένο σημείο */}
      <circle cx="12" cy="12" r="2" fill={color} />
      
      {/* Άξονες ακρίβειας */}
      <path d="M12 4v3" />
      <path d="M12 17v3" />
      <path d="M4 12h3" />
      <path d="M17 12h3" />
    </svg>
  );
});

export const TrigonometrikiYpsometriaIcon = forwardRef(function TrigonometrikiYpsometriaIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 19h16" />
      <path d="M20 19V6" />
      <path d="M4 19 20 6" />
      <path d="M10 19a6 6 0 0 0-1.1-3.5" />
    </svg>
  );
});

export const GeometrikiChorostathmisiIcon = forwardRef(function GeometrikiChorostathmisiIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="9" y="2" width="6" height="20" rx="1" />
      <path d="M9 6h3" />
      <path d="M9 10h3" />
      <path d="M9 14h3" />
      <path d="M9 18h3" />
    </svg>
  );
});

export const VasikoiYpologismoiIcon = forwardRef(function VasikoiYpologismoiIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M8 19h.01M12 19h.01" />
      <path d="M16 15v4" />
    </svg>
  );
});

export const OdefsiIcon = forwardRef(function OdefsiIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 20 9 11 15 15 20 5" />
      <circle cx="4" cy="20" r="1.5" />
      <circle cx="9" cy="11" r="1.5" />
      <circle cx="15" cy="15" r="1.5" />
      <path d="M17.6 5.9 20 5l.9 2.4" />
    </svg>
  );
});

export const OrizontiografiaXYIcon = forwardRef(function OrizontiografiaXYIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 3v17h17" />
      <circle cx="14" cy="10" r="1.8" />
      <path d="M14 11.8V20" />
      <path d="M12.2 10H4" />
    </svg>
  );
});

export const YpsometriaHIcon = forwardRef(function YpsometriaHIcon(
  { size = 24, color = "currentColor", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Σταθμοί & Όδευση */}
      <circle cx="5" cy="18" r="1.5" fill={color} />
      <circle cx="13" cy="6" r="1.5" fill={color} />
      <path d="M 5 18 L 13 6" />

      {/* Οριζόντιες προβολές (πιο αραιό dash για αποφυγή οπτικού θορύβου) */}
      <path d="M 15 6 H 20" strokeDasharray="2 3" />
      <path d="M 7 18 H 20" strokeDasharray="2 3" />

      {/* Κάθετη γραμμή διάστασης */}
      <path d="M 19 6 V 18" />
      
      {/* Ticks διάστασης (Αντί για βέλη) */}
      <path d="M 17.5 6 H 20.5" />
      <path d="M 17.5 18 H 20.5" />
    </svg>
  );
});

export const TachymetriaIcon = forwardRef(function TachymetriaIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 19V3" />
      <path d="M3.2 4.8 5 3l1.8 1.8" />
      <path d="M5 19 7.2 16.9" />
      <path d="M9.6 14.6 12.4 11.9" />
      <path d="M14.8 9.6 17 7.5" />
      <circle cx="18.4" cy="6.2" r="1.6" />
      <path d="M5 13a6 6 0 0 1 4.3 1.8" />
    </svg>
  );
});

export const CharaxiIcon = forwardRef(function CharaxiIcon(
  { size = 24, color = "#ffffff", strokeWidth = 2, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Σημαία Χάραξης / Σηματόσημο */}
      <path d="M12 3l7 3.5-7 3.5" />

      {/* Κορμός Πασσάλου */}
      <path d="M12 3v14" />

      {/* Μυτερή Άκρη Πασσάλου */}
      <path d="M10.5 17l1.5 3.5 1.5-3.5" />

      {/* Γραμμή Εδάφους */}
      <path d="M5 20.5h14" />
    </svg>
  );
});