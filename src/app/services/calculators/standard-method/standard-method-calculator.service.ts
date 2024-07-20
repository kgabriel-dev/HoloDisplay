import { Injectable } from '@angular/core';
import { HelperService } from '../../helpers/helper.service';

@Injectable({
  providedIn: 'root'
})
export class StandardMethodCalculatorService {

  constructor(private helperService: HelperService) { }

  public calculateAndDownload(sides: number, slopeDeg: number, inside: number, outside: number, dpi: number) {
    // calculations for the inner circle
    const innerPoints = this.helperService.getEvenlySpacedPointsOnCircle(inside/2, { x: 0, y: 0 }, sides),
      sideA = Math.sqrt(Math.pow(innerPoints[0].x - innerPoints[1].x, 2) + Math.pow(innerPoints[0].y - innerPoints[1].y, 2));

    // calculations for the outer circle
    const outerPoints = this.helperService.getEvenlySpacedPointsOnCircle(outside/2, { x: 0, y: 0 }, sides),
      sideB = Math.sqrt(Math.pow(outerPoints[0].x - outerPoints[1].x, 2) + Math.pow(outerPoints[0].y - outerPoints[1].y, 2));

    // calculate the height of the trapeze
    const trapezeAngleDeg = 90 - slopeDeg,
      trapezeAngleRad = trapezeAngleDeg * Math.PI / 180;

    const sideDistance = this.helperService.getDistanceBetweenParallelLines(innerPoints[0], innerPoints[1], outerPoints[0]);
    const trapezeTiltedHeight = sideDistance / Math.sin(trapezeAngleRad);

    // create the image and download it
    const imageResizeFactor = dpi / 96;
    this.drawAndSaveImage(sideA, sideB, trapezeTiltedHeight, imageResizeFactor);
  }

  private drawAndSaveImage(sideA: number, sideB: number, tiltedHeight: number, imageResizeFactor: number) {
    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');
    if(!ctx) return;

    sideA *= imageResizeFactor;
    sideB *= imageResizeFactor;
    tiltedHeight *= imageResizeFactor;

    canvas.width = sideB + 3;
    canvas.height = tiltedHeight + 3;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';

    ctx.moveTo(1, 1);
    ctx.lineTo(sideB + 1, 1);
    ctx.lineTo(sideA + (sideB - sideA) / 2 + 1, tiltedHeight + 1);
    ctx.lineTo((sideB - sideA) / 2 + 1, tiltedHeight + 1);
    ctx.lineTo(1, 1);
    ctx.stroke(); ctx.fill();

    const image = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    const link = document.createElement('a');
    link.download = 'mirror cutting template.png';
    link.href = image;
    link.click();
  }

  public calculateImage(sides: number, slopeDeg: number, inside: number, outside: number): HTMLCanvasElement | undefined {
    // calculations for the inner circle
    const innerPoints = this.helperService.getEvenlySpacedPointsOnCircle(inside/2, { x: 0, y: 0 }, sides),
      sideA = Math.sqrt(Math.pow(innerPoints[0].x - innerPoints[1].x, 2) + Math.pow(innerPoints[0].y - innerPoints[1].y, 2));

    // calculations for the outer circle
    const outerPoints = this.helperService.getEvenlySpacedPointsOnCircle(outside/2, { x: 0, y: 0 }, sides),
      sideB = Math.sqrt(Math.pow(outerPoints[0].x - outerPoints[1].x, 2) + Math.pow(outerPoints[0].y - outerPoints[1].y, 2));

    // calculate the height of the trapeze
    const trapezeAngleDeg = 90 - slopeDeg,
      trapezeAngleRad = trapezeAngleDeg * Math.PI / 180;

    const sideDistance = this.helperService.getDistanceBetweenParallelLines(innerPoints[0], innerPoints[1], outerPoints[0]);
    const trapezeTiltedHeight = sideDistance / Math.sin(trapezeAngleRad);

    // create the image and return it
    return this.drawImage(sideA, sideB, trapezeTiltedHeight);
  }

  private drawImage(sideA: number, sideB: number, tiltedHeight: number) {
    const canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d');
    if(!ctx) return;

    canvas.width = sideB + 3;
    canvas.height = tiltedHeight + 3;
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black'; ctx.fillStyle = 'black';

    ctx.moveTo(1, 1);
    ctx.lineTo(sideB + 1, 1);
    ctx.lineTo(sideA + (sideB - sideA) / 2 + 1, tiltedHeight + 1);
    ctx.lineTo((sideB - sideA) / 2 + 1, tiltedHeight + 1);
    ctx.lineTo(1, 1);
    ctx.stroke(); ctx.fill();

    return canvas;
  }
}