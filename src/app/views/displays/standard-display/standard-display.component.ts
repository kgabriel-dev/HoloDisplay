import { AfterContentInit, AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';

@Component({
  selector: 'display-standard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss']
})
export class StandardDisplayComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() resizeEvent$!: Observable<Event>;

  @ViewChild('displayCanvas') private canvas: ElementRef<HTMLCanvasElement> | undefined;

  private imagePosition = 0;
  private imagePosition$: Subscription;
  private imageSize = 400;
  private imageSize$: Subscription;
  private innerPolygonSize = 50;
  private innerPolygonSize$: Subscription;
  private sideCount = 4;
  private sideCount$: Subscription;
  private imageSwapTime = 500;
  private imageSwapTime$: Subscription;
  private images: string[] = [];
  private images$: Subscription;

  private readonly centerPoint: Point = { x: 0, y: 0 };
  private canvasContext!: CanvasRenderingContext2D | null;


  constructor(private settingsBroadcast: SettingsBroadcastingService, private helperService: HelperService) {
    this.imagePosition$ = settingsBroadcast.selectNotificationChannel('ImagePosition').subscribe(newImagePosition => { this.imagePosition = newImagePosition; this.draw(); });
    this.imageSize$ = settingsBroadcast.selectNotificationChannel('ImageSize').subscribe(newImageSize => { this.imageSize = newImageSize; this.draw(); });
    this.innerPolygonSize$ = settingsBroadcast.selectNotificationChannel('InnerPolygonSize').subscribe(newInnerPolygonSize => { this.innerPolygonSize = newInnerPolygonSize; this.draw(); });
    this.images$ = settingsBroadcast.selectNotificationChannel('NewImages').subscribe((imageData: string[]) => this.images = imageData);
    this.sideCount$ = settingsBroadcast.selectNotificationChannel('SideCount').subscribe(newSideCount => { this.sideCount = newSideCount; console.log(this.sideCount); this.draw(); });
    this.imageSwapTime$ = settingsBroadcast.selectNotificationChannel('SwapImage').subscribe(value => { this.draw(); });
  }

  ngOnInit(): void {
    this.resizeEvent$.subscribe(event => this.onResize(event));
  }

  ngOnDestroy(): void {
    this.imagePosition$.unsubscribe();
    this.imageSize$.unsubscribe();
    this.innerPolygonSize$.unsubscribe();
    this.images$.unsubscribe();
    this.sideCount$.unsubscribe();
    this.imageSwapTime$.unsubscribe();

    console.log('unsubscribed')
  }

  ngAfterViewInit(): void {
    if (!this.canvas) return;

    const newSize = Math.min(window.innerWidth, window.innerHeight);

    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;

    this.canvasContext = this.canvas.nativeElement.getContext('2d');
  }

  onResize(event: Event) {
    if (!event.target || !this.canvas) return;

    const newSize = Math.min((event.target as Window).innerWidth, (event.target as Window).innerHeight);

    this.canvas.nativeElement.width = newSize;
    this.canvas.nativeElement.height = newSize;
    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;
  }

  draw(): void {
    const canvasSize = this.canvas?.nativeElement.width;
    if (!this.canvasContext || !canvasSize) return;

    // calculate all values that stay the same independently from which image gets drawn
    const outerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(canvasSize / 2, this.centerPoint, this.sideCount),
      innerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(20, this.centerPoint, this.sideCount),
      angle = 2 * Math.PI / this.sideCount;

    // reset the canvas
    this.canvasContext.clearRect(0, 0, canvasSize, canvasSize);
    this.canvasContext.save();

    // draw the polygons representing the inner and the outer square
    this.canvasContext.translate(canvasSize / 2, canvasSize / 2);
    this.helperService.connectPointsWithStraightLines(this.canvasContext, outerEdgePoints, '#500');
    this.helperService.connectPointsWithStraightLines(this.canvasContext, innerEdgePoints, '#225');

    this.canvasContext.restore();

    for (let iSide = 0; iSide < this.sideCount; iSide++) {
      this.canvasContext.save();
      this.canvasContext.translate(canvasSize / 2, canvasSize / 2);
      this.canvasContext.rotate(iSide * angle);

      // create the clip mask
      const clipMask = new Path2D();
      clipMask.moveTo(innerEdgePoints[0].x, innerEdgePoints[0].y);
      clipMask.lineTo(outerEdgePoints[0].x, outerEdgePoints[0].y);
      clipMask.lineTo(outerEdgePoints[1].x, outerEdgePoints[1].y);
      clipMask.lineTo(innerEdgePoints[1].x, innerEdgePoints[1].y);
      clipMask.closePath();
      this.canvasContext.clip(clipMask);

      // create the image and draw it
      const image = new Image();
      image.src = this.images[iSide % this.images.length];
      this.canvasContext.drawImage(image, 0, 0, 200, 200);
      this.canvasContext.restore();
    }

  }

}
