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
  private images: HTMLImageElement[] = [];
  private images$: Subscription;

  private readonly centerPoint: Point = { x: 0, y: 0 };
  private canvasContext!: CanvasRenderingContext2D | null;


  constructor(private settingsBroadcast: SettingsBroadcastingService, private helperService: HelperService) {
    this.imagePosition$ = settingsBroadcast.selectNotificationChannel('ImagePosition').subscribe(newImagePosition => { this.imagePosition = newImagePosition; this.draw(); });
    this.imageSize$ = settingsBroadcast.selectNotificationChannel('ImageSize').subscribe(newImageSize => { this.imageSize = newImageSize; this.draw(); });
    this.innerPolygonSize$ = settingsBroadcast.selectNotificationChannel('InnerPolygonSize').subscribe(newInnerPolygonSize => { this.innerPolygonSize = newInnerPolygonSize; this.draw(); });
    this.images$ = settingsBroadcast.selectNotificationChannel('NewImages').subscribe(value => console.log(value));
    this.sideCount$ = settingsBroadcast.selectNotificationChannel('SideCount').subscribe(newSideCount => { this.sideCount = newSideCount; this.draw(); });
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
  }

  ngAfterViewInit(): void {
    if(!this.canvas) return;

    const newSize = Math.min(window.innerWidth, window.innerHeight);

    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;

    this.canvasContext = this.canvas.nativeElement.getContext('2d');
  }
  
  onResize(event: Event) {
    if(!event.target || !this.canvas) return;

    const newSize = Math.min((event.target as Window).innerWidth, (event.target as Window).innerHeight);

    this.canvas.nativeElement.width = newSize;
    this.canvas.nativeElement.height = newSize;
    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;
  }

  draw(): void {
    const canvasSize = this.canvas?.nativeElement.width;
    if(!this.canvasContext || !canvasSize) return;

    this.canvasContext.save();

    this.canvasContext.translate(canvasSize/2, canvasSize/2)

    const outerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(canvasSize/2, this.centerPoint, this.sideCount),
      innerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(canvasSize/2, this.centerPoint, this.sideCount);
    
    this.canvasContext.strokeStyle = '#ff0000';
    
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(outerEdgePoints[0].x || this.centerPoint.x, outerEdgePoints[0].y || this.centerPoint.y);
    for(let i = 1; i < outerEdgePoints.length; i++) {
      this.canvasContext.lineTo(outerEdgePoints[i].x, outerEdgePoints[i].y);
    }
    this.canvasContext.closePath();
    this.canvasContext.stroke();

    this.canvasContext.restore();
  }

}
