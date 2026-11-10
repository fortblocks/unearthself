import { useState } from "react";
import { GalleryNavButton } from "@/components/site/GalleryNavButton";

const GALLERY = [
  { src: "/images/bootcamp-crew.jpg", alt: "Bootcamp crew" },
  { src: "/images/exp-canyon.jpg", alt: "Canyon" },
  { src: "/images/exp-hoodoos.jpg", alt: "Hoodoos" },
  { src: "/images/exp-rolling.jpg", alt: "Rolling badlands" },
  { src: "/images/hero-badlands-dusk.jpg", alt: "Badlands at dusk" },
  { src: "/images/basecamp/lounge.jpg", alt: "Basecamp lounge" },
  { src: "/images/haven/elowen/elowen-01.jpg", alt: "Haven Elowen suite" },
];

export function HomeGallery() {
  const [index, setIndex] = useState(0);
  const count = GALLERY.length;
  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  return (
    <section className="px-6 pb-16" aria-roledescription="carousel">
      <div className="relative mx-auto max-w-5xl">
        <div className="aspect-[16/9] overflow-hidden bg-shale">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {GALLERY.map((img, i) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                aria-hidden={i !== index}
                className="h-full w-full shrink-0 object-cover"
              />
            ))}
          </div>
        </div>
        <GalleryNavButton direction="previous" onClick={prev} />
        <GalleryNavButton direction="next" onClick={next} />
      </div>
    </section>
  );
}
