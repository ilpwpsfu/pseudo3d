const symbols = [' ', '▮', 'C'];
const walls = ['▓', '▒', '░', ':', '.'];

class World {
  constructor(map) {
    this.map = map;
    this.camSize = [160, 40];
    this.user = new Camera;
  }

  generateFrame(keyName, flat = true) {
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

    let frameWithoutCamera = frame.split('');
    return this.user.move(keyName, frameWithoutCamera, flat);
  }
}

class Camera {
  constructor() {
    this.pos = [50, 15];
    this.size = [160, 40];
    this.viewRadius = 100;
    this.rotation = - 3 * Math.PI / 4;
  }

  move(keyName, frameArray, flat) {
    let [x, y] = this.pos;
    let sin = Math.round(Math.sin(this.rotation - 2.5 * Math.PI / 1.5) * 1.5);
    let cos = Math.round(Math.cos(this.rotation - 2.5 * Math.PI / 1.5) * 1.5);

    const changePos = (c, s) => {
      if (frameArray[x + c + (y + s) * (this.size[0] + 1)] !== symbols[1]) {
        this.pos[0] += c;
        this.pos[1] += s;
      } else if (frameArray[x + c + y * (this.size[0] + 1)] !== symbols[1]) {
        this.pos[0] += c;
      } else if (frameArray[x + (y + s) * (this.size[0] + 1)] !== symbols[1]) {
        this.pos[1] += s;
      }
    };

    if (keyName === 'q') {
      this.rotation -= Math.PI / 36;
    } else if (keyName === 'e') {
      this.rotation += Math.PI / 36;
    }

    else if (keyName === 'w') changePos(cos, sin);
    else if (keyName === 's') changePos(-cos, -sin); 
    else if (keyName === 'd') changePos(-sin, cos);
    else if (keyName === 'a') changePos(sin, -cos);
   
    [x, y] = this.pos;

    if (flat) {
      const frameArrayWithFOV = this.fieldOfView2D([...frameArray]);

      frameArrayWithFOV[x + y * (this.size[0] + 1)] = symbols[symbols.length - 1];

      return frameArrayWithFOV.join('');
    }

    return this.get3DFrame([...frameArray]).join('');
  }

  get3DFrame(rawFrame) {
    const [x, y] = this.pos;
    const wallHeight = this.size[1];
    let newFrame = rawFrame.map(e => e !== '\n' ? ' ' : '\n').join('').split('\n').map(e => [...e]);
    let iter = 0;

    for (let angle = 0 + this.rotation; angle <= Math.PI / 2 + this.rotation; angle += Math.PI / 576) {
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
            const column = Math.round((iter * 160) / 288); // 192 for 120 FOV and pi / 288 per i
            const distance = Math.pow(fnY(i)*fnY(i) + i*i, 1/2);
            let objHeight = distance > 0 ? Math.round((10 / distance) * wallHeight) : wallHeight;
            objHeight = objHeight > this.size[1] ? this.size[1] : objHeight;

            for (let h = 0; h <= objHeight; h++) {
              let sym = ' ';

              if (objHeight / wallHeight > 0.8) sym = walls[0];
              else if (objHeight / wallHeight > 0.6) sym = walls[1];
              else if (objHeight / wallHeight > 0.4) sym = walls[2];
              else if (objHeight / wallHeight > 0.2) sym = walls[3];
              else sym = walls[4];

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
            const column = Math.round((iter * 160) / 288); // 192 for 120 FOV and pi / 288 per i
            const distance = Math.pow(fnX(i)*fnX(i) + i*i, 1/2);
            let objHeight = distance > 0 ? Math.round((10 / distance) * wallHeight) : wallHeight;
            objHeight = objHeight > this.size[1] ? this.size[1] : objHeight;

            for (let h = 0; h <= objHeight; h++) {
              let sym = ' ';

              if (objHeight / wallHeight > 0.8) sym = walls[0];
              else if (objHeight / wallHeight > 0.6) sym = walls[1];
              else if (objHeight / wallHeight > 0.4) sym = walls[2];
              else if (objHeight / wallHeight > 0.2) sym = walls[3];
              else sym = walls[4];

              newFrame[h + Math.round((wallHeight - objHeight)/2)][column] = sym;
            }

            break;
          };
        }
      }

      iter++;
    }

    console.log(rawFrame.join(''))
    return newFrame.map(e => e.join('') + '\n');
  }

  fieldOfView2D(frameArray) {
    let [x, y] = this.pos;

    for (let angle = 0 + this.rotation; angle <= Math.PI / 2 + this.rotation; angle += Math.PI / 144) {
      const cos = Math.round(Math.cos(angle) * this.viewRadius);
      const sin = Math.round(Math.sin(angle) * this.viewRadius);
      const fnY = (o) => {
        return Math.round(o * (sin / cos)); // y = (sin / cos) * x
      }
      const fnX = (o) => {
        return Math.round(o * (cos / sin)); // y = (sin / cos) * x
      }

      let absCos = Math.abs(cos);
      let absSin = Math.abs(sin);

      let cosSign = cos / absCos;
      let sinSign = sin / absSin;

      let intersection = false;

      if (absCos > this.viewRadius / 2) {
        for (let i = 0; i <= absCos; i++) {
          let o = i * cosSign;
          intersection = this.setFrameElement(frameArray, x + o, y + fnY(o), this.size[0] + 1, ' ', '.');

          if (intersection) break;
        }
      } else {
        for (let i = 0; i <= absSin; i++) {
          let o = i * sinSign;
          intersection = this.setFrameElement(frameArray, x + fnX(o), y + o, this.size[0] + 1, ' ', '.');

          if (intersection) break;
        }
      }
    }

    return frameArray;
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
