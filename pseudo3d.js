const symbols = [' ', '▮', 'C'];
const walls = ['▓', '▒', '░', 'O', '=', ':', '.', ' '];

class World {
  constructor(map) {
    this.map = map;
    this.camSize = [160 * 2, 40 * 2];
    this.camera = new Camera(this.camSize);
    this.framerate = 15;
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

    let rawFrame = frame.split('');
    return this.camera.get3DFrame(rawFrame);
  }
}

class Camera {
  constructor(size, world) {
    this.pos = [50, 15];
    this.size = size;

    this.viewRadius = 500;
    this.fov = Math.PI / 2;
    this.movementCorrection = 2.5 * Math.PI / 1.5;
    this.rotation = - 3 * Math.PI / 4;

    this.frame = null;
  }

  move(keyName) {
    let [x, y] = this.pos;
    let sin = Math.round(Math.sin(this.rotation - this.movementCorrection) * 1.2);
    let cos = Math.round(Math.cos(this.rotation - this.movementCorrection) * 1.2);

    const changePos = (c, s) => {
      if (this.frame[x + c + (y + s) * (this.size[0] + 1)] !== symbols[1]) {
        this.pos[0] += c;
        this.pos[1] += s;
      } else if (this.frame[x + c + y * (this.size[0] + 1)] !== symbols[1]) {
        this.pos[0] += c;
      } else if (this.frame[x + (y + s) * (this.size[0] + 1)] !== symbols[1]) {
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
    this.frame = [...rawFrame];

    const [x, y] = this.pos;
    const wallHeight = this.size[1];
    const fovStep = Math.PI / 288; // 576 is good
    const maxIter = this.fov / fovStep;

    let newFrame = rawFrame.map(e => e !== '\n' ? ' ' : '\n').join('').split('\n').map(e => [...e]);
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

      if (absCos > this.viewRadius / 2) {
        for (let i = 0; i <= absCos; i++) {
          let o = i * cosSign;
          intersection = this.setFrameElement(rawFrame, x + o, y + fnY(o), this.size[0] + 1, ' ', '.');

          if (intersection) {
            const column = Math.round((iter * this.size[0]) / maxIter); // 192 for 120 FOV and pi / 288 per i
            const distance = Math.pow(fnY(i)*fnY(i) + i*i, 1/2);
            let objHeight = distance > 0 ? Math.round((10 / distance) * wallHeight) : wallHeight;
            objHeight = objHeight > this.size[1] ? this.size[1] : objHeight;

            for (let h = 0; h <= objHeight; h++) {
              let sym = ' ';

              if (objHeight / wallHeight > 0.9) sym = walls[0];
              else if (objHeight / wallHeight > 0.7) sym = walls[1];
              else if (objHeight / wallHeight > 0.5) sym = walls[2];
              else if (objHeight / wallHeight > 0.4) sym = walls[3];
              else if (objHeight / wallHeight > 0.3) sym = walls[4];
              else if (objHeight / wallHeight > 0.2) sym = walls[5];
              else if (objHeight / wallHeight > 0.1) sym = walls[6];
              else sym = walls[7];

              newFrame[h + Math.round((wallHeight - objHeight)/2)][column] = sym;
            }

            break;
          };
        }
      } else {
        for (let i = 0; i <= absSin; i++) {
          let o = i * sinSign;
          intersection = this.setFrameElement(rawFrame, x + fnX(o), y + o, this.size[0] + 1, ' ', '.');

          if (intersection) {
            const column = Math.round((iter * this.size[0]) / maxIter); // 192 for 120 FOV and pi / 288 per i
            const distance = Math.pow(fnX(i)*fnX(i) + i*i, 1/2);
            let objHeight = distance > 0 ? Math.round((10 / distance) * wallHeight) : wallHeight;
            objHeight = objHeight > this.size[1] ? this.size[1] : objHeight;

            for (let h = 0; h <= objHeight; h++) {
              let sym = ' ';

              if (objHeight / wallHeight > 0.9) sym = walls[0];
              else if (objHeight / wallHeight > 0.7) sym = walls[1];
              else if (objHeight / wallHeight > 0.5) sym = walls[2];
              else if (objHeight / wallHeight > 0.4) sym = walls[3];
              else if (objHeight / wallHeight > 0.3) sym = walls[4];
              else if (objHeight / wallHeight > 0.2) sym = walls[5];
              else if (objHeight / wallHeight > 0.1) sym = walls[6];
              else sym = walls[7];

              newFrame[h + Math.round((wallHeight - objHeight)/2)][column] = sym;
            }

            break;
          };
        }
      }

      iter++;
    }

    rawFrame[x + y * (this.size[0] + 1)] = symbols[symbols.length - 1];
    const minimap = rawFrame.join('').split('\n').map(e => e.split('').filter((s, i) => i % 4 === 0).join('')).filter((e, i) => i % 4 === 0).join('\n');
    console.log(minimap);
    return newFrame.map(e => e.join('') + '\n').join('');
  }

  setFrameElement(frameArray, x, y, rowSize, checkVal, val) {
    let oldVal = frameArray[x + y * rowSize];

    if (oldVal !== checkVal && oldVal !== val) {
      return true;
    }

    frameArray[x + y * rowSize] = val;
    return false;
  }
}

module.exports = World;
