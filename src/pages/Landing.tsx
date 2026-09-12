import { useEffect } from "react";
import LandingNav from "../components/landing/LandingNav";
import LandingHero3D from "../components/landing/LandingHero3D";
import LandingStory3D from "../components/landing/LandingStory3D";
import LandingBenchmarkExplorer from "../components/landing/LandingBenchmarkExplorer";
import LandingFeatureGrid from "../components/landing/LandingFeatureGrid";
import LandingCaseStudy3D from "../components/landing/LandingCaseStudy3D";
import LandingFooter from "../components/landing/LandingFooter";
import "../styles/landing-3d.css";

export default function Landing() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-root">
      <div className="landing-noise-overlay" />
      <LandingNav />
      <div className="landing-content-wrapper">
        <LandingHero3D />
        <LandingStory3D />
        <LandingBenchmarkExplorer />
        <LandingFeatureGrid />
        <LandingCaseStudy3D />
        <LandingFooter />
      </div>
    </div>
  );
}
