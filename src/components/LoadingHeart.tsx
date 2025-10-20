import React from "react";
import "./LoadingHeart.css";

export default function LoadingHeart({ size = 48 }) {
  return (
    <div className="dating-spinner-wrapper" style={{ minHeight: size, minWidth: size }}>
      <div className="dating-heart-loader" style={{ width: size, height: size }} aria-label="Loading" role="status">
        <svg viewBox="0 0 50 45" width={size} height={size}>
          <path
            d="M24.5 42s-1.5-1.32-7.5-6.07C7.5 29.5 2 24.36 2 17.72 2 12.07 6.93 7.5 12.25 7.5c3.34 0 6.59 1.75 8.25 4.44C22.66 9.25 25.91 7.5 29.25 7.5 34.57 7.5 39.5 12.07 39.5 17.72c0 6.64-5.5 11.78-15 18.21z"
            fill="#ee2a7b"
            stroke="#fff"
            strokeWidth="2"
            className="dating-heart"
          />
        </svg>
      </div>
    </div>
  );
}






// import React from "react";
// import "./LoadingHeart.css";

// export default function LoadingHeart({ size = 56 }) {
//   return (
//     <div className="love-spinner-wrapper" style={{ minWidth: size, minHeight: size }}>
//       <svg
//         className="love-spinner-svg"
//         width={size}
//         height={size}
//         viewBox="0 0 56 56"
//         style={{ display: "block" }}
//       >
//         {/* Figure-eight (💞) orbit for both hearts */}
//         <path
//           id="orbitPath"
//           d="M28,28 C49,0 49,56 28,28 C7,56 7,0 28,28 Z"
//           fill="none"
//         />

//         {/* Pink heart */}
//         <g>
//           <animateMotion
//             dur="1.6s"
//             repeatCount="indefinite"
//             rotate="auto"
//             keyPoints="0;1"
//             keyTimes="0;1"
//           >
//             <mpath href="#orbitPath" />
//           </animateMotion>
//           <g transform="translate(-12,-12)">
//             <Heart color="pink" />
//           </g>
//         </g>

//         {/* Blue heart (half a cycle offset) */}
//         <g>
//           <animateMotion
//             dur="1.6s"
//             repeatCount="indefinite"
//             rotate="auto"
//             begin="0.8s"
//             keyPoints="0;1"
//             keyTimes="0;1"
//           >
//             <mpath href="#orbitPath" />
//           </animateMotion>
//           <g transform="translate(-12,-12)">
//             <Heart color="blue" />
//           </g>
//         </g>
//       </svg>
//     </div>
//   );
// }

// // Heart SVG (reusable)
// function Heart({ color }: { color: "pink" | "blue" }) {
//   const gradientId = color === "pink" ? "pinkGrad" : "blueGrad";
//   return (
//     <>
//       <defs>
//         <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//           <stop offset="0%" stopColor="#f9ce34" />
//           <stop offset="60%" stopColor="#ee2a7b" />
//           <stop offset="100%" stopColor="#6228d7" />
//         </linearGradient>
//         <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
//           <stop offset="0%" stopColor="#7fd8f7" />
//           <stop offset="80%" stopColor="#3897f0" />
//           <stop offset="100%" stopColor="#1a237e" />
//         </linearGradient>
//       </defs>
//       <path
//         d="M24.5 42s-1.5-1.32-7.5-6.07C7.5 29.5 2 24.36 2 17.72 2 12.07 6.93 7.5 12.25 7.5c3.34 0 6.59 1.75 8.25 4.44C22.66 9.25 25.91 7.5 29.25 7.5 34.57 7.5 39.5 12.07 39.5 17.72c0 6.64-5.5 11.78-15 18.21z"
//         fill={`url(#${gradientId})`}
//         stroke="#fff"
//         strokeWidth="2"
//         style={{
//           filter:
//             color === "pink"
//               ? "drop-shadow(0 0 6px #ee2a7b88)"
//               : "drop-shadow(0 0 6px #3897f099)",
//         }}
//       />
//     </>
//   );
// }