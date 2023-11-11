import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HelperService {
  constructor() {}

  getPointOnCircle(radius: number, angle: number, center: Point): Point {
    return {
      x: center.x + radius * Math.cos(-angle),
      y: center.y + radius * Math.sin(-angle),
    };
  }

  getEvenlySpacedPointsOnCircle(
    radius: number,
    center: Point,
    amount: number,
    offsetAngle = 0
  ): Point[] {
    const points: Point[] = [],
      angle = (2 * Math.PI) / amount;

    for (let i = 0; i < amount; i++) {
      points.push(this.getPointOnCircle(radius, i * angle + offsetAngle, center));
    }

    return points;
  }

  connectPointsWithStraightLines(
    canvasContext: CanvasRenderingContext2D,
    points: Point[],
    color: string
  ): void {
    if (points.length < 2) return;

    canvasContext.save();
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

  getDistanceBetweenParallelLines(point1: Point, point2: Point, point3: Point) {
    const numerator = Math.abs(
      (point2.y - point1.y) * point3.x
      + (point1.x - point2.x) * point3.y
      + (point2.x * point1.y - point1.x * point2.y)
    );
  
    const denominator = Math.sqrt(
      (point2.y - point1.y) ** 2
      + (point1.x - point2.x) ** 2
    );
  
    return numerator / denominator;
  }

  getRadiusOfIncircleOfRegularPolygon(circumcircleRadius: number, sideCount: number): number {
    return circumcircleRadius * Math.cos(Math.PI / sideCount);
  }

  centerPoints(points: Point[], offset?: {dx: number, dy: number}): CenteredPoints {
    let workPoints = this.copyPointsArray(points); // copy the points array
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    if(!offset) {
      workPoints.forEach((point) => {
        if(!minX || point.x < minX) minX = point.x;
        if(!maxX || point.x > maxX) maxX = point.x;
        if(!minY || point.y < minY) minY = point.y;
        if(!maxY || point.y > maxY) maxY = point.y;
      });
    }

    const dx = offset?.dx || (minX + maxX) / 2;
    const dy = offset?.dy || (minY + maxY) / 2;

    workPoints.forEach((point) => {
      point.x -= dx;
      point.y -= dy;
    });

    return {points: workPoints, offset: {dx, dy}};
  }

  private calculateMaxRegPolygonPointsHeuristic(canvas: number, sideCount: number, centerPoints = true): Polygon {
    const getPolygonFromCircle = function(radius: number, rotation: number): Point[] {
      const points: Point[] = [];
      const angle = 2 * Math.PI / sideCount;

      for(let i = 0; i < sideCount; i++) {
        points.push({
          x: radius * Math.cos(i * angle + rotation),
          y: radius * Math.sin(i * angle + rotation)
        });
      }

      return points;
    };

    const isTooBig = function(canvasSize: number, points: Point[]): boolean {
      let tooBig = false;
      
      points.forEach((point) => {
        if(Math.abs(point.x) > canvasSize/2 || Math.abs(point.y) > canvasSize/2) tooBig = true;
      });

      return tooBig;
    }
    
    let rotation = 0;

    let bestSideLegth = Number.MIN_SAFE_INTEGER, bestPoints!: Point[], bestRotation = 0;

    // find the best rotation
    while(rotation < 2 * Math.PI/sideCount) {
      let radius = canvas/2;
      let change = 8;
      let points = getPolygonFromCircle(radius, 0);
      let tooBig = isTooBig(canvas, this.centerPoints(points).points);

      rotation += Math.PI / 180;

      // find the best radius for the current rotation
      let radiusIteration = 0;
      while(radiusIteration < 300) {
        if(tooBig) radius -= change;
        else {
          radius += change;
          change *= 0.99;
        }
  
        points = getPolygonFromCircle(radius, rotation);
        tooBig = isTooBig(canvas, this.centerPoints(points).points);

        radiusIteration++;
      }

      // check if the new polygon is better than the currently best polygon
      const tempSideLength = Math.sqrt((points[0].x - points[1].x)**2 + (points[0].y - points[1].y)**2);
      if(tempSideLength > bestSideLegth) {
        bestSideLegth = tempSideLength;
        bestPoints = points;
        bestRotation = rotation;
      }
    }

    // --> best radius and best rotation have been found
    
    // now build the object to return and return it
    return {
      points: centerPoints ? this.centerPoints(bestPoints).points : bestPoints,
      offset: centerPoints ? this.centerPoints(bestPoints).offset : {dx: 0, dy: 0},
      angle: bestRotation,
      sides: sideCount
    };
  }

  readonly points: { canvas: number, bestPoints: { sides: number, polygon: Polygon }[] }= {} as typeof this.points;
  getMaxRegPolygonPointsHeuristic(canvas: number, sideCount: number, returnCenteredPoints = true): Polygon {
    // if the canvas size has changed, reset the best points
    if(!this.points.canvas || canvas != this.points.canvas) {
      this.points.canvas = canvas;

      let calculatedCenteredPoints = this.calculateMaxRegPolygonPointsHeuristic(canvas, sideCount, true);
      this.points.bestPoints = [{ sides: sideCount, polygon: calculatedCenteredPoints }];
    }

    // if the best points for the side count have already been calculated, return them
    const best = this.points.bestPoints.find((points) => points.sides == sideCount);
    if(best) {
      if(returnCenteredPoints) return best.polygon;
      else {
        const uncenteredPoints = this.centerPoints(best.polygon.points, { dx: -best.polygon.offset.dx, dy: -best.polygon.offset.dy });
        uncenteredPoints.offset = best.polygon.offset;

        return Object.assign(uncenteredPoints, { angle: best.polygon.angle, sides: best.sides }) 
      };
    }
    
    // otherwise, calculate them and return them
    else {
      const polygon = this.calculateMaxRegPolygonPointsHeuristic(canvas, sideCount, true);
      this.points.bestPoints.push({ sides: sideCount, polygon });
      
      if(returnCenteredPoints) return polygon;
      else {
        const uncenteredPoints = this.centerPoints(polygon.points, { dx: -polygon.offset.dx, dy: -polygon.offset.dy });
        uncenteredPoints.offset = polygon.offset;

        return Object.assign(uncenteredPoints, { angle: polygon.angle, sides: sideCount });
      }
    }
  }

  copyPointsArray(points: Point[]): Point[] {
    const copy: Point[] = [];
    points.forEach((point) => copy.push({ x: point.x, y: point.y }));
    return copy;
  }
}

export type Point = { x: number; y: number };
export type CenteredPoints = { points: Point[], offset: {dx: number, dy: number} };
export type Polygon = { sides: number, points: Point[], offset: {dx: number, dy: number}, angle: number };
