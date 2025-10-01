import React from "react";
// import "./HeroAnimation.css";

const cards = [
  {
    img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80&auto=format&fit=crop",
    label: "Aisha, 20"
  },
  {
    img: "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=900&q=80&auto=format&fit=crop",
    label: "Josh, 24"
  },
  {
    img: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=900&q=80&auto=format&fit=crop",
    label: "Tiana, 22"
  }
];

const HeroAnimation = () => {
  return (
    <div className="hero__animation">
      <div className="animation-cards">
        {cards.map((card, index) => (
          <div className={`animation-card delay-${index}`} key={index}>
            <img src={card.img} alt={card.label} />
            <p>{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroAnimation;
