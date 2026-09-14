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
      <path d="M3 20h17" />
      <path d="M3 20 15.5 3" />
      <path d="M9 20a7 7 0 0 0-2.3-5.6" />
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
      <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(45 12 12)" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="13.6" cy="5.6" r="1.3" />
      <circle cx="5.6" cy="13.6" r="1.3" />
      <circle cx="19.1" cy="19.1" r="1.3" />
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
      <path d="M4 20h16" strokeDasharray="2 1.8" />
      <path d="M4 20 20 4" strokeDasharray="2 1.8" />
      <path d="M20 20V4" />
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
      <path d="M1.7 19 4 15 6.3 19Z" />
      <path d="M21.2 7 19 3 16.8 7Z" />
      <path d="M4.5 17 9.33 8.63" />
      <path d="M9.33 8.63 14.17 15.37" />
      <path d="M14.17 15.37 19 7" />
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
      <path d="M4 20h17" />
      <path d="M4 20V3" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M15 10.5V20" strokeDasharray="2 1.8" />
      <path d="M4 9h8.5" strokeDasharray="2 1.8" />
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
      <circle cx="5" cy="14.2" r="1.5" />
      <path d="M2.9 21 5 13 7.1 21" />
      <circle cx="19" cy="4.2" r="1.5" />
      <path d="M16.9 11 19 3 21.1 11" />
      <path d="M6.5 13.2 17.5 5.3" />
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
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15.472" />
      <path d="M9 3.236v15.472" />
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
      <path d="M2.65 18.27 21.35 18.27" />
      <path d="M9.25 1.50 14.75 1.50 14.75 15.48 12.00 23.00 9.25 15.48Z" />
      <path d="M9.25 11.82 14.75 11.82 14.75 15.48 12.00 23.00 9.25 15.48Z" fill={color} stroke="none" />
      <path d="M9.25 10.32 14.75 11.86" />
      <path d="M9.25 12.64 14.75 14.19" />
    </svg>
  );
});

// Υπολογισμοί — θεμελιώδη προβλήματα icon set.
export const Themeliodes1Icon = forwardRef(function Themeliodes1Icon(
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
      <circle cx="4" cy="22" r="1.6" fill="#ffffff" />
      <path d="M4 22V6" strokeDasharray="0.1 2.6" />
      <path d="M4 22 20 5" />
      <circle cx="20" cy="5" r="1.6" />
      <path d="M4 15 A7 7 0 0 1 8.8 16.9" />
    </svg>
  );
});

export const Themeliodes2Icon = forwardRef(function Themeliodes2Icon(
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
      <circle cx="4" cy="22" r="1.6" fill="#ffffff" />
      <path d="M4 22V6" strokeDasharray="0.1 2.6" />
      <path d="M4 22 20 5" strokeDasharray="0.1 2.6" />
      <circle cx="20" cy="5" r="1.6" fill="#ffffff" />
      <path d="M4 15 A7 7 0 0 1 8.8 16.9" />
    </svg>
  );
});

export const Themeliodes3Icon = forwardRef(function Themeliodes3Icon(
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
      <circle cx="2" cy="22" r="1" fill="#ffffff" />
      <path d="M2 22V7" strokeDasharray="0.1 2.2" />
      <path d="M2 22 10.5 13.5" />
      <circle cx="10.5" cy="13.5" r="1" />
      <circle cx="10.5" cy="13.5" r="1" fill="#ffffff" />
      <path d="M10.5 13.5V4" strokeDasharray="0.1 2.2" />
      <path d="M10.5 13.5 19 5" />
      <circle cx="19" cy="5" r="1" />
    </svg>
  );
});

export const EmprosthotomiaIcon = forwardRef(function EmprosthotomiaIcon(
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
      <path d="M3.5 5.1 21.7 10.1 8.4 21.8Z" />
      <circle cx="3.5" cy="5.1" r="1.5" fill="#ffffff" />
      <circle cx="21.7" cy="10.1" r="1.5" fill="#ffffff" />
      <circle cx="8.4" cy="21.8" r="1.5" />
    </svg>
  );
});

export const OpisthotomiaIcon = forwardRef(function OpisthotomiaIcon(
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
      <path d="M3.5 5.1 21.7 10.1 8.4 21.8Z" />
      <circle cx="3.5" cy="5.1" r="1.5" fill="#ffffff" />
      <circle cx="21.7" cy="10.1" r="1.5" fill="#ffffff" />
      <circle cx="8.4" cy="21.8" r="1.5" fill="#ffffff" />
      <circle cx="11.2" cy="12.3" r="1.4" />
    </svg>
  );
});

export const SyntelestisKlimakasMIcon = forwardRef(function SyntelestisKlimakasMIcon(
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
      <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
      <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" />
      <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
});

// Bottom-nav icon set — Θεμελιώδη, Αλληλοτομίες, Συντελεστής Κλίμακας.
export const ThemeliodiIcon = forwardRef(function ThemeliodiIcon(
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
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
});

export const AllilotomiesIcon = forwardRef(function AllilotomiesIcon(
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
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <path d="M12 2v3.5" />
      <path d="M12 18.5V22" />
      <path d="M2 12h3.5" />
      <path d="M18.5 12H22" />
    </svg>
  );
});

export const SyntelestisKlimakasIcon = forwardRef(function SyntelestisKlimakasIcon(
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
      <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
      <path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17" />
      <path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
});