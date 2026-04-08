interface SparkProps {
  data:  number[];
  color: string;
  w?:    number;
  h?:    number;
}

export function Spark({ data, color, w = 80, h = 32 }: SparkProps) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BigSpark({ data, color, w = 120, h = 40 }: SparkProps) {
  if (data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * h}`)
    .join(" ");
  const area = `${pts} ${w},${h} 0,${h}`;
  const gid = `g${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Generate a deterministic pseudo-sparkline that ends at currentProb */
export function generateSparkline(marketId: number, currentProb: number, points = 7): number[] {
  const seed = (marketId * 137 + 41) % 100;
  const result: number[] = [];
  for (let i = 0; i < points - 1; i++) {
    const progress = i / (points - 1);
    const noise = Math.sin(seed * (i + 1) * 0.73) * 7;
    result.push(Math.max(5, Math.min(95, 50 + (currentProb - 50) * progress + noise)));
  }
  result.push(currentProb);
  return result;
}
