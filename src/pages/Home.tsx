import React from "react";
import Navbar from "../components/Navbar";
import HomeBackground from "../components/home/HomeBackground";
import Hero from "../components/home/Hero/Hero";
import ProblemSolution from "../components/home/ProblemSolution/ProblemSolution";
import FeaturesBento from "../components/home/Features/FeaturesBento";
import HowItWorksSteps from "../components/home/HowItWorks/HowItWorksSteps";
import Testimonials from "../components/home/Testimonials/Testimonials";
import FAQ from "../components/home/FAQ/FAQ";
import FinalCTA from "../components/home/FinalCTA/FinalCTA";
import Footer from "../components/home/Footer/Footer";
import { Link } from "react-router-dom";
import "./home.effects.css";

export default function Home() {
  return (
    <>
      <HomeBackground />
      <Navbar />
      <Hero />
      <ProblemSolution />
      <FeaturesBento />
      <HowItWorksSteps />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}


