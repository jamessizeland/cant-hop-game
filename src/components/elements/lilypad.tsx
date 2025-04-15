const LilyPad = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <mask id="lilyPadMask">
        {/* Full white background shows everything */}
        <rect x="0" y="0" width="200" height="200" fill="white" />
        {/* This black triangle is the wedge that will be "cut out" */}
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
    {/* Apply the mask to a group containing the lily pad shape and central detail */}
    <g mask="url(#lilyPadMask)">
      {/* Outer shape of the lily pad */}
      <path
        d="
          M100,20 
          C140,20 180,60 180,100 
          C180,140 140,180 100,180 
          C60,180 20,140 20,100 
          C20,60 60,20 100,20 
          Z
        "
        fill="#66BB6A"
        stroke="#388E3C"
        strokeWidth="4"
      />
      {/* Central highlight detail */}
      <circle cx="100" cy="100" r="25" fill="#81C784" opacity="0.5" />
    </g>
  </svg>
);

export default LilyPad;
