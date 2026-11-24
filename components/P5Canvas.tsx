
import { useEffect, useRef } from "react";
import p5 from "p5";

type P5Sketch = (p: p5) => void;

interface P5CanvasProps {
  sketch: P5Sketch;
}

export default function P5Canvas({ sketch }: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    // start with a clean container
    container.replaceChildren();

    const instance = new p5((p) => {
      sketch(p);

      // p5 may finish initialization after react has cleaned up
      const originalSetup = p.setup;

      p.setup = () => {
        if (disposed) {
          p.noLoop();
          return;
        }

        originalSetup();
      };
    }, container);

    return () => {
      disposed = true;

      instance.remove();
      container.replaceChildren();
    };
  }, [sketch]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center"
    />
  );
}
