import Image from "next/image";
import Link from "next/link";

import type { BlogPost } from "@/types/blog";

type ArticleCardProps = {
  post: BlogPost;
};

export default function ArticleCard({ post }: ArticleCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-52 overflow-hidden">
        <div className="absolute h-52  -inset-2 transition-transform duration-500 ease-out will-change-transform group-hover:scale-105">
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
      </div>

      <div className="-mt-8 relative z-10 p-6">
        <span className="rounded-full bg-muted px-3 py-1 text-sm">
          {post.category}
        </span>

        <Link href={`/blog/${post.slug}`}>
          <h3 className="mt-4 text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
            {post.title}
          </h3>
        </Link>

        <p className="mt-3 leading-7 text-muted-foreground">{post.excerpt}</p>

        <div className="mt-4 text-sm text-muted-foreground">
          {post.date} · {post.readingTime}
        </div>
      </div>
    </article>
  );
}
