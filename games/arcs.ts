
import p5 from "p5";

const arcs = (p: p5) => {
  let cycles = 2;
  const amplitude = 100;
  let ballProgress = 0;
  const ballSpeed = 1.5;

  let lastInteraction = 0;
  const fadeDuration = 3000;

  p.setup = () => {
    p.createCanvas(600, 400);
    lastInteraction = p.millis();
  };

  p.draw = () => {
    p.background(240);

    // Fade amount
    const alpha = 255 * (
      1 - p.constrain(
        (p.millis() - lastInteraction - fadeDuration) / 1000,
        0,
        1
      )
    );

    // Graph
    p.stroke(220, 50, 50, alpha);
    p.strokeWeight(3);
    p.noFill();

    p.beginShape();

    for (let x = 0; x < p.width; x++) {
      const angle = p.map(
        x,
        0,
        p.width,
        0,
        p.TWO_PI * cycles
      );

      const y = p.height / 2 + p.cos(angle) * amplitude;
      p.vertex(x, y);
    }

    p.endShape();

    // Blue curve: reflected bottom + unchanged top
    p.stroke(50, 100, 220, alpha);
    p.strokeWeight(1.5);

    p.beginShape();

    for (let x = 0; x < p.width; x++) {
      const angle = p.map(
        x,
        0,
        p.width,
        0,
        p.TWO_PI * cycles
      );

      let y = p.height / 2 + p.cos(angle) * amplitude;

      if (y > p.height / 2) {
        y = p.height - y;
      }

      p.vertex(x, y);
    }

    p.endShape();

    // Ball following blue curve
    ballProgress = (ballProgress + ballSpeed) % p.width;

    const angle = p.map(
      ballProgress,
      0,
      p.width,
      0,
      p.TWO_PI * cycles
    );

    let y = p.height / 2 + p.cos(angle) * amplitude;

    if (y > p.height / 2) {
      y = p.height - y;
    }

    p.noStroke();
    p.fill(30);
    p.circle(ballProgress, y, 16);

    // Center line
    p.stroke(100);
    p.strokeWeight(1);
    p.line(0, p.height / 2, p.width, p.height / 2);

    // Slider
    p.noStroke();
    p.fill(180);
    p.rect(50, 350, 500, 8);

    p.fill(220, 50, 50);
    p.circle(
      p.map(cycles, 8, 1, 50, 550),
      354,
      18
    );
  };

  p.mousePressed = () => {
    updateCycles();
  };

  p.mouseDragged = () => {
    updateCycles();
  };

  function updateCycles() {
    if (p.mouseY > 320) {
      cycles = p.map(
        p.constrain(p.mouseX, 50, 550),
        50,
        550,
        8,
        1
      );

      lastInteraction = p.millis();
    }
  }
};

export default arcs;
