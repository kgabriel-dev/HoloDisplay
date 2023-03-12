import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';

@Component({
  selector: 'display-standard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss'],
})
export class StandardDisplayComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  @Input() resizeEvent$!: Observable<Event>;

  @ViewChild('displayCanvas') private canvas:
    | ElementRef<HTMLCanvasElement>
    | undefined;

  private imagePosition = 0;
  private imagePosition$: Subscription;
  private imageSize = 400;
  private imageSize$: Subscription;
  private innerPolygonSize = 50;
  private innerPolygonSize$: Subscription;
  private sideCount = 4;
  private sideCount$: Subscription;
  private imageSwapTime$: Subscription;
  private images: HTMLImageElement[] = [];
  private images$: Subscription;

  private readonly centerPoint: Point = { x: 0, y: 0 };
  private canvasContext!: CanvasRenderingContext2D | null;

  private outerEdgePoints!: Point[];
  private innerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(
    20,
    this.centerPoint,
    this.sideCount
  );
  private angle = ((360 / this.sideCount) * Math.PI) / 180;

  constructor(
    private settingsBroadcast: SettingsBroadcastingService,
    private helperService: HelperService
  ) {
    this.imagePosition$ = settingsBroadcast
      .selectNotificationChannel('ImagePosition')
      .subscribe((newImagePosition) => {
        this.imagePosition = newImagePosition;
        this.draw();
      });
    this.imageSize$ = settingsBroadcast
      .selectNotificationChannel('ImageSize')
      .subscribe((newImageSize) => {
        this.imageSize = newImageSize;
        this.draw();
      });
    this.innerPolygonSize$ = settingsBroadcast
      .selectNotificationChannel('InnerPolygonSize')
      .subscribe((newInnerPolygonSize) => {
        this.innerPolygonSize = newInnerPolygonSize;
        this.draw();
      });
    this.images$ = settingsBroadcast
      .selectNotificationChannel('NewImages')
      .subscribe(
        (imageData: string[]) =>
          (this.images = helperService.createImages(imageData))
      );
    this.sideCount$ = settingsBroadcast
      .selectNotificationChannel('SideCount')
      .subscribe((newSideCount) => {
        this.sideCount = newSideCount;
        console.log(this.sideCount);
        this.draw();
      });
    this.imageSwapTime$ = settingsBroadcast
      .selectNotificationChannel('SwapImage')
      .subscribe((value) => {
        this.draw();
      });
  }

  ngOnInit(): void {
    this.resizeEvent$.subscribe((event) => this.onResize(event));

    this.outerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(
      this.canvas?.nativeElement.width || 400 / 2,
      this.centerPoint,
      this.sideCount
    );
  }

  ngOnDestroy(): void {
    this.imagePosition$.unsubscribe();
    this.imageSize$.unsubscribe();
    this.innerPolygonSize$.unsubscribe();
    this.images$.unsubscribe();
    this.sideCount$.unsubscribe();
    this.imageSwapTime$.unsubscribe();
  }

  ngAfterViewInit(): void {
    if (!this.canvas) return;

    const newSize = Math.min(window.innerWidth, window.innerHeight);
    this.canvas.nativeElement.width = newSize;
    this.canvas.nativeElement.height = newSize;
    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;

    this.canvasContext = this.canvas.nativeElement.getContext('2d');
  }

  onResize(event: Event) {
    if (!event.target || !this.canvas) return;

    const newSize = Math.min(
      (event.target as Window).innerWidth,
      (event.target as Window).innerHeight
    );

    this.canvas.nativeElement.width = newSize;
    this.canvas.nativeElement.height = newSize;
    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;
  }

  draw(): void {
    console.log('draw');
    const canvasSize = this.canvas?.nativeElement.width;
    if (!this.canvasContext || !canvasSize) return;

    // reset the canvas
    this.canvasContext.clearRect(0, 0, canvasSize, canvasSize);
    this.canvasContext.strokeStyle = '#000';
    this.canvasContext.fillRect(0, 0, canvasSize, canvasSize);
    this.canvasContext.translate(canvasSize / 2, canvasSize / 2);
    this.canvasContext.save();

    // draw the polygons representing the inner and the outer square
    this.helperService.connectPointsWithStraightLines(
      this.canvasContext,
      this.outerEdgePoints,
      '#500'
    );
    this.canvasContext.restore();

    this.helperService.connectPointsWithStraightLines(
      this.canvasContext,
      this.innerEdgePoints,
      '#225'
    );
    this.canvasContext.restore();

    for (let iSide = 0; iSide < this.sideCount; iSide++) {
      this.canvasContext.restore();
      this.canvasContext.rotate(iSide * this.angle);

      // create the clip mask
      const clipMask = new Path2D();
      clipMask.moveTo(this.innerEdgePoints[0].x, this.innerEdgePoints[0].y);
      clipMask.lineTo(this.outerEdgePoints[0].x, this.outerEdgePoints[0].y);
      clipMask.lineTo(this.outerEdgePoints[1].x, this.outerEdgePoints[1].y);
      clipMask.lineTo(this.innerEdgePoints[1].x, this.innerEdgePoints[1].y);
      clipMask.closePath();
      this.canvasContext.clip(clipMask);

      // create the image and draw it
      const image = this.images[iSide % this.images.length];
      if (!image) {
        console.log('no image');
        continue;
      }
      this.canvasContext.drawImage(image, 0, 0, 200, 200);
    }

    this.canvasContext.restore();
  }
}
