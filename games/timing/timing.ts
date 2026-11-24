
import p5 from "p5";

const timing = (p: p5) => {
  let frames: p5.Image[] = [];
  let framesLoaded = false;

  let fps = 30;
  const minFPS = 10;
  const maxFPS = 30;

  const sliderX = 250;
  const sliderY = 610;
  const sliderW = 500;

  let draggingSlider = false;

  p.setup = () => {
    p.createCanvas(1000, 650);

    Promise.all(
      Array.from({ length: 10 }, (_, i) => {
        const filename = `horse${String(i + 2).padStart(2, "0")}.png`;

        return p.loadImage(
          `${import.meta.env.BASE_URL}games/timing/${filename}`
        );
      })
    )
      .then((loadedFrames) => {
        frames = loadedFrames;
        framesLoaded = true;
        console.log("Timing: all 10 frames loaded");
      })
      .catch((error) => {
        console.error("Failed to load timing frames:", error);
      });
    };

  p.draw = () => {
    p.background(240);

    if (!framesLoaded) {
      p.fill(30);
      p.noStroke();
      p.textAlign(p.CENTER);
      p.textSize(18);
      p.text("LOADING ANIMATION...", p.width / 2, p.height / 2);
      return;
    }

    const rightX = 410;
    const rightW = p.width - rightX - 20;

    // Available frames
    const activeFrames = Array.from({ length: fps }, (_, i) =>
      p.floor(i * 30 / fps)
    );

    // Left: 30-frame grid
    p.noStroke();
    p.fill(30);
    p.textSize(18);
    p.textAlign(p.LEFT);
    p.text("ANIMATION FRAMES", 20, 30);

    const columns = 6;
    const cellW = 340 / columns;
    const cellH = 450 / 5;

    for (let i = 0; i < 30; i++) {
      const col = i % columns;
      const row = p.floor(i / columns);

      const x = 20 + col * cellW;
      const y = 55 + row * cellH;

      const used = activeFrames.includes(i);
      const img = frames[i % 10];

      p.stroke(190);
      p.fill(used ? 255 : 215);
      p.rect(x, y, cellW - 5, cellH - 5);

      p.push();

      if (!used) {
        p.tint(100);
      }

      drawFittedImage(
        img,
        x + 4,
        y + 4,
        cellW - 13,
        cellH - 13
      );

      p.pop();
    }

    // Right: actual animation
    p.fill(30);
    p.noStroke();
    p.textSize(18);
    p.text("ANIMATION", rightX, 30);

    p.stroke(190);
    p.fill(255);
    p.rect(rightX, 55, rightW, 450);

    // Playback: three complete cycles per second
    const playbackIndex = p.floor(
      (p.millis() % 1000) / 1000 * fps
    );

    const sourcePosition = activeFrames[playbackIndex];
    const currentImage = frames[sourcePosition % 10];

    drawFittedImage(
      currentImage,
      rightX + 10,
      65,
      rightW - 20,
      430
    );

    // FPS indicator
    p.noStroke();
    p.fill(30);
    p.textSize(16);
    p.textAlign(p.CENTER);
    p.text(`${fps} FPS`, p.width / 2, 555);

    // Slider
    p.fill(190);
    p.rect(sliderX, sliderY, sliderW, 6, 3);

    const knobX = p.map(
      fps,
      minFPS,
      maxFPS,
      sliderX,
      sliderX + sliderW
    );

    p.fill(50, 100, 220);
    p.circle(knobX, sliderY + 3, 20);
  };

  // Fit image inside a bounding box
  function drawFittedImage(
    img: p5.Image,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const s = p.min(w / img.width, h / img.height);

    const imgW = img.width * s;
    const imgH = img.height * s;

    p.image(
      img,
      x + (w - imgW) / 2,
      y + (h - imgH) / 2,
      imgW,
      imgH
    );
  }

  // Slider interaction
  p.mousePressed = () => {
    if (
      p.mouseY > sliderY - 15 &&
      p.mouseY < sliderY + 20 &&
      p.mouseX > sliderX - 10 &&
      p.mouseX < sliderX + sliderW + 10
    ) {
      draggingSlider = true;
      updateFPS();
    }
  };

  p.mouseDragged = () => {
    if (draggingSlider) {
      updateFPS();
    }
  };

  p.mouseReleased = () => {
    draggingSlider = false;
  };

  function updateFPS() {
    fps = p.round(
      p.map(
        p.constrain(p.mouseX, sliderX, sliderX + sliderW),
        sliderX,
        sliderX + sliderW,
        minFPS,
        maxFPS
      )
    );
  }
};

export default timing;
