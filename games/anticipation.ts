
import p5 from "p5";

const anticipation = (p: p5) => {
  const ball = {
    x: 300,
    y: 370,
    r: 30,
    vy: 0,
    held: false,
  };

  const gravity = 0.5;
  let charge = 0;

  let normalColor: p5.Color;
  let chargedColor: p5.Color;

  p.setup = () => {
    p.createCanvas(600, 400);

    normalColor = p.color(150);
    chargedColor = p.color(220, 50, 50);
  };

  p.draw = () => {
    p.background(240);

    if (ball.held) {
      charge = p.min(charge + 0.5, 30);
    }

    // Physics
    if (!ball.held) {
      ball.vy += gravity;
      ball.y += ball.vy;
      charge = 0;
    }

    // Ground collision
    if (ball.y + ball.r > p.height) {
      ball.y = p.height - ball.r;
      ball.vy = 0;
    }

    // Color
    const t = p.constrain(charge / 30, 0, 1);
    p.fill(p.lerpColor(normalColor, chargedColor, t));

    // Deformation
    const squash = t * 0.3;
    const stretch = p.constrain(
      Math.abs(ball.vy) * 0.015,
      0,
      0.4
    );

    const sx = 1 + squash - stretch;
    const sy = 1 - squash + stretch;

    p.noStroke();
    p.push();
    p.translate(ball.x, ball.y + squash * ball.r);
    p.scale(sx, sy);
    p.circle(0, 0, ball.r * 2);
    p.pop();
  };

  // Mouse interaction
  p.mousePressed = () => {
    if (
      p.dist(p.mouseX, p.mouseY, ball.x, ball.y) < ball.r
    ) {
      if (ball.y + ball.r >= p.height) {
        ball.held = true;
        charge = 0;
      }
    }
  };

  p.mouseReleased = () => {
    if (ball.held) {
      ball.held = false;
      ball.vy = -charge;
    }
  };
};

export default anticipation;
