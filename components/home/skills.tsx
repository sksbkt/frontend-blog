import { skillCategories } from "@/lib/data/skills";

export default function Skills() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            Skills
          </span>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Technologies I enjoy working with
          </h2>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            A collection of the tools and technologies I use to build fast,
            accessible, and scalable web applications.
          </p>
        </div>

        <div className="space-y-10">
          {skillCategories.map((category) => (
            <div key={category.id}>
              <h3 className="mb-4 text-lg font-semibold">{category.title}</h3>

              <div className="flex flex-wrap gap-3">
                {category.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
