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

    const trapezeTiltedHeight = (canvasWidth / layers) / Math.cos(rectangleAngleRad);
    
    const width = canvasHeight;

    // create the image and return it
    return this.drawImage(trapezeTiltedHeight, width);
  }

  private drawImage(tiltedHeight: number, width: number) {
    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');
    if(!ctx) return;

    canvas.width = width + 3;
    canvas.height = tiltedHeight + 3;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';

    ctx.moveTo(1, 1);
    ctx.lineTo(width + 1, 1);
    ctx.lineTo(width + 1, tiltedHeight + 1);
    ctx.lineTo(1, tiltedHeight + 1);
    ctx.lineTo(1, 1);
    ctx.stroke(); ctx.fill();

    return canvas;
  }
}
