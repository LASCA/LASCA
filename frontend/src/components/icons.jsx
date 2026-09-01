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
      <path d="M6 20h12" />
      <path d="M9 20v-3h6v3" />
      <rect x="5" y="6" width="14" height="8" rx="1.5" />
      <path d="M9 14v3" />
      <path d="M15 14v3" />
      <path d="M12 3v3" />
      <circle cx="12" cy="10" r="1.6" />
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
      <path d="M12 12 5.6 6.6" />
      <path d="M12 12l6.6-4.2" />
      <path d="M12 12l-4 6.6" />
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="4.5" cy="5.5" r="1.5" />
      <circle cx="19.5" cy="6.9" r="1.5" />
      <circle cx="7.2" cy="19.6" r="1.5" />
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
      <path d="M3 19h8" />
      <path d="M13 8h8" />
      <path d="M12 17.4V9.6" />
      <path d="M9.8 11.8 12 9.6l2.2 2.2" />
      <path d="M9.8 15.2 12 17.4l2.2-2.2" />
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
      <path d="M5 19V3" />
      <path d="M3.2 4.8 5 3l1.8 1.8" />
      <path d="M5 19 7.2 16.9" />
      <path d="M9.6 14.6 12.4 11.9" />
      <path d="M14.8 9.6 17 7.5" />
      <path d="M17.4 13V3.6" />
      <path d="M17.4 3.8000000000000003 23.7 6.7L17.4 9.5" />
      <path d="M5 13a6 6 0 0 1 4.3 1.8" />
    </svg>
  );
});
