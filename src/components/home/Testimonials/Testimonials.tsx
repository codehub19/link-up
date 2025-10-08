import React from "react";
import "./Testimonials.styles.css";

const TESTIMONIALS = [
  {
    rating: 5,
    text: "Fewer profiles meant I actually read them. Quality uplift is real.",
    author: "Simran",
    role: "DTU",
    avatar: "/assets/av1.jpg",
  },
  {
    rating: 4,
    text: "It feels intentional. I don’t doom scroll and burn out.",
    author: "Arjun",
    role: "IIT Delhi",
    avatar: "/assets/av2.jpg",
  },
  {
    rating: 5,
    text: "Felt safe & respected, plus the UI is clean.",
    author: "Karan",
    role: "NSUT",
    avatar: "/assets/av3.jpg",
  },
  {
    rating: 5,
    text: "Met people I now collaborate with. Not just matches—actual network.",
    author: "Nisha",
    role: "DU North",
    avatar: "/assets/av4.jpg",
  },
  {
    rating: 5,
    text: "The round cadence keeps me engaged without overwhelm.",
    author: "Manya",
    role: "IIIT Delhi",
    avatar: "/assets/av5.jpg",
  },
];

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <div className="testi-card">
      <span className="testi-quote">“</span>
      <blockquote>{t.text}</blockquote>
      <div className="testi-author">
        <img src={t.avatar} alt={t.author} className="testi-avatar" />
        <div>
          <div className="testi-name">{t.author}</div>
          <div className="testi-role">{t.role}</div>
          <div className="testi-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < t.rating ? "star on" : "star"}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getInfiniteRow(testimonials: typeof TESTIMONIALS, repeat = 3, reverse = false) {
  let arr: typeof TESTIMONIALS = [];
  for (let i = 0; i < repeat; i++) arr = arr.concat(testimonials);
  return reverse ? [...arr].reverse() : arr;
}

export default function Testimonials() {
  const row1Ref = React.useRef<HTMLDivElement>(null);
  // const row2Ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Pause animation on hover (accessibility)
    const rows = [row1Ref.current];
    rows.forEach((row) => {
      if (!row) return;
      row.addEventListener("mouseenter", () => (row.style.animationPlayState = "paused"));
      row.addEventListener("mouseleave", () => (row.style.animationPlayState = "running"));
    });
    return () => {
      rows.forEach((row) => {
        if (!row) return;
        row.removeEventListener("mouseenter", () => (row.style.animationPlayState = "paused"));
        row.removeEventListener("mouseleave", () => (row.style.animationPlayState = "running"));
      });
    };
  }, []);

  return (
    <section className="section testimonials-auto">
      <div className="container">
        <h2 className="testi-title">What Students Say</h2>
        <div className="testi-rows">
          <div className="testi-row" ref={row1Ref}>
            {getInfiniteRow(TESTIMONIALS, 3, false).map((t, i) => (
              <TestimonialCard t={t} key={`row1-${i}-${t.author}-${i}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}