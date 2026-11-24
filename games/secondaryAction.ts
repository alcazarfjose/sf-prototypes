
import p5 from "p5";

const secondaryAction = (p: p5) => {
  let fishPos: p5.Vector;

  let fishAngle = 0;
  let previousAngle = 0;
  let tailAngle = 0;
  let finAngle = 0;

  p.setup = () => {
    p.createCanvas(640, 400);
    fishPos = p.createVector(p.width / 2, p.height / 2);
  };

  p.draw = () => {
    p.background(225, 240, 245);

    // water
    p.noStroke();
    p.fill(190, 220, 230);
    p.rect(0, p.height - 45, p.width, 45);

    // always move toward the mouse's last position
    const target = p.createVector(p.mouseX, p.mouseY);
    const direction = p5.Vector.sub(target, fishPos);

    const targetAngle = direction.heading();
    const angleDifference = p.atan2(
      p.sin(targetAngle - fishAngle),
      p.cos(targetAngle - fishAngle)
    );

    fishAngle += angleDifference * 0.08;
    fishPos.lerp(target, 0.04);

    // tail and side fin react to the fish's turning
    const turnAmount = p.atan2(
      p.sin(fishAngle - previousAngle),
      p.cos(fishAngle - previousAngle)
    );

    tailAngle = p.lerp(tailAngle, -turnAmount * 12, 0.12);
    tailAngle *= 0.92;

    finAngle = p.lerp(finAngle, turnAmount * 6, 0.12);
    finAngle *= 0.92;

    previousAngle = fishAngle;

    drawFish(
      fishPos.x,
      fishPos.y,
      fishAngle,
      tailAngle,
      finAngle
    );
  };

  function drawFish(
    x: number,
    y: number,
    angle: number,
    tailAngle: number,
    finAngle: number
  ) {
    p.push();
    p.translate(x, y);
    p.rotate(angle);

    p.noStroke();

    // tail
    p.push();
    p.translate(-35, 0);
    p.rotate(tailAngle);
    p.fill(240, 130, 65);
    p.triangle(0, 0, -30, -25, -30, 25);
    p.pop();

    // body
    p.fill(255, 165, 85);
    p.ellipse(0, 0, 85, 55);

    // side fin
    p.push();
    p.translate(-5, 12);
    p.rotate(finAngle);
    p.fill(235, 135, 65);
    p.triangle(-10, 0, 12, 4, 8, 17);
    p.pop();

    p.pop();
  }
};

export default secondaryAction;
