import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { StandardMethodCalculatorService } from 'src/app/services/calculators/standard-method/standard-method-calculator.service';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';

@Component({
  selector: 'app-display-standard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss'],
})
export class StandardDisplayComponent implements OnInit, AfterViewInit {
  @Input() resizeEvent$!: Observable<Event>;
  @Input() calculate$!: Observable<void>;

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
  private imageScalingFactor = 1;
  private imageCanvasSize = 0;
  private offsetAngle = 0;
  private innerPolygonIncircleRadius = 0;

  calculatorDPI = 96;
  calculatorSlope = 45;
  calculatorImageWidthPx = 0;
  calculatorImageHeightPx = 0;
  calculatorJsPixelRatio = window.devicePixelRatio;

  constructor(
    public settingsBroadcastingService: SettingsBroadcastingService,
    private helperService: HelperService,
    private calculator: StandardMethodCalculatorService
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

    // define the calculation function
    this.calculate$.subscribe(() => {
      this.toggleModal('calculatorExtraSettingsModal');
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
    this.innerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle((this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number) / 2, this.centerPoint, sideCount);
    this.outerEdgePoints = this.helperService.getEvenlySpacedPointsOnCircle(this.canvasSize / 2, this.centerPoint, sideCount);
    this.imageScalingFactor = this.settingsBroadcastingService.getLastValue('ImageSize') as number / 100;
    this.imageCanvasSize = this.helperService.getDistanceBetweenParallelLines(this.innerEdgePoints[0], this.innerEdgePoints[1], this.outerEdgePoints[0]);
    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon((this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number) / 2, sideCount);
  }

  private draw(): void {
    const canvas = this.displayCanvas?.nativeElement;
    if(!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.resetTransform();
    canvas.width = canvas.width;  // clears canvas as a side effect

    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.helperService.connectPointsWithStraightLines(ctx, this.innerEdgePoints, 'blue');
    this.helperService.connectPointsWithStraightLines(ctx, this.outerEdgePoints, 'red');

    for(let iSide = 0; iSide < (this.settingsBroadcastingService.getLastValue('SideCount') as number); iSide++) {
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
      const scaledImageWidth = image.width * this.imageScalingFactor;
      const scaledImageHeight = image.height * this.imageScalingFactor;

      ctx.rotate(this.offsetAngle);
      ctx.drawImage(image, -scaledImageWidth/2, -this.innerPolygonIncircleRadius - this.imageCanvasSize/2 - scaledImageHeight/2, scaledImageWidth, scaledImageHeight);
    }
  }

  onCalculateClick(): void {
    const canvas = this.calculator.calculateImage(
      this.settingsBroadcastingService.getLastValue('SideCount') as number,
      this.calculatorSlope,
      this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number,
      this.canvasSize,
    );

    this.calculatorImageWidthPx = canvas?.width || -1;
    this.calculatorImageHeightPx = canvas?.height || -1;

    // download the image from the canvas
    if(canvas) {
      const link = document.createElement('a');
      link.download = 'mirror cutting template.png';
      link.href = canvas.toDataURL();
      link.click();
    }

    this.toggleModal('calculatorDownloadModal');
  }

  toggleModal(modalId: string): void {
    if(!document.getElementById(modalId)) return;

    document.getElementById(modalId)!.classList.toggle("hidden");
  }
}
