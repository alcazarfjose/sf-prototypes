
import p5 from "p5";
import * as ml5 from "ml5";

const easing = (p: p5) => {
  // Tuning
  const SMOOTHING = 0.2;
  const MARKER_SIZE = 30;

  // Webcam and hand tracking
  let video: p5.Element;
  let hands: HandPrediction[] = [];

  let redBall: HandTracker;
  let greyBall: HandTracker;

  // Minimal shape of the ml5 results we use
  interface HandPrediction {
    keypoints: {
      x: number;
      y: number;
    }[];
  }

  interface HandPoseModel {
    detectStart: (
      video: HTMLVideoElement,
      callback: (results: HandPrediction[]) => void
    ) => void;
  }

  // Hand tracker
  class HandTracker {
    landmarkIndex: number;
    useEasing: boolean;

    pos: p5.Vector;
    target: p5.Vector;
    active = false;

    constructor(landmarkIndex: number, useEasing: boolean) {
      this.landmarkIndex = landmarkIndex;
      this.useEasing = useEasing;

      this.pos = p.createVector(p.width / 2, p.height / 2);
      this.target = p.createVector(p.width / 2, p.height / 2);
    }

    update() {
      const hand = hands[0];

      if (hand) {
        const point = hand.keypoints[this.landmarkIndex];

        if (point) {
          this.target.set(p.width - point.x, point.y);
          this.active = true;
        }
      }

      if (this.active) {
        if (this.useEasing) {
          this.pos.lerp(this.target, SMOOTHING);
        } else {
          this.pos.set(this.target);
        }
      }
    }

    draw(ballColor: p5.Color) {
      if (!this.active) return;

      p.noStroke();
      p.fill(ballColor);
      p.circle(this.pos.x, this.pos.y, MARKER_SIZE);
    }
  }

  // Setup
  p.setup = () => {
    p.createCanvas(640, 480);

    video = p.createCapture(p.VIDEO);
    video.size(p.width, p.height);
    video.hide();

    redBall = new HandTracker(0, true);
    greyBall = new HandTracker(1, false);

    // Load the current ml5 HandPose model
    void (async () => {
      try {
        const ml5Api = ml5 as unknown as {
          handPose: () => Promise<HandPoseModel>;
        };

        const handPose = await ml5Api.handPose();

        handPose.detectStart(
          video.elt as HTMLVideoElement,
          (results) => {
            hands = results;
          }
        );

        console.log("HandPose ready!");
      } catch (error) {
        console.error("Failed to initialize HandPose:", error);
      }
    })();
  };

  // Draw loop
  p.draw = () => {
    p.background(20);

    // Mirrored video
    p.push();
    p.translate(p.width, 0);
    p.scale(-1, 1);
    p.image(video, 0, 0, p.width, p.height);
    p.pop();

    // Update trackers
    redBall.update();
    greyBall.update();

    // Draw balls
    redBall.draw(p.color(255, 70, 70));
    greyBall.draw(p.color(160));
  };
};

export default easing;
