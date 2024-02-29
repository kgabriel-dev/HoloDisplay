import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, debounceTime, merge } from 'rxjs';
import { StandardMethodCalculatorService } from 'src/app/services/calculators/standard-method/standard-method-calculator.service';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';
import { TutorialService } from 'src/app/services/tutorial/tutorial.service';

@Component({
  selector: 'app-display-standard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss']
})
export class StandardDisplayComponent implements OnInit, AfterViewInit {
  @Input() resizeEvent$!: Observable<Event>;
  @Input() calculate$!: Observable<void>;

  private readonly imagePositions$ = this.settingsBroadcastingService.selectNotificationChannel('ImagePositions');
  private readonly imageSizes$ = this.settingsBroadcastingService.selectNotificationChannel('ImageSizes');
  private readonly innerPolygonSize$ = this.settingsBroadcastingService.selectNotificationChannel('InnerPolygonSize');
  private readonly sideCount$ = this.settingsBroadcastingService.selectNotificationChannel('SideCount');
  private readonly swapTime$ = this.settingsBroadcastingService.selectNotificationChannel('SwapImage');
  private readonly imageArray$ = this.settingsBroadcastingService.selectNotificationChannel('NewImages');
  private readonly imageRotations$ = this.settingsBroadcastingService.selectNotificationChannel('ImageRotations');
  private readonly imageFlips$ = this.settingsBroadcastingService.selectNotificationChannel('ImageFlips');
  private readonly imageBrightness$ = this.settingsBroadcastingService.selectNotificationChannel('ImageBrightness');

  @ViewChild('displayCanvas') displayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private innerEdgePoints: Point[] = [];
  private outerEdgePoints: Point[] = [];
  private canvasSize = 0;
  private angle = 0;
  private images: (HTMLImageElement | string)[] = [];
  private imageScalingFactors: number[] = [];
  private imageFlips: { v: boolean, h: boolean }[] = [];
  private imagePositions: number[] = [];
  private innerPolygonIncircleRadius = 0;
  private polygonInfo: { rotation: number, offset: {dx: number, dy: number}, sides: number } = {} as typeof this.polygonInfo;

  private displayedFiles: { type: 'image' | 'video' | 'gif', domId: string, element: HTMLImageElement | HTMLVideoElement, index: number }[] = [];

  calculatorDPI = 96;
  calculatorSlope = 45;
  calculatorImageWidthPx = 0;
  calculatorImageHeightPx = 0;
  calculatorJsPixelRatio = window.devicePixelRatio;

  constructor(
    public settingsBroadcastingService: SettingsBroadcastingService,
    private helperService: HelperService,
    private calculator: StandardMethodCalculatorService,
    private tutorial: TutorialService
  ) {
    // subscribe to changes in the images to display
    this.imageArray$.subscribe((imageData: string[]) => {
      const hiddenDisplayContainer: HTMLDivElement = document.getElementById('hiddenDisplayContainer') as HTMLDivElement;

      if(!hiddenDisplayContainer) {
        console.log("Couldn't find the hidden dipsplay container!");
        return;
      }

      hiddenDisplayContainer.innerHTML = "";
      
      this.displayedFiles = [];

      imageData.forEach((data, index) => {
        const type = data.split(';')[0].split('/')[1];

        if(data.includes('image/gif')) {
          hiddenDisplayContainer.innerHTML += `<img src="${data}" id="gif${index}" />`;
          this.displayedFiles.push({ type: 'gif', domId: `gif${index}`, element: document.getElementById(`gif${index}`) as HTMLImageElement, index });
        }
        
        else if(data.includes('image/')) {
          hiddenDisplayContainer.innerHTML += `<img src="${data}" id="image${index}" />`;
          this.displayedFiles.push({ type: 'image', domId: `image${index}`, element: document.getElementById(`image${index}`) as HTMLImageElement, index });
        }

        else if(data.includes('video/')) {
          hiddenDisplayContainer.innerHTML += `<video id="video${index}" autoplay muted loop="true"><source src="${data}" type="video/${type}"></video>`;

          const video = document.getElementById(`video${index}`) as HTMLVideoElement;
          video.ontimeupdate = () => {this.settingsBroadcastingService.broadcastChange('SwapImage', true);};

          this.displayedFiles.push({ type: 'video', domId: `video${index}`, element: document.getElementById(`video${index}`) as HTMLVideoElement, index });
        };
      });
    });

    // subscribe to all other settings broadcast channels
    merge(
      this.imagePositions$,
      this.imageSizes$,
      this.innerPolygonSize$,
      this.sideCount$,
      this.swapTime$,
      this.imageRotations$,
      this.imageFlips$,
      this.imageBrightness$
    )
    .pipe(debounceTime(100))
    .subscribe(() => {
      this.recalculateValues();
      this.draw();
    });
  }

  ngOnInit(): void {
    this.resizeEvent$.pipe(debounceTime(20)).subscribe((event) => {
      this.resizeCanvas((event.target as Window).innerWidth, (event.target as Window).innerHeight);
      this.recalculateValues();
    });

    // define the calculation function
    this.calculate$.subscribe(() => {
      this.toggleModal('calculatorExtraSettingsModal');
    });

    // load initial settings to show something
    this.settingsBroadcastingService.requestSettingsReset();
  }

  ngAfterViewInit(): void {
    this.resizeCanvas(this.container.nativeElement.clientWidth, this.container.nativeElement.clientHeight);
    this.recalculateValues();

    if(!this.tutorial.isTutorialDeactivated('standardDisplay'))
      this.tutorial.startTutorial('standardDisplay');
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
    let outerPolygon = this.helperService.getMaxRegPolygonPointsHeuristic(this.canvasSize, sideCount, false);
    this.polygonInfo = { rotation: outerPolygon.angle, offset: outerPolygon.offset, sides: sideCount };
    this.outerEdgePoints = this.helperService.centerPoints(outerPolygon.points, outerPolygon.offset).points;

    this.innerEdgePoints = [];
    for(let i = 0; i < sideCount; i++) {
      this.innerEdgePoints.push(this.helperService.getPointOnCircle(this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number, i * this.angle - this.polygonInfo.rotation, {x: 0, y: 0}));
    }
    this.innerEdgePoints = this.helperService.centerPoints(this.innerEdgePoints, outerPolygon.offset).points;
    this.innerEdgePoints.reverse();
    const lastPoint = this.innerEdgePoints.pop() as Point;
    this.innerEdgePoints.unshift(lastPoint);

    this.imageScalingFactors = (this.settingsBroadcastingService.getLastValue('ImageSizes') as number[]).map((size) => size / 100);
    this.imagePositions = this.settingsBroadcastingService.getLastValue('ImagePositions') as number[];
    this.imageFlips = this.settingsBroadcastingService.getLastValue('ImageFlips') as { v: boolean, h: boolean }[];
    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon((this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number) / 2, sideCount);
  }

  private draw(): void {
    console.log(this.displayedFiles)

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
      const iImage = iSide % this.displayedFiles.length;
      const imageData = this.displayedFiles[iImage];

      if(!imageData) continue;

      // load the image as what is currently displayed hidden in the DOM
      let image: HTMLImageElement | HTMLVideoElement;
      let width: number, height: number;

      if(imageData.type === 'video') {
        image = imageData.element as HTMLVideoElement;
        width = image.videoWidth;
        height = image.videoHeight;
      } else if(imageData.type === 'gif') {
        image = imageData.element as HTMLImageElement;
        width = image.width;
        height = image.height;
      } else {
        image = imageData.element as HTMLImageElement;
        width = image.width;
        height = image.height;
      }

      // reset the clip mask
      ctx.restore();
      ctx.resetTransform();
      ctx.save();

      // apply the translation and rotation
      ctx.translate((this.canvasSize/2 - this.polygonInfo.offset.dx), (this.canvasSize/2 - this.polygonInfo.offset.dy));
      ctx.rotate(iSide * this.angle);

      // create the clip mask
      ctx.beginPath();
      ctx.moveTo(this.innerEdgePoints[0].x + this.polygonInfo.offset.dx, this.innerEdgePoints[0].y + this.polygonInfo.offset.dy);
      ctx.lineTo(this.outerEdgePoints[0].x + this.polygonInfo.offset.dx, this.outerEdgePoints[0].y + this.polygonInfo.offset.dy);
      ctx.lineTo(this.outerEdgePoints[1].x + this.polygonInfo.offset.dx, this.outerEdgePoints[1].y + this.polygonInfo.offset.dy);
      ctx.lineTo(this.innerEdgePoints[1].x + this.polygonInfo.offset.dx, this.innerEdgePoints[1].y + this.polygonInfo.offset.dy);
      ctx.closePath();
      ctx.clip();

      // undo the rotation
      ctx.rotate(-iSide * this.angle);

      // draw the image
      const scaledImageWidth = width * this.imageScalingFactors[iImage];
      const scaledImageHeight = height * this.imageScalingFactors[iImage];

      ctx.rotate(Math.PI)
      ctx.rotate((iSide - (0.25 * (this.polygonInfo.sides - 2))) * this.angle + this.polygonInfo.rotation); // Why does this equation work?
      ctx.translate(0, -this.innerPolygonIncircleRadius - this.canvasSize/4 - this.imagePositions[iImage]);
      ctx.rotate((this.settingsBroadcastingService.getLastValue('ImageRotations') as number[])[iImage] * Math.PI / 180);

      // apply the flip
      ctx.scale(this.imageFlips[iImage].h ? -1 : 1, this.imageFlips[iImage].v ? -1 : 1);
      // apply the brightness change
      ctx.filter = `brightness(${(this.settingsBroadcastingService.getLastValue('ImageBrightness') as number[])[iImage]}%)`;

      ctx.drawImage(
        image,
        -scaledImageWidth/2,
        -scaledImageHeight/2,
        scaledImageWidth,
        scaledImageHeight
      );
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
