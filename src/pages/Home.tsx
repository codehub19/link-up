import Navbar from "../components/Navbar";
import HomeBackground from "../components/home/HomeBackground";
import FAQ from "../components/home/FAQ/FAQ";
import Footer from "../components/home/Footer/Footer";
import {
  LandingEvents, LandingFeatures, LandingFinal, LandingHero, LandingInstall, LandingSafety, LandingSteps,
} from "../components/home/Landing/Landing";
import "./home.effects.css";
import { useSeo } from '../utils/seo'

export default function Home() {
  useSeo({ path: '/' })
  return (
    <>
      <HomeBackground />
      <Navbar />
      <LandingHero />
      <LandingFeatures />
      <LandingEvents />
      <LandingSteps />
      <LandingSafety />
      <LandingInstall />
      <FAQ />
      <LandingFinal />
      <Footer />
    </>
  );
}
