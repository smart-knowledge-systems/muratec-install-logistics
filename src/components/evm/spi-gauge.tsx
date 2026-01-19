"use client";

interface SpiGaugeProps {
  spi: number;
  size?: number;
  className?: string;
}

/**
 * SPI Gauge - Semicircle gauge showing Schedule Performance Index
 *
 * Color zones:
 * - Green: 0.95-1.1 (on schedule)
 * - Yellow: 0.85-0.95, 1.1-1.2 (caution)
 * - Red: <0.85, >1.2 (critical)
 *
 * Scale: 0 to 1.5
 */
export function SpiGauge({ spi, size = 200, className = "" }: SpiGaugeProps) {
  // Gauge dimensions
  const radius = size / 2;
  const strokeWidth = size / 10;
  const innerRadius = radius - strokeWidth / 2;

  // Center point
  const centerX = size / 2;
  const centerY = size / 2;

  // Gauge spans from -90deg (left) to 90deg (right) = 180deg semicircle
  const startAngle = -90;
  const endAngle = 90;
  const totalAngle = endAngle - startAngle;

  // Scale: 0 to 1.5
  const minValue = 0;
  const maxValue = 1.5;

  // Zone definitions (normalized to 0-1.5 scale)
  const zones = [
    { min: 0, max: 0.85, color: "hsl(0, 84%, 60%)" }, // red
    { min: 0.85, max: 0.95, color: "hsl(45, 93%, 47%)" }, // yellow
    { min: 0.95, max: 1.1, color: "hsl(142, 71%, 45%)" }, // green
    { min: 1.1, max: 1.2, color: "hsl(45, 93%, 47%)" }, // yellow
    { min: 1.2, max: 1.5, color: "hsl(0, 84%, 60%)" }, // red
  ];

  // Convert value to angle
  const valueToAngle = (value: number) => {
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    const normalizedValue = (clampedValue - minValue) / (maxValue - minValue);
    return startAngle + normalizedValue * totalAngle;
  };

  // Convert angle to SVG path coordinates
  const angleToPoint = (angle: number, r: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: centerX + r * Math.cos(radians),
      y: centerY + r * Math.sin(radians),
    };
  };

  // Create arc path
  const createArc = (
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string => {
    const start = angleToPoint(startAngle, radius);
    const end = angleToPoint(endAngle, radius);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  // Determine current color based on SPI value
  const getCurrentColor = () => {
    for (const zone of zones) {
      if (spi >= zone.min && spi < zone.max) {
        return zone.color;
      }
    }
    return zones[zones.length - 1].color;
  };

  // Calculate needle angle
  const needleAngle = valueToAngle(spi);
  const needleLength = innerRadius - strokeWidth / 4;
  const needleEnd = angleToPoint(needleAngle, needleLength);

  // Format SPI for display
  const displaySpi = spi.toFixed(2);

  // Determine status text
  const getStatusText = () => {
    if (spi >= 0.95 && spi <= 1.1) return "On Track";
    if (spi >= 0.85 && spi < 0.95) return "Behind";
    if (spi > 1.1 && spi <= 1.2) return "Ahead";
    if (spi < 0.85) return "Critical";
    return "Very Ahead";
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        className="overflow-visible"
      >
        {/* Background zones */}
        {zones.map((zone, idx) => {
          const zoneStartAngle = valueToAngle(zone.min);
          const zoneEndAngle = valueToAngle(zone.max);

          return (
            <path
              key={idx}
              d={createArc(zoneStartAngle, zoneEndAngle, innerRadius)}
              stroke={zone.color}
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.3}
              strokeLinecap="round"
            />
          );
        })}

        {/* Active arc (shows progress up to current SPI) */}
        <path
          d={createArc(startAngle, needleAngle, innerRadius)}
          stroke={getCurrentColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke="hsl(var(--foreground))"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={strokeWidth / 3}
          fill="hsl(var(--foreground))"
        />

        {/* Scale markers */}
        {[0, 0.5, 1.0, 1.5].map((value) => {
          const angle = valueToAngle(value);
          const markerStart = angleToPoint(
            angle,
            innerRadius - strokeWidth / 2 - 5,
          );
          const markerEnd = angleToPoint(
            angle,
            innerRadius - strokeWidth / 2 + 5,
          );
          const labelPos = angleToPoint(
            angle,
            innerRadius - strokeWidth / 2 - 15,
          );

          return (
            <g key={value}>
              <line
                x1={markerStart.x}
                y1={markerStart.y}
                x2={markerEnd.x}
                y2={markerEnd.y}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-muted-foreground"
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* SPI Value Display */}
      <div className="text-center -mt-2">
        <div
          className="text-3xl font-bold"
          style={{ color: getCurrentColor() }}
        >
          {displaySpi}
        </div>
        <div className="text-sm text-muted-foreground">{getStatusText()}</div>
      </div>
    </div>
  );
}
