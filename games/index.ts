
import timing from "./timing/timing";
import secondaryAction from "./secondaryAction";
import arcs from "./arcs";
import easing from "./easing";
import poseToPose from "./poseToPose";
import anticipation from "./anticipation";
import squishStretch from "./squishStretch";
import layeredTerrain from "./layeredTerrain";

export const games = [
  { slug: "layered-terrain", title: "Layered Terrain", sketch: layeredTerrain },
  { slug: "timing", title: "9. Timing", sketch: timing },
  { slug: "secondary-action", title: "8. Secondary Action", sketch: secondaryAction },
  { slug: "arcs", title: "7. Arcs", sketch: arcs },
  { slug: "easing", title: "6. Ease in, Ease out", sketch: easing },
  { slug: "pose-to-pose", title: "4. Pose-to-Pose", sketch: poseToPose },
  { slug: "anticipation", title: "2. Anticipation", sketch: anticipation },
  { slug: "squish-stretch", title: "1. Squish and Stretch", sketch: squishStretch },
];
