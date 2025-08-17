import { Injectable } from '@angular/core';
import { HelperService } from '../../helpers/helper.service';

@Injectable({
  providedIn: 'root'
})
export class LayeredMethodCalculatorService {

  constructor(private helperService: HelperService) { }

  public calculateImage(layers: number, slopeDeg: number, canvasWidth: number, canvasHeight: number): HTMLCanvasElement | undefined {
    const rectangleAngleDeg = 90 - slopeDeg,
      rectangleAngleRad = rectangleAngleDeg * Math.PI / 180;

    // calculate the length of the tilted rectangle
    // this is the canvas width divided by the number of layers with the slope applied
    const tiltedHeight = (canvasWidth / layers) / Math.cos(rectangleAngleRad);
    
    // the width of the rectangle is the same as the canvas height
    // since the image is shown at a 90-degree angle
    const width = canvasHeight;

    // create the image and return it
    return this.drawImage(width, tiltedHeight);
  }

  private drawImage(width: number, height: number) {
    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');
    if(!ctx) return;

    canvas.width = width + 3;
    canvas.height = height + 3;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';

    ctx.moveTo(1, 1);
    ctx.lineTo(width + 1, 1);
    ctx.lineTo(width + 1, height + 1);
    ctx.lineTo(1, height + 1);
    ctx.lineTo(1, 1);
    ctx.stroke(); ctx.fill();

    return canvas;
  }
}
