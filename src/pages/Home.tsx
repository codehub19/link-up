import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/home/Hero/Hero";
import FeaturePillars from "../components/home/FeaturePillars/FeaturePillars";
import WhyItWorks from "../components/home/WhyItWorks/WhyItWorks";
import Counters from "../components/home/Counters/Counters";
import Safety from "../components/home/Safety/Safety";
import Testimonials from "../components/home/Testimonials/Testimonials";
import FAQ from "../components/home/FAQ/FAQ";
import FinalCTA from "../components/home/FinalCTA/FinalCTA";
import Footer from "../components/home/Footer/Footer";
import { Link } from "react-router-dom";
import "./home.effects.css";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <FeaturePillars />
      {/* <RoundsCarousel /> */}
      <WhyItWorks />
      <Counters />
      {/* <MetricsBand /> */}
      <Safety />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}


