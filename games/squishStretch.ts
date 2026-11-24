
import p5 from "p5";

const squishStretch = (p: p5) => {
  let balls = [
    { x: 150, y: 100, r: 30, vy: 0, held: false, squash: false },
    { x: 300, y: 100, r: 30, vy: 0, held: false, squash: false }
  ];

  const gravity = 0.5;
  const bounce = 0.8;

  p.setup = () => {
    p.createCanvas(600, 400);
    p.noStroke();
  };

  p.draw = () => {
    p.background(240);

    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i];
      ball.squash = false;

      // physics
      if (!ball.held) {
        if (ball.y + ball.r < p.height || ball.vy < 0) {
          ball.vy += gravity;
          ball.y += ball.vy;
        } else {
          ball.vy = 0;
        }
      }

      // ground collision
      if (ball.y + ball.r >= p.height && ball.vy > 0) {
        ball.y = p.height - ball.r;
        ball.vy *= -bounce;
        ball.squash = true;

        if (p.abs(ball.vy) < 1) ball.vy = 0;
      }

      // visual deformation
      if (i === 0) {
        const stretch = p.constrain(ball.vy * 0.01, -0.3, 0.3);

        let sx = 1 - stretch;
        let sy = 1 + stretch;

        if (ball.squash) {
          sx = 1.3;
          sy = 0.7;
        }

        p.fill(220, 50, 50);

        p.push();
        p.translate(ball.x, ball.y);
        p.scale(sx, sy);
        p.circle(0, 0, ball.r * 2);
        p.pop();
      } else {
        p.fill(150);
        p.circle(ball.x, ball.y, ball.r * 2);
      }
    }
  };

  p.mousePressed = () => {
    for (const ball of balls) {
      if (p.dist(p.mouseX, p.mouseY, ball.x, ball.y) < ball.r) {
        ball.held = true;
        break;
      }
    }
  };

  p.mouseDragged = () => {
    for (const ball of balls) {
      if (ball.held) {
        ball.x = p.mouseX;
        ball.y = p.mouseY;
        ball.vy = 0;
      }
    }
  };

  p.mouseReleased = () => {
    for (const ball of balls) {
      ball.held = false;
    }
  };
};

export default squishStretch;
