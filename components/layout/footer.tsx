import Container from "@/components/layout/container";

export default function Footer() {
  return (
    <footer className="border-t">
      <Container>
        <div className="flex h-16 items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Frontend Blog</p>

          <p>Built with Next.js</p>
        </div>
      </Container>
    </footer>
  );
}
