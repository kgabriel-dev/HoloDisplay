import { Injectable } from '@angular/core';
import { SettingsBroadcastingService } from '../settings-broadcasting.service';

@Injectable({
  providedIn: 'root',
})
export class HelperService {
  constructor(private settingsBroadcast: SettingsBroadcastingService) {}

  getPointOnCircle(radius: number, angle: number, center: Point): Point {
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  }

  getEvenlySpacedPointsOnCircle(
    radius: number,
    center: Point,
    amount: number
  ): Point[] {
    const points: Point[] = [],
      angle = (2 * Math.PI) / amount;

    for (let i = 0; i < amount; i++) {
      points.push(this.getPointOnCircle(radius, i * angle, center));
    }

    return points;
  }

  connectPointsWithStraightLines(
    canvasContext: CanvasRenderingContext2D,
    points: Point[],
    color: string
  ): void {
    if (points.length < 2) return;

    // store the old settings to restore them later
    canvasContext.save();

    // set the color
    canvasContext.strokeStyle = color;

    // draw the first point and then the other points
    canvasContext.beginPath();
    canvasContext.moveTo(points[0].x, points[0].y);

    points.slice(1).forEach((point) => canvasContext.lineTo(point.x, point.y));

    canvasContext.closePath();
    canvasContext.stroke();

    canvasContext.restore();
  }

  createImages(imageDataArr: string[]): HTMLImageElement[] {
    const imageArr: HTMLImageElement[] = [];

    imageDataArr.forEach((imageData) => {
      const image = new Image();
      image.src = imageData;

      imageArr.push(image);
    });

    return imageArr;
  }
}

export type Point = { x: number; y: number };
