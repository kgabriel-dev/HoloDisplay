import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { Observable } from 'rxjs';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';

@Component({
  selector: 'app-display-standard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss'],
})
export class StandardDisplayComponent implements OnInit, AfterViewInit {
  @Input() resizeEvent$!: Observable<Event>;

  private readonly imagePosition$ = this.settingsBroadcastingService.selectNotificationChannel('ImagePosition');
  private readonly imageSize$ = this.settingsBroadcastingService.selectNotificationChannel('ImageSize');
  private readonly innerPolygonSize$ = this.settingsBroadcastingService.selectNotificationChannel('InnerPolygonSize');
  private readonly sideCount$ = this.settingsBroadcastingService.selectNotificationChannel('SideCount');
  private readonly swapTime$ = this.settingsBroadcastingService.selectNotificationChannel('SwapImage');
  private readonly imageArray$ = this.settingsBroadcastingService.selectNotificationChannel('NewImages');
  private readonly centerPoint: Point = { x: 0, y: 0 };

  @ViewChild('displayCanvas') displayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private innerEdgePoints: Point[] = [];
  private outerEdgePoints: Point[] = [];
  private canvasSize = 0;
  private angle = 0;
  private images: HTMLImageElement[] = [];
  private imageSize = 0;
  private imageCanvasSize = 0;
  private offsetAngle = 0;
  private innerPolygonIncircleRadius = 0;

  constructor(
    private settingsBroadcastingService: SettingsBroadcastingService,
    private helperService: HelperService
  ) {
    // subscribe to all settings broadcast channels
    this.imagePosition$.subscribe(() => this.recalculateValues());
    this.imageSize$.subscribe(() => this.recalculateValues());
    this.innerPolygonSize$.subscribe(() => this.recalculateValues());
    this.sideCount$.subscribe(() => this.recalculateValues());
    this.swapTime$.subscribe(() => this.draw());
    this.imageArray$.subscribe((imageData: string[]) => this.images = helperService.createImages(imageData));
  }

  ngOnInit(): void {
    this.resizeEvent$.subscribe((event) => {
      this.resizeCanvas((event.target as Window).innerWidth, (event.target as Window).innerHeight);
      this.recalculateValues();
    });
  }

  ngAfterViewInit(): void {
    this.resizeCanvas(this.container.nativeElement.clientWidth, this.container.nativeElement.clientHeight);
    this.recalculateValues();
  }

  private resizeCanvas(width: number, height: number): void {
    this.canvasSize = Math.min(width, height);

    const canvas = this.displayCanvas?.nativeElement;
    if(canvas) {
      canvas.width = this.canvasSize;
      canvas.height = this.canvasSize;
      canvas.style.width = `${this.canvasSize}px`;
      canvas.style.height = `${this.canvasSize}px`;
    }
  }

  private recalculateValues(): void {
    const sideCount = this.settingsBroadcastingService.getLastValue('SideCount') as number;

    this.angle = 2 * Math.PI / sideCount;
    this.offsetAngle = ((sideCount - 2) * this.angle) / 4;
    this.innerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number, this.centerPoint, sideCount);
    this.outerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(this.canvasSize / 2, this.centerPoint, sideCount);
    this.imageSize = this.settingsBroadcastingService.getLastValue('ImageSize') as number;
    this.imageCanvasSize = this.helperService.getDistanceBetweenParallelLines(this.innerEdgePoints[0], this.innerEdgePoints[1], this.outerEdgePoints[0]);
    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon(this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number, sideCount);
  }

  private draw(): void {
    const canvas = this.displayCanvas?.nativeElement;
    if(!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.restore();
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.helperService.connectPointsWithStraightLines(ctx, this.innerEdgePoints, 'blue');
    this.helperService.connectPointsWithStraightLines(ctx, this.outerEdgePoints, 'red');

    for(let iSide = 0; iSide < this.settingsBroadcastingService.getLastValue('SideCount'); iSide++) {
      const image = this.images[iSide % this.images.length];

      if(!image) continue;
      ctx.restore();
      ctx.resetTransform();
      ctx.save();

      ctx.translate(this.canvasSize/2, this.canvasSize/2);
      ctx.rotate(iSide * this.angle);

      // create the clip mask
      ctx.beginPath();
      ctx.moveTo(this.innerEdgePoints[0].x, this.innerEdgePoints[0].y);
      ctx.lineTo(this.outerEdgePoints[0].x, this.outerEdgePoints[0].y);
      ctx.lineTo(this.outerEdgePoints[1].x, this.outerEdgePoints[1].y);
      ctx.lineTo(this.innerEdgePoints[1].x, this.innerEdgePoints[1].y);
      ctx.closePath();
      ctx.clip();

      // draw the image
      ctx.rotate(this.offsetAngle);
      ctx.drawImage(image, -this.imageSize/2, -this.innerPolygonIncircleRadius - this.imageCanvasSize/2 - this.imageSize/2, this.imageSize, this.imageSize);
    }
  }
}
