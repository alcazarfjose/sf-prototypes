
import p5 from "p5";

interface AnimationFrame {
  img: p5.Image;
  originalNumber: number;
}

const poseToPose = (p: p5) => {
  let frames: AnimationFrame[] = [];

  let dragIndex = -1;
  let targetIndex = -1;

  const timelineX = 20;
  let timelineY = 0;
  let slotWidth = 0;

  // Setup
  p.setup = () => {
    p.createCanvas(800, 400);

    // Load horse images
    void Promise.all(
      Array.from({ length: 10 }, (_, i) => {
        const filename = `horse${String(i + 2).padStart(2, "0")}.png`;

        return p.loadImage(
          `${import.meta.env.BASE_URL}games/timing/${filename}`
        ).then((img) => ({
          img,
          originalNumber: i + 2,
        }));
      })
    )
      .then((loadedFrames) => {
        frames = loadedFrames;

        p.resizeCanvas(
          Math.max(800, frames[0].img.width),
          frames[0].img.height + 150
        );

        timelineY = frames[0].img.height + 35;
        slotWidth = (p.width - 40) / frames.length;

        p.frameRate(10);
      })
      .catch((error) => {
        console.error("Failed to load pose-to-pose frames:", error);
      });
  };

  // Draw loop
  p.draw = () => {
    p.background(240);

    if (frames.length === 0) {
      p.fill(30);
      p.noStroke();
      p.textAlign(p.CENTER);
      p.text("Loading animation...", p.width / 2, p.height / 2);
      return;
    }

    // Animation playback
    const currentFrame = p.frameCount % frames.length;
    p.image(frames[currentFrame].img, 0, 0);

    // Timeline
    for (let i = 0; i < frames.length; i++) {
      const x = timelineX + i * slotWidth;

      // Slot
      p.stroke(180);
      p.noFill();
      p.rect(x, timelineY, slotWidth - 4, 70);

      // Thumbnail
      if (i !== dragIndex) {
        drawThumbnail(
          frames[i].img,
          x + 5,
          timelineY + 5
        );
      }

      // Original image number
      p.noStroke();
      p.fill(50, 100, 220);
      p.textAlign(p.CENTER);
      p.textSize(12);

      p.text(
        String(frames[i].originalNumber - 1).padStart(2, "0"),
        x + slotWidth / 2,
        timelineY + 12
      );

      // Timeline position
      p.fill(30);

      p.text(
        String(i + 1).padStart(2, "0"),
        x + slotWidth / 2,
        timelineY + 85
      );

      // Drop position
      if (i === targetIndex && dragIndex !== -1) {
        p.stroke(220, 50, 50);
        p.strokeWeight(3);
        p.line(x, timelineY, x, timelineY + 70);
        p.strokeWeight(1);
      }
    }

    // Dragged thumbnail
    if (dragIndex !== -1) {
      drawThumbnail(
        frames[dragIndex].img,
        p.mouseX - 28,
        p.mouseY - 28
      );
    }
  };

  // Draw thumbnail fitted inside 56x56
  function drawThumbnail(img: p5.Image, x: number, y: number) {
    const s = p.min(56 / img.width, 56 / img.height);

    p.image(
      img,
      x + (56 - img.width * s) / 2,
      y + (56 - img.height * s) / 2,
      img.width * s,
      img.height * s
    );
  }

  // Start dragging
  p.mousePressed = () => {
    if (frames.length === 0) return;

    if (p.mouseY < timelineY || p.mouseY > timelineY + 70) return;

    const index = p.floor((p.mouseX - timelineX) / slotWidth);

    if (index >= 0 && index < frames.length) {
      dragIndex = index;
      targetIndex = index;
    }
  };

  // Update drop position
  p.mouseDragged = () => {
    if (dragIndex === -1) return;

    targetIndex = p.constrain(
      p.floor((p.mouseX - timelineX) / slotWidth),
      0,
      frames.length - 1
    );
  };

  // Reorder frames
  p.mouseReleased = () => {
    if (dragIndex === -1) return;

    const draggedFrame = frames.splice(dragIndex, 1)[0];

    frames.splice(targetIndex, 0, draggedFrame);

    dragIndex = -1;
    targetIndex = -1;
  };
};

export default poseToPose;
