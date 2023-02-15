import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor() { }

  getPointOnCircle(radius: number, angle: number, center: Point): Point {
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    }
  }

  getEvenlySpacedPointsOnCircle(radius: number, center: Point, amount: number) {
    const points: Point[] = [],
      angle = 2 * Math.PI / amount;

    for(let i = 0; i < amount; i++) {
      points.push(this.getPointOnCircle(radius, i * angle, center));
    }

    return points;
  }
}

export type Point = { x: number; y: number };
