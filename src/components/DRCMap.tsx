import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProvinceData {
  name: string;
  tension: number;
  explanation?: string;
}

interface DRCMapProps {
  provinces: ProvinceData[];
  selectedProvince: string | null;
  onSelectProvince: (name: string) => void;
}

// SVG paths for DRC's 26 provinces (viewBox 0 0 500 550)
const provincePaths: Record<string, { d: string; labelX: number; labelY: number }> = {
  "Bas-Uélé": { d: "M280,30 L340,25 L380,40 L390,70 L370,90 L330,95 L290,85 L270,60 Z", labelX: 330, labelY: 60 },
  "Haut-Uélé": { d: "M380,40 L440,30 L480,50 L485,80 L460,100 L420,95 L390,70 Z", labelX: 435, labelY: 65 },
  "Nord-Ubangi": { d: "M120,30 L180,20 L220,35 L230,60 L200,75 L150,70 L115,55 Z", labelX: 170, labelY: 48 },
  "Sud-Ubangi": { d: "M90,55 L115,55 L150,70 L200,75 L195,105 L160,115 L110,105 L80,80 Z", labelX: 140, labelY: 88 },
  "Mongala": { d: "M200,75 L230,60 L280,60 L290,85 L275,110 L240,115 L195,105 Z", labelX: 240, labelY: 88 },
  "Tshopo": { d: "M290,85 L330,95 L370,90 L400,110 L395,150 L360,165 L310,155 L275,130 L275,110 Z", labelX: 335, labelY: 125 },
  "Ituri": { d: "M390,70 L420,95 L460,100 L470,130 L445,155 L410,145 L400,110 L370,90 Z", labelX: 430, labelY: 115 },
  "Équateur": { d: "M110,105 L160,115 L195,105 L240,115 L250,145 L220,170 L170,175 L130,160 L100,130 Z", labelX: 170, labelY: 140 },
  "Tshuapa": { d: "M170,175 L220,170 L250,145 L275,130 L310,155 L300,190 L260,200 L220,195 L185,190 Z", labelX: 240, labelY: 175 },
  "Maniema": { d: "M310,155 L360,165 L395,150 L410,180 L400,220 L370,240 L330,235 L300,210 L300,190 Z", labelX: 355, labelY: 195 },
  "Nord-Kivu": { d: "M410,145 L445,155 L460,180 L455,215 L435,235 L410,230 L400,220 L410,180 Z", labelX: 433, labelY: 195 },
  "Sud-Kivu": { d: "M400,220 L410,230 L435,235 L440,265 L425,290 L400,285 L385,260 L370,240 Z", labelX: 415, labelY: 260 },
  "Sankuru": { d: "M220,195 L260,200 L300,210 L300,240 L275,265 L240,260 L210,240 L200,215 Z", labelX: 252, labelY: 230 },
  "Kasaï": { d: "M130,220 L170,210 L200,215 L210,240 L200,270 L170,285 L135,275 L115,250 Z", labelX: 165, labelY: 250 },
  "Kasaï-Central": { d: "M170,285 L200,270 L210,240 L240,260 L240,290 L220,310 L190,315 L165,300 Z", labelX: 205, labelY: 285 },
  "Kasaï-Oriental": { d: "M240,260 L275,265 L300,240 L310,270 L300,300 L270,310 L240,290 Z", labelX: 275, labelY: 280 },
  "Lomami": { d: "M300,240 L330,235 L350,255 L345,290 L320,310 L300,300 L310,270 Z", labelX: 322, labelY: 275 },
  "Tanganyika": { d: "M345,290 L370,280 L385,260 L400,285 L395,320 L375,350 L345,345 L335,320 L320,310 Z", labelX: 362, labelY: 315 },
  "Haut-Lomami": { d: "M300,300 L320,310 L335,320 L345,345 L330,375 L300,380 L275,360 L270,330 L270,310 Z", labelX: 305, labelY: 340 },
  "Haut-Katanga": { d: "M330,375 L345,345 L375,350 L395,370 L400,410 L385,440 L350,450 L315,435 L300,410 L300,380 Z", labelX: 350, labelY: 410 },
  "Lualaba": { d: "M240,350 L270,330 L275,360 L300,380 L300,410 L280,430 L250,440 L225,425 L220,390 L230,365 Z", labelX: 262, labelY: 395 },
  "Kwilu": { d: "M90,245 L115,250 L135,275 L140,310 L120,330 L90,325 L70,300 L75,270 Z", labelX: 105, labelY: 290 },
  "Kwango": { d: "M70,300 L90,325 L120,330 L130,360 L115,390 L85,385 L55,355 L50,325 Z", labelX: 88, labelY: 350 },
  "Mai-Ndombe": { d: "M130,160 L170,175 L185,190 L170,210 L130,220 L115,250 L90,245 L80,215 L90,185 L110,170 Z", labelX: 132, labelY: 200 },
  "Kongo-Central": { d: "M30,310 L50,300 L70,300 L75,270 L50,255 L25,265 L15,290 Z", labelX: 45, labelY: 285 },
  "Kinshasa": { d: "M50,255 L75,250 L80,265 L70,275 L50,270 Z", labelX: 63, labelY: 262 },
};

// Vivid gradient stops for tension levels
function getTensionGradientId(tension: number): string {
  if (tension >= 80) return "grad-critical";
  if (tension >= 65) return "grad-high";
  if (tension >= 50) return "grad-moderate";
  if (tension >= 35) return "grad-low";
  return "grad-calm";
}

function getTensionGlowColor(tension: number): string {
  if (tension >= 80) return "hsl(0 84% 60%)";
  if (tension >= 65) return "hsl(25 95% 53%)";
  if (tension >= 50) return "hsl(38 92% 50%)";
  if (tension >= 35) return "hsl(142 71% 45%)";
  return "hsl(160 76% 40%)";
}

function getTensionStroke(tension: number): string {
  if (tension >= 80) return "hsl(0 84% 70%)";
  if (tension >= 65) return "hsl(25 95% 65%)";
  if (tension >= 50) return "hsl(38 92% 62%)";
  if (tension >= 35) return "hsl(142 71% 55%)";
  return "hsl(160 76% 50%)";
}

export default function DRCMap({ provinces, selectedProvince, onSelectProvince }: DRCMapProps) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

  const tensionMap = new Map(provinces.map((p) => [p.name, p]));

  const handleSelect = useCallback((name: string) => onSelectProvince(name), [onSelectProvince]);

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 500 470"
        className="w-full h-auto"
        style={{ maxHeight: "520px" }}
      >
        {/* Gradient definitions */}
        <defs>
          <radialGradient id="grad-critical" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(0 84% 65%)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(0 72% 40%)" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="grad-high" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(25 95% 60%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(15 80% 40%)" stopOpacity="0.75" />
          </radialGradient>
          <radialGradient id="grad-moderate" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(45 100% 58%)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(38 80% 38%)" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="grad-low" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(142 71% 52%)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(142 60% 32%)" stopOpacity="0.65" />
          </radialGradient>
          <radialGradient id="grad-calm" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="hsl(160 76% 48%)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="hsl(160 55% 28%)" stopOpacity="0.6" />
          </radialGradient>

          {/* Glow filters for selected/hovered */}
          <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="hsl(0 84% 60%)" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-orange" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="hsl(25 95% 53%)" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-yellow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="hsl(45 100% 50%)" floodOpacity="0.45" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="hsl(142 71% 45%)" floodOpacity="0.4" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Selected province highlight */}
          <filter id="glow-selected" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="hsl(210 100% 56%)" floodOpacity="0.7" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Province shapes */}
        {Object.entries(provincePaths).map(([name, { d }]) => {
          const data = tensionMap.get(name);
          const tension = data?.tension ?? 0;
          const isSelected = selectedProvince === name;
          const isHovered = hoveredProvince === name;
          const gradId = getTensionGradientId(tension);
          const strokeColor = isSelected
            ? "hsl(210 100% 56%)"
            : isHovered
            ? getTensionStroke(tension)
            : "hsl(222 25% 25%)";

          const glowFilter = isSelected
            ? "url(#glow-selected)"
            : isHovered
            ? tension >= 80
              ? "url(#glow-red)"
              : tension >= 65
              ? "url(#glow-orange)"
              : tension >= 50
              ? "url(#glow-yellow)"
              : "url(#glow-green)"
            : undefined;

          return (
            <motion.path
              key={name}
              d={d}
              fill={`url(#${gradId})`}
              stroke={strokeColor}
              strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 0.8}
              strokeLinejoin="round"
              filter={glowFilter}
              className="cursor-pointer"
              onClick={() => handleSelect(name)}
              onMouseEnter={() => setHoveredProvince(name)}
              onMouseLeave={() => setHoveredProvince(null)}
              initial={false}
              animate={{
                scale: isSelected ? 1.03 : isHovered ? 1.015 : 1,
                opacity: selectedProvince && !isSelected && !isHovered ? 0.5 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ transformOrigin: "center", transformBox: "fill-box" }}
            />
          );
        })}

        {/* Province labels */}
        {Object.entries(provincePaths).map(([name, { labelX, labelY }]) => {
          const isSmall = ["Kinshasa", "Kongo-Central"].includes(name);
          const isSelected = selectedProvince === name;
          const isHovered = hoveredProvince === name;
          const isActive = isSelected || isHovered;
          const isDimmed = selectedProvince && !isSelected && !isHovered;

          return (
            <motion.text
              key={`label-${name}`}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none select-none"
              fill={isActive ? "hsl(210 40% 98%)" : "hsl(210 40% 85%)"}
              fontSize={isSmall ? 6 : 7}
              fontWeight={isActive ? 700 : 500}
              initial={false}
              animate={{ opacity: isDimmed ? 0.3 : isActive ? 1 : 0.75 }}
              transition={{ duration: 0.2 }}
              style={{
                textShadow: isActive
                  ? "0 1px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)"
                  : "0 1px 3px rgba(0,0,0,0.6)",
              }}
            >
              {name.length > 12 ? name.substring(0, 10) + "…" : name}
            </motion.text>
          );
        })}

        {/* Animated tooltip */}
        <AnimatePresence>
          {hoveredProvince && (() => {
            const { labelX, labelY } = provincePaths[hoveredProvince];
            const data = tensionMap.get(hoveredProvince);
            const tension = data?.tension ?? 0;
            const tooltipY = Math.max(22, labelY - 28);
            const tooltipWidth = 120;
            const glowColor = getTensionGlowColor(tension);

            return (
              <motion.g
                key="tooltip"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
              >
                {/* Tooltip background */}
                <rect
                  x={labelX - tooltipWidth / 2}
                  y={tooltipY - 14}
                  width={tooltipWidth}
                  height={28}
                  rx={6}
                  fill="hsl(222 47% 8%)"
                  stroke={glowColor}
                  strokeWidth={1}
                  opacity={0.95}
                />
                {/* Tension bar bg */}
                <rect
                  x={labelX - tooltipWidth / 2 + 8}
                  y={tooltipY + 6}
                  width={tooltipWidth - 16}
                  height={3}
                  rx={1.5}
                  fill="hsl(222 25% 20%)"
                />
                {/* Tension bar fill */}
                <rect
                  x={labelX - tooltipWidth / 2 + 8}
                  y={tooltipY + 6}
                  width={(tooltipWidth - 16) * (tension / 100)}
                  height={3}
                  rx={1.5}
                  fill={glowColor}
                />
                {/* Province name + score */}
                <text
                  x={labelX}
                  y={tooltipY - 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(210 40% 95%)"
                  fontSize={8}
                  fontWeight={700}
                >
                  {hoveredProvince}: {tension}/100
                </text>
              </motion.g>
            );
          })()}
        </AnimatePresence>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-4">
        {[
          { label: "Critique", gradient: "from-red-500 to-red-800" },
          { label: "Élevé", gradient: "from-orange-400 to-orange-700" },
          { label: "Modéré", gradient: "from-yellow-400 to-yellow-700" },
          { label: "Faible", gradient: "from-green-400 to-green-700" },
          { label: "Calme", gradient: "from-teal-400 to-teal-700" },
        ].map(({ label, gradient }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${gradient} shadow-sm`} />
            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
