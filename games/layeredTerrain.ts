
import p5 from "p5";

const layeredTerrain = (p: p5) => {

  let advanceHeld = false;

  let cols = 24;
  let rows = 24;

  let tileW = 32;
  let tileH = 16;
  let heightStep = 40;

  // ocean and continent elevations
  let oceanElevation = 3;
  let continentThreshold = oceanElevation + 1;
  let gridElevation = -4;

  let terrain: number[][] = [];
  let buildings: (Building | null)[][] = [];

  let noiseTime = 0;
  let noiseScale = 0.12;

  // time pressure
  let holdDuration = 0;
  let maxAcceleration = 0.08;
  let acceleration = 0;
  let accelerationRate = 0.0005;

  // building settings
  let flatnessThreshold = 1;
  let requiredFlatNeighbors = 12;

  // node settings
  let nodeSpacing = 3;
  let nodeSize = 5;

  // connections
  let connections: Connection[] = [];

  let connectionStart: Node | null = null;
  let connectionDragged = false;
  let connectionStartScreen: p5.Vector | null = null;

  // each pair represents two transit directions
  type ColorRGB = [number, number, number];
  type ColorPair = [ColorRGB, ColorRGB];

  let connectionColors: ColorPair[] = [
    [[65, 155, 255], [255, 155, 65]],
    [[245, 75, 85], [90, 210, 120]],
    [[255, 220, 70], [175, 105, 235]]
  ];

  let nextColorPair = 0;

  // metro traffic
  let metros: Metro[] = [];
  let metroSpeed = 35;
  let metroSize = 7;

  // station settings
  let stationWidth = 12;
  let stationHeight = 16;
  let stationDotSpacing = 7;
  let stationDotSize = 2;

  interface Building {
    height: number;
    currentHeight: number;
    verticalVelocity: number;
    foundationHeight: number;
    state: "spawning" | "stable" | "despawning";
  }

  interface Node {
    x: number;
    y: number;
  }

  interface Connection {
    a: Node;
    b: Node;
    colorPair: number;
  }

  interface Metro {
    connection: Connection;
    railIndex: number;
    direction: number;
    progress: number;
  }

  p.setup = () => {
    p.createCanvas(1000, 750);

    for (let x = 0; x < cols; x++) {
      terrain[x] = [];
      buildings[x] = [];

      for (let y = 0; y < rows; y++) {
        buildings[x][y] = null;
      }
    }

    generateTerrain();
  };

  p.draw = () => {
    p.background(30, 35, 42);

    let dt = Math.min(p.deltaTime / 1000, 0.05);

    if (advanceHeld) {
      holdDuration += dt;

      acceleration = p.constrain(
        holdDuration * accelerationRate,
        0,
        maxAcceleration
      );

      noiseTime += acceleration;
    } else {
      holdDuration = 0;
      acceleration = 0;
    }

    generateTerrain();
    updateBuildings(dt);
    updateMetros(dt);
    updateConnections();

    p.push();
    p.translate(p.width / 2, 100);

    drawContinentGrid();
    drawConnections();
    drawMetros();
    drawNodes();
    drawStationConnectors();

    // draw terrain back to front
    for (let sum = 0; sum < cols + rows - 1; sum++) {
      for (let x = 0; x < cols; x++) {
        let y = sum - x;

        if (y < 0 || y >= rows) continue;

        drawVoxel(x, y);

        if (buildings[x][y] !== null) {
          drawBuilding(x, y, buildings[x][y]!);
        }

        if (
          x % nodeSpacing === 0 &&
          y % nodeSpacing === 0 &&
          isActiveNode(x, y) &&
          getNodeConnectionCount({ x, y }) > 0
        ) {
          drawStation(x, y);
        }
      }
    }

    drawPlacementPreview();
    p.pop();

    // ui
    p.noStroke();
    p.fill(255);
    p.textSize(14);

    p.text("HOLD A TO ADVANCE TIME", 20, p.height - 25);

    let pressure = acceleration / maxAcceleration;

    p.fill(65, 125, 85);
    p.rect(260, p.height - 35, 180, 8, 4);

    p.fill(130, 220, 145);
    p.rect(260, p.height - 35, 180 * pressure, 8, 4);

    p.fill(255);
    p.text("BUILDINGS: " + countBuildings(), 500, p.height - 25);

    p.text("CLICK FLAT GROUND TO BUILD", 720, p.height - 25);
    p.text("DRAG NODES TO CONNECT", 720, p.height - 50);
  };

  // =====================================
  // TERRAIN GENERATION
  // =====================================

  function generateTerrain() {
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let n = p.noise(
          x * noiseScale,
          y * noiseScale,
          noiseTime
        );

        let generatedHeight = Math.round(
          p.map(n, 0, 1, 0, 7)
        );

        terrain[x][y] = Math.max(
          generatedHeight,
          oceanElevation
        );
      }
    }
  }

  // =====================================
  // BUILDING PLACEMENT
  // =====================================
  p.keyPressed = () => {
    if (p.key.toLowerCase() === "a") {
      advanceHeld = true;
    }
  };

  p.keyReleased = () => {
    if (p.key.toLowerCase() === "a") {
      advanceHeld = false;
    }
  };

  p.mousePressed = () => {
    let node = getNodeAt(p.mouseX, p.mouseY);

    if (node !== null) {
      connectionStart = node;
      connectionDragged = false;
      connectionStartScreen = p.createVector(p.mouseX, p.mouseY);
      return;
    }

    let tile = screenToTile(p.mouseX, p.mouseY);

    if (tile === null) {
      console.log("No tile detected");
      return;
    }

    let { x, y } = tile;

    if (buildings[x][y] !== null) return;
    if (!isBuildable(x, y)) return;

    spawnBuilding(x, y);
  };

  // =====================================
  // CONNECTION INPUT
  // =====================================

  p.mouseDragged = () => {
    if (!connectionStart || !connectionStartScreen) return;

    if (
      p.dist(
        p.mouseX,
        p.mouseY,
        connectionStartScreen.x,
        connectionStartScreen.y
      ) > 6
    ) {
      connectionDragged = true;
    }
  };

  p.mouseReleased = () => {
    if (!connectionStart) return;

    if (connectionDragged) {
      let target = getNodeAt(p.mouseX, p.mouseY);

      if (
        target &&
        isActiveNode(connectionStart.x, connectionStart.y) &&
        !sameNode(connectionStart, target) &&
        getNodeConnectionCount(connectionStart) < 2 &&
        getNodeConnectionCount(target) < 2 &&
        !connectionExists(connectionStart, target) &&
        !wouldIntersectConnection(connectionStart, target)
      ) {
        createConnection(connectionStart, target);
      }
    } else {
      connections = connections.filter(
        connection => !connectionHasNode(connection, connectionStart!)
      );
    }

    connectionStart = null;
    connectionDragged = false;
    connectionStartScreen = null;
  };

  // =====================================
  // SCREEN TO TILE
  // =====================================

  function screenToTile(mx: number, my: number): Node | null {
    let localX = mx - p.width / 2;
    let localY = my - 100;

    // search front to back so overlapping tiles
    // select the visually uppermost surface
    for (let sum = cols + rows - 2; sum >= 0; sum--) {
      for (let x = cols - 1; x >= 0; x--) {
        let y = sum - x;

        if (y < 0 || y >= rows) continue;

        let h = terrain[x][y];

        let isoX = (x - y) * tileW / 2;
        let isoY = (x + y) * tileH / 2 - h * heightStep;

        let dx = Math.abs(localX - isoX);
        let dy = Math.abs(localY - isoY);

        if (
          dx / (tileW / 2) +
          dy / (tileH / 2) <= 1
        ) {
          return { x, y };
        }
      }
    }

    return null;
  }

  // =====================================
  // GROUND SUPPORT
  // =====================================

  function isBuildable(x: number, y: number) {
    let h = terrain[x][y];

    if (h <= oceanElevation) return false;

    let neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1]
    ];

    for (let [nx, ny] of neighbors) {
      if (
        nx < 0 || nx >= cols ||
        ny < 0 || ny >= rows
      ) continue;

      if (Math.abs(terrain[nx][ny] - h) > flatnessThreshold) {
        return false;
      }
    }

    let flatNeighbors = 0;

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        let nx = x + dx;
        let ny = y + dy;

        if (
          nx < 0 || nx >= cols ||
          ny < 0 || ny >= rows
        ) continue;

        if (
          terrain[nx][ny] > oceanElevation &&
          Math.abs(terrain[nx][ny] - h) <= flatnessThreshold
        ) {
          flatNeighbors++;
        }
      }
    }

    return flatNeighbors >= requiredFlatNeighbors;
  }

  // =====================================
  // BUILDING CREATION
  // =====================================

  function spawnBuilding(x: number, y: number) {
    buildings[x][y] = {
      height: p.random(24, 48),
      currentHeight: 0,
      verticalVelocity: 0,
      foundationHeight: terrain[x][y],
      state: "spawning"
    };
  }

  // =====================================
  // BUILDING UPDATE
  // =====================================

  function updateBuildings(dt: number) {
    let spring = 180;
    let damping = 22;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        let b = buildings[x][y];

        if (b === null) continue;

        if (
          b.state !== "despawning" &&
          (
            terrain[x][y] !== b.foundationHeight ||
            !isBuildable(x, y)
          )
        ) {
          b.state = "despawning";
        }

        let targetHeight = b.state === "despawning"
          ? 0
          : b.height;

        let force = (targetHeight - b.currentHeight) * spring;

        b.verticalVelocity += force * dt;
        b.verticalVelocity -= b.verticalVelocity * damping * dt;

        b.currentHeight += b.verticalVelocity * dt;

        if (
          Math.abs(targetHeight - b.currentHeight) < 0.1 &&
          Math.abs(b.verticalVelocity) < 1
        ) {
          b.currentHeight = targetHeight;
          b.verticalVelocity = 0;

          if (b.state === "spawning") {
            b.state = "stable";
          }
        }

        if (
          b.state === "despawning" &&
          b.currentHeight <= 0.1 &&
          Math.abs(b.verticalVelocity) < 1
        ) {
          buildings[x][y] = null;
        }
      }
    }
  }

  // =====================================
  // BUILDING COUNT
  // =====================================

  function countBuildings() {
    let count = 0;

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (buildings[x][y] !== null) count++;
      }
    }

    return count;
  }

  // =====================================
  // VOXEL TERRAIN RENDERING
  // =====================================

  function drawVoxel(x: number, y: number) {
    let h = terrain[x][y];

    let isoX = (x - y) * tileW / 2;
    let isoY = (x + y) * tileH / 2;

    let topY = isoY - h * heightStep;

    let halfW = tileW / 2;
    let halfH = tileH / 2;

    // ocean is a single flat blue surface with no voxel walls
    if (h <= oceanElevation) {
      p.fill(35, 115, 175);
      p.noStroke();

      p.beginShape();
      p.vertex(isoX, topY - halfH);
      p.vertex(isoX + halfW, topY);
      p.vertex(isoX, topY + halfH);
      p.vertex(isoX - halfW, topY);
      p.endShape(p.CLOSE);

      return;
    }

    let top = p.color(85 + h * 15, 155 + h * 12, 85 + h * 5);
    let left = p.color(45 + h * 10, 100 + h * 9, 55 + h * 4);
    let right = p.color(30 + h * 8, 75 + h * 7, 45 + h * 4);

    let leftNeighbor = x > 0 ? terrain[x - 1][y] : oceanElevation;
    let rightNeighbor = y > 0 ? terrain[x][y - 1] : oceanElevation;

    let leftBottom = isoY - leftNeighbor * heightStep;
    let rightBottom = isoY - rightNeighbor * heightStep;

    // left wall
    if (leftNeighbor < h) {
      p.fill(left);
      p.noStroke();

      p.beginShape();
      p.vertex(isoX - halfW, topY);
      p.vertex(isoX, topY + halfH);
      p.vertex(isoX, isoY + halfH - leftNeighbor * heightStep);
      p.vertex(isoX - halfW, leftBottom);
      p.endShape(p.CLOSE);
    }

    // right wall
    if (rightNeighbor < h) {
      p.fill(right);
      p.noStroke();

      p.beginShape();
      p.vertex(isoX + halfW, topY);
      p.vertex(isoX, topY + halfH);
      p.vertex(isoX, isoY + halfH - rightNeighbor * heightStep);
      p.vertex(isoX + halfW, rightBottom);
      p.endShape(p.CLOSE);
    }

    // top face
    p.fill(top);
    p.noStroke();
    p.strokeWeight(1);

    p.beginShape();
    p.vertex(isoX, topY - halfH);
    p.vertex(isoX + halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX - halfW, topY);
    p.endShape(p.CLOSE);
  }

  // =====================================
  // BUILDING RENDERING
  // =====================================

  function drawBuilding(x: number, y: number, b: Building) {
    let isoX = (x - y) * tileW / 2;
    let isoY = (x + y) * tileH / 2;

    let baseY = isoY - b.foundationHeight * heightStep;
    let topY = baseY - b.currentHeight;

    let halfW = tileW / 2;
    let halfH = tileH / 2;

    let top = p.color(165, 170, 175);
    let left = p.color(115, 120, 125);
    let right = p.color(85, 90, 95);

    p.push();

    p.fill(left);
    p.noStroke();

    p.beginShape();
    p.vertex(isoX - halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX, baseY + halfH);
    p.vertex(isoX - halfW, baseY);
    p.endShape(p.CLOSE);

    p.fill(right);

    p.beginShape();
    p.vertex(isoX + halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX, baseY + halfH);
    p.vertex(isoX + halfW, baseY);
    p.endShape(p.CLOSE);

    p.fill(top);

    p.beginShape();
    p.vertex(isoX, topY - halfH);
    p.vertex(isoX + halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX - halfW, topY);
    p.endShape(p.CLOSE);

    p.pop();
  }

  // =====================================
  // BUILDING PLACEMENT PREVIEW
  // =====================================

  function drawPlacementPreview() {
    let tile = screenToTile(p.mouseX, p.mouseY);

    if (!tile) return;

    let { x, y } = tile;
    let valid = !buildings[x][y] && isBuildable(x, y);

    let isoX = (x - y) * tileW / 2;
    let isoY = (x + y) * tileH / 2;
    let topY = isoY - terrain[x][y] * heightStep;

    p.push();
    p.translate(isoX, topY);
    p.noStroke();

    if (valid) {
      p.fill(100, 255, 130, 100);
    } else {
      p.fill(255, 90, 90, 100);
    }

    p.beginShape();
    p.vertex(0, -tileH / 2);
    p.vertex(tileW / 2, 0);
    p.vertex(0, tileH / 2);
    p.vertex(-tileW / 2, 0);
    p.endShape(p.CLOSE);

    p.pop();
  }

  // =====================================
  // CONTINENT GRID
  // =====================================

  function isContinentTile(x: number, y: number) {
    if (
      x < 0 || x >= cols ||
      y < 0 || y >= rows
    ) {
      return false;
    }

    return terrain[x][y] >= continentThreshold;
  }

  function drawContinentGrid() {
    p.push();

    p.noFill();
    p.stroke(90, 210, 220, 190);
    p.strokeWeight(2);

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        if (!isContinentTile(x, y)) continue;

        let isoX = (x - y) * tileW / 2;
        let isoY = (x + y) * tileH / 2
          - gridElevation * heightStep;

        let halfW = tileW / 2;
        let halfH = tileH / 2;

        let top = p.createVector(isoX, isoY - halfH);
        let right = p.createVector(isoX + halfW, isoY);
        let bottom = p.createVector(isoX, isoY + halfH);
        let left = p.createVector(isoX - halfW, isoY);

        if (!isContinentTile(x, y - 1)) {
          p.line(top.x, top.y, right.x, right.y);
        }

        if (!isContinentTile(x - 1, y)) {
          p.line(top.x, top.y, left.x, left.y);
        }

        if (!isContinentTile(x + 1, y)) {
          p.line(right.x, right.y, bottom.x, bottom.y);
        }

        if (!isContinentTile(x, y + 1)) {
          p.line(bottom.x, bottom.y, left.x, left.y);
        }
      }
    }

    p.pop();
  }

  // =====================================
  // NODES
  // =====================================

  function drawNodes() {
    p.push();

    p.noStroke();
    p.fill(255, 210, 100);

    for (let x = 0; x < cols; x += nodeSpacing) {
      for (let y = 0; y < rows; y += nodeSpacing) {
        if (!isContinentTile(x, y)) continue;

        let isoX = (x - y) * tileW / 2;
        let isoY = (x + y) * tileH / 2
          - gridElevation * heightStep;

        p.circle(isoX, isoY, nodeSize);
      }
    }

    p.pop();
  }

  // =====================================
  // CONNECTION RENDERING
  // =====================================

  function drawConnections() {
    p.push();

    for (let connection of connections) {
      if (
        !isActiveNode(connection.a.x, connection.a.y) ||
        !isActiveNode(connection.b.x, connection.b.y)
      ) continue;

      let a = getNodePosition(connection.a);
      let b = getNodePosition(connection.b);

      drawParallelConnection(a, b, connection.colorPair);
    }

    if (connectionStart && connectionDragged) {
      let a = getNodePosition(connectionStart);
      let target = getNodeAt(p.mouseX, p.mouseY);

      let valid = (
        isActiveNode(connectionStart.x, connectionStart.y) &&
        target &&
        !sameNode(connectionStart, target) &&
        getNodeConnectionCount(connectionStart) < 2 &&
        getNodeConnectionCount(target) < 2 &&
        !connectionExists(connectionStart, target) &&
        !wouldIntersectConnection(connectionStart, target)
      );

      let endX = p.mouseX - p.width / 2;
      let endY = p.mouseY - 100;

      if (target) {
        let targetPosition = getNodePosition(target);
        endX = targetPosition.x;
        endY = targetPosition.y;
      }

      let b = p.createVector(endX, endY);

      if (valid) {
        drawParallelConnection(a, b, nextColorPair);
      } else {
        drawParallelConnection(a, b, -1);
      }
    }

    p.pop();
  }

  // =====================================
  // NODE HELPERS
  // =====================================

  function getNodeConnectionCount(node: Node) {
    return connections.filter(connection =>
      connectionHasNode(connection, node)
    ).length;
  }

  function isActiveNode(x: number, y: number) {
    return (
      x % nodeSpacing === 0 &&
      y % nodeSpacing === 0 &&
      isContinentTile(x, y)
    );
  }

  function getNodePosition(node: Node) {
    return p.createVector(
      (node.x - node.y) * tileW / 2,
      (node.x + node.y) * tileH / 2
        - gridElevation * heightStep
    );
  }

  function getNodeAt(mx: number, my: number): Node | null {
    for (let x = 0; x < cols; x += nodeSpacing) {
      for (let y = 0; y < rows; y += nodeSpacing) {
        if (!isActiveNode(x, y)) continue;

        let node = { x, y };
        let pos = getNodePosition(node);

        let screenX = p.width / 2 + pos.x;
        let screenY = 100 + pos.y;

        if (p.dist(mx, my, screenX, screenY) <= 12) {
          return node;
        }
      }
    }

    return null;
  }

  function sameNode(a: Node, b: Node) {
    return a.x === b.x && a.y === b.y;
  }

  function connectionHasNode(connection: Connection, node: Node) {
    return (
      sameNode(connection.a, node) ||
      sameNode(connection.b, node)
    );
  }

  function connectionExists(a: Node, b: Node) {
    return connections.some(connection =>
      (
        sameNode(connection.a, a) &&
        sameNode(connection.b, b)
      ) ||
      (
        sameNode(connection.a, b) &&
        sameNode(connection.b, a)
      )
    );
  }

  // =====================================
  // CONNECTION INTERSECTION
  // =====================================

  function orientation(a: p5.Vector, b: p5.Vector, c: p5.Vector) {
    return (
      (b.x - a.x) * (c.y - a.y) -
      (b.y - a.y) * (c.x - a.x)
    );
  }

  function onSegment(a: p5.Vector, b: p5.Vector, point: p5.Vector) {
    return (
      point.x >= Math.min(a.x, b.x) - 0.001 &&
      point.x <= Math.max(a.x, b.x) + 0.001 &&
      point.y >= Math.min(a.y, b.y) - 0.001 &&
      point.y <= Math.max(a.y, b.y) + 0.001
    );
  }

  function segmentsIntersect(
    a: p5.Vector,
    b: p5.Vector,
    c: p5.Vector,
    d: p5.Vector
  ) {
    let o1 = orientation(a, b, c);
    let o2 = orientation(a, b, d);
    let o3 = orientation(c, d, a);
    let o4 = orientation(c, d, b);

    let crosses =
      ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
      ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));

    if (crosses) return true;

    if (Math.abs(o1) < 0.001 && onSegment(a, b, c)) return true;
    if (Math.abs(o2) < 0.001 && onSegment(a, b, d)) return true;
    if (Math.abs(o3) < 0.001 && onSegment(c, d, a)) return true;
    if (Math.abs(o4) < 0.001 && onSegment(c, d, b)) return true;

    return false;
  }

  function updateConnections() {
    connections = connections.filter(connection =>
      isActiveNode(connection.a.x, connection.a.y) &&
      isActiveNode(connection.b.x, connection.b.y)
    );
  }

  function wouldIntersectConnection(a: Node, b: Node) {
    let newA = getNodePosition(a);
    let newB = getNodePosition(b);

    for (let connection of connections) {
      if (
        connectionHasNode(connection, a) ||
        connectionHasNode(connection, b)
      ) continue;

      if (
        !isActiveNode(connection.a.x, connection.a.y) ||
        !isActiveNode(connection.b.x, connection.b.y)
      ) continue;

      let oldA = getNodePosition(connection.a);
      let oldB = getNodePosition(connection.b);

      if (segmentsIntersect(newA, newB, oldA, oldB)) {
        return true;
      }
    }

    return false;
  }

  // =====================================
  // PARALLEL CONNECTION DRAWING
  // =====================================

  function drawParallelConnection(
    a: p5.Vector,
    b: p5.Vector,
    colorPair: number
  ) {
    let direction = p5.Vector.sub(b, a);
    let lineLength = direction.mag();

    if (lineLength === 0) return;

    direction.normalize();

    let normal = p.createVector(-direction.y, direction.x);
    let offset = 2.5;

    let offsetA = p5.Vector.mult(normal, offset);
    let offsetB = p5.Vector.mult(normal, -offset);

    let firstA = p5.Vector.add(a, offsetA);
    let firstB = p5.Vector.add(b, offsetA);

    let secondA = p5.Vector.add(a, offsetB);
    let secondB = p5.Vector.add(b, offsetB);

    let colors: ColorPair = colorPair === -1
        ? [[255, 80, 80], [255, 80, 80]]
        : connectionColors[colorPair];

    p.strokeWeight(2.5);

    p.stroke(p.color(...colors[0]));
    p.line(firstA.x, firstA.y, firstB.x, firstB.y);

    p.stroke(p.color(...colors[1]));
    p.line(secondA.x, secondA.y, secondB.x, secondB.y);
  }

  // =====================================
  // NETWORK COMPONENTS
  // =====================================

  function getNetworkComponent(start: Node) {
    let nodes: Node[] = [];
    let edges: Connection[] = [];
    let visited = new Set<string>();

    let queue = [start];

    while (queue.length > 0) {
      let current = queue.shift()!;
      let key = current.x + "," + current.y;

      if (visited.has(key)) continue;

      visited.add(key);
      nodes.push(current);

      for (let connection of connections) {
        if (
          sameNode(connection.a, current) ||
          sameNode(connection.b, current)
        ) {
          if (!edges.includes(connection)) {
            edges.push(connection);
          }

          let next = sameNode(connection.a, current)
            ? connection.b
            : connection.a;

          let nextKey = next.x + "," + next.y;

          if (!visited.has(nextKey)) {
            queue.push(next);
          }
        }
      }
    }

    return { nodes, edges };
  }

  // =====================================
  // CONNECTION CREATION + COLOR INHERITANCE
  // =====================================

  function createConnection(a: Node, b: Node) {
    let componentA = getNetworkComponent(a);
    let componentB = getNetworkComponent(b);

    let assignedColor = nextColorPair;

    nextColorPair = (
      nextColorPair + 1
    ) % connectionColors.length;

    let dominantColor = assignedColor;

    let sameComponent = componentA.nodes.some(node =>
      sameNode(node, b)
    );

    if (sameComponent) {
      if (componentA.edges.length > 0) {
        dominantColor = componentA.edges[0].colorPair;
      }
    } else if (
      componentA.edges.length > 0 &&
      componentB.edges.length > 0
    ) {
      let componentALarger =
        componentA.nodes.length >= componentB.nodes.length;

      let winner = componentALarger ? componentA : componentB;
      let loser = componentALarger ? componentB : componentA;

      dominantColor = winner.edges[0].colorPair;

      for (let edge of loser.edges) {
        edge.colorPair = dominantColor;
      }
    } else if (componentA.edges.length > 0) {
      dominantColor = componentA.edges[0].colorPair;
    } else if (componentB.edges.length > 0) {
      dominantColor = componentB.edges[0].colorPair;
    }

    let newConnection: Connection = {
      a: { x: a.x, y: a.y },
      b: { x: b.x, y: b.y },
      colorPair: dominantColor
    };

    connections.push(newConnection);

    metros.push({
      connection: newConnection,
      railIndex: 0,
      direction: 1,
      progress: 0
    });

    metros.push({
      connection: newConnection,
      railIndex: 1,
      direction: -1,
      progress: 0
    });
  }

  // =====================================
  // METRO MOVEMENT
  // =====================================

  function updateMetros(dt: number) {
    metros = metros.filter(metro =>
      connections.includes(metro.connection)
    );

    for (let i = metros.length - 1; i >= 0; i--) {
      let metro = metros[i];

      let a = getNodePosition(metro.connection.a);
      let b = getNodePosition(metro.connection.b);

      let distance = p5.Vector.dist(a, b);

      if (distance <= 0) {
        metros.splice(i, 1);
        continue;
      }

      metro.progress += (metroSpeed * dt) / distance;

      if (metro.progress >= 1) {
        metros.splice(i, 1);
      }
    }
  }

  function drawMetros() {
    p.push();

    p.rectMode(p.CENTER);
    p.noStroke();

    for (let metro of metros) {
      let connection = metro.connection;

      if (
        !isActiveNode(connection.a.x, connection.a.y) ||
        !isActiveNode(connection.b.x, connection.b.y)
      ) continue;

      let a = getNodePosition(connection.a);
      let b = getNodePosition(connection.b);

      let direction = p5.Vector.sub(b, a);
      let angle = Math.atan2(direction.y, direction.x);

      direction.normalize();

      let normal = p.createVector(-direction.y, direction.x);
      let offset = metro.railIndex === 0 ? 2.5 : -2.5;

      let t = metro.direction === 1
        ? metro.progress
        : 1 - metro.progress;

      let position = p.createVector(
        p.lerp(a.x, b.x, t),
        p.lerp(a.y, b.y, t)
      );

      position.add(p5.Vector.mult(normal, offset));

      p.push();
      p.translate(position.x, position.y);

      if (metro.direction === -1) {
        p.rotate(angle + p.PI);
      } else {
        p.rotate(angle);
      }

      p.fill(p.color(
        ...connectionColors[connection.colorPair][metro.railIndex]
      ));

      p.rect(0, 0, metroSize, 4, 1);
      p.pop();
    }

    p.pop();
  }

  // =====================================
  // STATIONS
  // =====================================

  function drawStationConnector(x: number, startY: number, endY: number) {
    p.noStroke();
    p.fill(255, 210, 100, 210);

    for (
      let y = startY;
      y > endY;
      y -= stationDotSpacing
    ) {
      p.circle(x, y, stationDotSize);
    }
  }

  function drawStation(x: number, y: number) {
    let isoX = (x - y) * tileW / 2;
    let isoY = (x + y) * tileH / 2;

    let baseY = isoY - terrain[x][y] * heightStep;
    let topY = baseY - stationHeight;

    let halfW = stationWidth / 2;
    let halfH = stationWidth / 4;

    p.push();
    p.noStroke();
    p.strokeWeight(1);

    // left wall
    p.fill(115, 120, 125);

    p.beginShape();
    p.vertex(isoX - halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX, baseY + halfH);
    p.vertex(isoX - halfW, baseY);
    p.endShape(p.CLOSE);

    // right wall
    p.fill(85, 90, 95);

    p.beginShape();
    p.vertex(isoX + halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX, baseY + halfH);
    p.vertex(isoX + halfW, baseY);
    p.endShape(p.CLOSE);

    // roof
    p.fill(245, 190, 85);

    p.beginShape();
    p.vertex(isoX, topY - halfH);
    p.vertex(isoX + halfW, topY);
    p.vertex(isoX, topY + halfH);
    p.vertex(isoX - halfW, topY);
    p.endShape(p.CLOSE);

    p.pop();
  }

  function drawStationConnectors() {
    p.push();

    for (let x = 0; x < cols; x += nodeSpacing) {
      for (let y = 0; y < rows; y += nodeSpacing) {
        if (!isActiveNode(x, y)) continue;

        let node = { x, y };

        if (getNodeConnectionCount(node) < 1) continue;

        let nodePosition = getNodePosition(node);

        let isoX = (x - y) * tileW / 2;
        let isoY = (x + y) * tileH / 2;

        let groundY = isoY - terrain[x][y] * heightStep;

        drawStationConnector(
          isoX,
          nodePosition.y,
          groundY
        );
      }
    }

    p.pop();
  }
};

export default layeredTerrain;
