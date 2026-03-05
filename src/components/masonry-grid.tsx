import React from "react";

interface MasonryGridProps {
    images: string[];
}

export function MasonryGrid({ images }: MasonryGridProps) {
    if (!images || images.length === 0) {
        return (
            <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50">
                <p className="text-sm text-zinc-500">No images to display</p>
            </div>
        );
    }

    return (
        <div className="columns-1 gap-4 space-y-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5">
            {images.map((src, index) => (
                <div
                    key={index}
                    className="break-inside-avoid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 group relative"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={src}
                        alt={`Gallery item ${index + 1}`}
                        className="w-full auto block transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
                </div>
            ))}
        </div>
    );
}
