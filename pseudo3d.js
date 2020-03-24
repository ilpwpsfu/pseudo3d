const symbols = [' ', '▮', 'C'];
const walls = ['▓', '▒', '░', 'O', '=', ':', '.', ' '];

class World {
  constructor(map, camSize, framerate = 15) {
    this.map = map;
    this.camSize = camSize;
    this.camera = new Camera(camSize);
    this.framerate = framerate;
    this.renderer = null;
  }

  startRendering() {
    if (this.renderer !== null) return;

    this.renderer = setInterval(() => {
      console.clear();
      console.log(this.generateFrame());
    }, 1000 / this.framerate);
  }

  stopRendering() {
    this.renderer = null;
  }

  generateFrame() {
    const heightOfARow = this.camSize[1] / this.map.length;
    const widthOfAnElement = this.camSize[0] / this.map[0].length;
    let frame = '';
    
    this.map.forEach(row => {
      let rowOutput = '';

      row.forEach(v => {
        for (let i = 0; i < widthOfAnElement; i++) {
          rowOutput += symbols[v];
        }
      });

      for (let i = 0; i < heightOfARow; i++) {
        frame += rowOutput + '\n';
      }
    });

    return this.camera.get3DFrame(frame);
  }
}

class Camera {
  constructor(size) {
    this.pos = [null, null];
    this.size = size;

    this.viewRadius = 500;
    this.fov = Math.PI / 2;
    this.movementCorrection = 2.5 * Math.PI / 1.5;
    this.rotation = - 3 * Math.PI / 4;

    this.rawFrameArray = null;
  }

  initPosition() {
    let y = Math.round(Math.random() * (this.rawFrameArray.length - 1));
    let x = Math.round(Math.random() * (this.rawFrameArray[0].length - 1));
    let value = this.rawFrameArray[y][x];

    while (value !== symbols[0]) {
      y = Math.round(Math.random() * (this.rawFrameArray.length - 1));
      x = Math.round(Math.random() * (this.rawFrameArray[0].length - 1));
      value = this.rawFrameArray[y][x];
    }

    this.pos = [x, y];
  }

  move(keyName) {
    let [x, y] = this.pos;
    let sin = Math.round(Math.sin(this.rotation - this.movementCorrection) * 1.2);
    let cos = Math.round(Math.cos(this.rotation - this.movementCorrection) * 1.2);

    const changePos = (c, s) => {
      if (this.rawFrameArray[y + s][x + c] !== symbols[1]) {
        this.pos[0] += c;
        this.pos[1] += s;
      } else if (this.rawFrameArray[y][x + c] !== symbols[1]) {
        this.pos[0] += c;
      } else if (this.rawFrameArray[y + s][x] !== symbols[1]) {
        this.pos[1] += s;
      }
    };

    // Rotation and FOV control
    if      (keyName === 'q') this.rotation -= Math.PI / 36;
    else if (keyName === 'e') this.rotation += Math.PI / 36;
    else if (keyName === 'o') this.fov -= Math.PI / 18;
    else if (keyName === 'p') this.fov += Math.PI / 18;
    else if (keyName === 'i') this.fov = Math.PI / 2;

    // View radius control
    else if (keyName === 'k') this.viewRadius -= 10;
    else if (keyName === 'l') this.viewRadius += 10;
    else if (keyName === 'j') this.viewRadius = 500;

    // Movement control
    else if (keyName === 'w') changePos(cos, sin);
    else if (keyName === 's') changePos(-cos, -sin); 
    else if (keyName === 'd') changePos(-sin, cos);
    else if (keyName === 'a') changePos(sin, -cos);
  }

  get3DFrame(rawFrame) {
    this.rawFrameArray = rawFrame.split('\n').map(e => [...e]);

    if (this.pos[0] === null) {
      this.initPosition();
    }

    const [x, y] = this.pos;
    const wallHeight = this.size[1];
    const fovStep = Math.PI / 288; // 576 is good
    const maxIter = this.fov / fovStep;

    let frame = this.rawFrameArray.map(e => e.map(_ => ' '));
    let iter = 0;

    for (let angle = 0 + this.rotation; angle <= this.fov + this.rotation; angle += fovStep) {
      const cos = Math.round(Math.cos(angle) * this.viewRadius);
      const sin = Math.round(Math.sin(angle) * this.viewRadius);

      const fnY = (o) => Math.round(o * (sin / cos));
      const fnX = (o) => Math.round(o * (cos / sin));

      let absCos = Math.abs(cos);
      let absSin = Math.abs(sin);

      let cosSign = cos / absCos;
      let sinSign = sin / absSin;

      let intersection = false;

      const castARay = (iLimit, limitSign, fn, isSin = false) => {
        let intersection = false;

        for (let i = 0; i <= iLimit; i++) {
          let o = i * limitSign;
          let w = isSin ? x + fn(o) : x + o;
          let h = isSin ? y + o : y + fn(o);

          intersection = this.setFrameElement(this.rawFrameArray, w, h, ' ', '.');

          if (intersection) {
            const column = Math.round((iter * this.size[0]) / maxIter); // 192 for 120 FOV and pi / 288 per i
            const distance = Math.pow(fn(i)*fn(i) + i*i, 1/2);
            let objHeight = distance > 0 ? Math.round((10 / distance) * wallHeight) : wallHeight;
            objHeight = objHeight > this.size[1] ? this.size[1] : objHeight;

            for (let h = 0; h <= objHeight; h++) {
              let sym = ' ';

              if      (objHeight / wallHeight > 0.9) sym = walls[0];
              else if (objHeight / wallHeight > 0.7) sym = walls[1];
              else if (objHeight / wallHeight > 0.5) sym = walls[2];
              else if (objHeight / wallHeight > 0.4) sym = walls[3];
              else if (objHeight / wallHeight > 0.3) sym = walls[4];
              else if (objHeight / wallHeight > 0.2) sym = walls[5];
              else if (objHeight / wallHeight > 0.1) sym = walls[6];
              else sym = walls[7];

              frame[h + Math.round((wallHeight - objHeight) / 2)][column] = sym;
            }

            break;
          }
        }
      }

      if (absCos > this.viewRadius / 2) {
        castARay(absCos, cosSign, fnY);
      } else {
        castARay(absSin, sinSign, fnX, true);
      }

      iter++;
    }

    this.renderMinimap();
    return frame.map(e => e.join('')).join('\n');
  }

  renderMinimap() {
    const minimap = this.rawFrameArray.map(e => e.filter((s, i) => i % 4 === 0).join('')).filter((e, i) => i % 4 === 0).join('\n');
    console.log(minimap);
  }

  setFrameElement(frameArray, x, y, checkVal, val) {
    let oldVal = frameArray[y][x];

    if (oldVal !== checkVal && oldVal !== val) {
      return true;
    }

    frameArray[y][x] = val;
    return false;
  }
}

module.exports = World;
