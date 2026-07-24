import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { assetUrl } from "../lib/api";

/**
 * Full-width image carousel with auto-play, arrow navigation, and dot indicators.
 *
 * Props:
 *   images   – array of image URL strings (relative or absolute)
 *   height   – fixed CSS height (number in px or string)
 *   autoPlayMs – interval between slides (default 4500 ms)
 *   borderRadius – edge rounding (default 0 for full-bleed hero sections)
 */
export default function ImageCarousel({ images = [], height = 420, autoPlayMs = 4500, borderRadius = 0 }) {
  const [current, setCurrent] = useState(0);
  const total = images.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [total, next, autoPlayMs]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (!total) {
    // Placeholder gradient when no images are available
    return (
      <div style={{
        width: "100%", height,
        background: "linear-gradient(135deg, #0d1b2a 0%, #1a3352 60%, #c8912f22 100%)",
        borderRadius,
      }} />
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height, overflow: "hidden", borderRadius }}>
      {/* Slides */}
      {images.map((url, i) => (
        <div
          key={`${url}-${i}`}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === current ? 1 : 0,
            transition: "opacity 0.75s ease",
          }}
        >
          <img
            src={assetUrl(url)}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ))}

      {/* Bottom gradient overlay so text on top is readable */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.60) 100%)",
      }} />

      {/* Prev / Next buttons */}
      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous slide"
            style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.28)", borderRadius: "50%",
              width: 42, height: 42, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", zIndex: 2,
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next slide"
            style={{
              position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.28)", borderRadius: "50%",
              width: 42, height: 42, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", zIndex: 2,
            }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Dot indicators */}
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 7, alignItems: "center", zIndex: 2,
          }}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === current ? 24 : 8, height: 8, borderRadius: 4,
                  background: i === current ? "#c8912f" : "rgba(255,255,255,0.55)",
                  border: "none", cursor: "pointer",
                  transition: "all 0.3s ease", padding: 0,
                }}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div style={{
            position: "absolute", top: 14, right: 16, zIndex: 2,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            color: "#fff", fontSize: 12, fontWeight: 600,
            padding: "3px 10px", borderRadius: 999,
          }}>
            {current + 1} / {total}
          </div>
        </>
      ) : null}
    </div>
  );
}
