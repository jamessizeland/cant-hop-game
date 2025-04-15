const LilyPad = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="200"
    height="200"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Define a radial gradient to simulate natural light and depth */}
      <radialGradient id="lilyGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#81C784" />
        <stop offset="100%" stopColor="#66BB6A" />
      </radialGradient>

      {/* Define a drop shadow filter */}
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow
          dx="3"
          dy="3"
          stdDeviation="2"
          floodColor="rgba(0, 0, 0, 0.3)"
        />
      </filter>

      {/* Define the mask for the wedge cut out */}
      <mask id="lilyPadMask">
        <rect x="0" y="0" width="200" height="200" fill="white" />
        <path
          d="
            M100,100
            L190,80
            L190,140
            Z
          "
          fill="black"
        />
      </mask>
    </defs>

    {/* Group the content with drop shadow and mask */}
    <g mask="url(#lilyPadMask)" filter="url(#dropShadow)">
      {/* Outer shape of the lily pad using the radial gradient fill */}
      <path
        d="
          M100,20 
          C140,20 180,60 180,100 
          C180,140 140,180 100,180 
          C60,180 20,140 20,100 
          C20,60 60,20 100,20 
          Z
        "
        fill="url(#lilyGrad)"
        stroke="#388E3C"
        strokeWidth="4"
      />

      {/* Central highlight detail */}
      <circle cx="100" cy="100" r="25" fill="#81C784" opacity="0.5" />

      {/* A subtle vein drawn across the lily pad */}
      <path
        d="M100,40 Q95,100 100,160"
        fill="none"
        stroke="#388E3C"
        strokeWidth="2"
        opacity="0.6"
      />
    </g>
  </svg>
);

export default LilyPad;
