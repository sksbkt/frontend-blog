import Hero from "@/components/home/hero";
import FeaturedPosts from "@/components/home/featured-posts";
import FeaturedProjects from "@/components/projects/featured-projects";
import Skills from "@/components/home/skills";
import About from "@/components/home/about";
import Contact from "@/components/home/contact";
export default function HomePage() {
  return (
    <main>
      <Hero />
      <FeaturedProjects />
      <FeaturedPosts />
      <Skills />
      <About />
      <Contact />
    </main>
  );
}
