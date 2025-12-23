import React from 'react';
import './HomeBackground.css';

export default function HomeBackground() {
    return (
        <div className="home-background">
            <div className="hb-gradient" />
            <div className="hb-noise" />
            <div className="hb-orbs">
                <div className="hb-orb hb-orb-1" />
                <div className="hb-orb hb-orb-2" />
                <div className="hb-orb hb-orb-3" />
            </div>
            {/* Subtle grid pattern overlay */}
            <div className="hb-grid" />
        </div>
    );
}
