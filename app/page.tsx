import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import Education from "@/components/Education";
import Projects from "@/components/Projects";
import Blog from "@/components/Blog";
import MarketplaceCTA from "@/components/MarketplaceCTA";
import Contact from "@/components/Contact";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import Highlight from "@/components/Highlight";

export const dynamic = "force-dynamic";

export default function Home(){
  const sections=[
    <Highlight key="highlight"/>,
    <Projects key="projects"/>,
    <Skills key="skills"/>,
    <About key="about"/>,
    <Experience key="experience"/>,
    <Blog key="blog"/>,
    <Education key="education"/>,
    <MarketplaceCTA key="marketplace"/>,
    <Contact key="contact"/>,
    <Testimonials key="testimonials"/>
  ];
  return <main><Navbar/><Hero/>{sections.map((section,index)=><ScrollReveal key={index}>{section}</ScrollReveal>)}<Footer/></main>
}