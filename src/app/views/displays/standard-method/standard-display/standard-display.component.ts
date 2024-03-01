import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as decodeGif from 'decode-gif';
import { Observable, Subject, debounceTime, merge } from 'rxjs';
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
  private readonly requestDraw$ = new Subject<void>();

  @ViewChild('displayCanvas') displayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private innerEdgePoints: Point[] = [];
  private outerEdgePoints: Point[] = [];
  private canvasSize = 0;
  private angle = 0;
  private displayedFiles: DisplayedFile[] = [];
  private imageScalingFactors: number[] = [];
  private imageFlips: { v: boolean, h: boolean }[] = [];
  private imagePositions: number[] = [];
  private innerPolygonIncircleRadius = 0;
  private polygonInfo: { rotation: number, offset: {dx: number, dy: number}, sides: number } = {} as typeof this.polygonInfo;
  private transformationMatrices: DOMMatrix[][] = [];

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
    this.imageArray$.subscribe((imageData: { src: string, type: string }[]) => {
      const hiddenDisplayContainer: HTMLDivElement = document.getElementById('hiddenDisplayContainer') as HTMLDivElement;

      if(!hiddenDisplayContainer) {
        console.log("Couldn't find the hidden dipsplay container!");
        return;
      }

      hiddenDisplayContainer.innerHTML = "";
      
      this.displayedFiles = [];

      imageData.forEach((data, index) => {
        if(data.type == 'image/gif') {
          let gif = decodeGif(new Uint8Array(atob(data.src.split(',')[1]).split('').map((c) => c.charCodeAt(0))));
          let gifImages: HTMLImageElement[] = [];

          gif.frames.forEach((frame) => {
            let imageData = new ImageData(frame.data, gif.width, gif.height);
            let canvas = document.createElement('canvas');
            canvas.width = gif.width;
            canvas.height = gif.height;
            let ctx = canvas.getContext('2d');
            ctx?.putImageData(imageData, 0, 0);

            let image = new Image();
            image.src = canvas.toDataURL();
            image.width = gif.width;
            image.height = gif.height;

            gifImages.push(image);
          });

          this.displayedFiles.push({type: 'gif', displayIndex: index, files: { original: gifImages, scaled: gifImages, currentIndex: 0 }});
        }
        
        else if(['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) {
          let image = new Image();
          image.src = data.src;

          this.displayedFiles.push({ type: 'image', displayIndex: index, files: { original: [image], scaled: [image], currentIndex: 0 }});
        }

        else if(data.type.startsWith('video')) {
          hiddenDisplayContainer.innerHTML += `<video id="video${index}" autoplay muted loop="true"><source src="${data.src}" type="${data.type}"></video>`;

          const video = document.getElementById(`video${index}`) as HTMLVideoElement;

          this.displayedFiles.push({ type: 'video', displayIndex: index, files: { original: [video], scaled: [video], currentIndex: 0 }});
        };
      });
    });

    // subscribe to all other settings broadcast channels
    merge(
      this.imagePositions$,
      this.imageSizes$,
      this.innerPolygonSize$,
      this.sideCount$,
      this.imageRotations$,
    )
    .pipe(debounceTime(100))
    .subscribe(() => {
      this.recalculateValues();
      this.requestDraw$.next();
    });

    merge(
      this.imageFlips$,
      this.imageBrightness$
    )
    .pipe(debounceTime(100))
    .subscribe(() => {
      this.imageFlips = (this.settingsBroadcastingService.getLastValue('ImageFlips') as { v: boolean, h: boolean }[]);

      this.requestDraw$.next();
    });

    this.requestDraw$
      .pipe(debounceTime(1000/20))
      .subscribe(() => this.draw());
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
    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon((this.settingsBroadcastingService.getLastValue('InnerPolygonSize') as number) / 2, sideCount);
  
    // scale everything here and not in draw()
    this.displayedFiles.forEach((entry) => {
      const scalingFactor = this.imageScalingFactors[entry.displayIndex];
      const originalFiles = entry.files.original;
      const scaledFiles = entry.files.scaled;

      if(entry.type === 'video' && originalFiles.length > 0 && scaledFiles.length > 0) {
        scaledFiles[0] = (originalFiles[0] as HTMLVideoElement).cloneNode(true) as HTMLVideoElement;
        scaledFiles[0].width = (originalFiles[0] as HTMLVideoElement).videoWidth * scalingFactor;
        scaledFiles[0].height = (originalFiles[0] as HTMLVideoElement).videoHeight * scalingFactor;
      }

      else if(entry.type === 'gif' && originalFiles.length > 0 && scaledFiles.length > 0) {
        const newlyScaledFiles: typeof scaledFiles = [];

        originalFiles.forEach((image) => {
          const scaled = image.cloneNode(true) as HTMLImageElement & HTMLVideoElement;
          scaled.width = image.width * scalingFactor;
          scaled.height = image.height * scalingFactor;

          newlyScaledFiles.push(scaled);
        });

        entry.files.scaled = newlyScaledFiles;
      }

      else if(entry.type === 'image' && originalFiles.length > 0 && scaledFiles.length > 0) {
        scaledFiles[0] = (originalFiles[0] as HTMLImageElement).cloneNode(true) as HTMLImageElement;
        scaledFiles[0].width = (originalFiles[0] as HTMLImageElement).width * scalingFactor;
        scaledFiles[0].height = (originalFiles[0] as HTMLImageElement).height * scalingFactor;
      }
    });

    // reset transformation matrices because they are not valid anymore
    this.transformationMatrices = [];
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

      const iImage = iSide % this.displayedFiles.length;
      const imageData = this.displayedFiles[iImage];

      if(!imageData) continue;

      // load the image
      const image = imageData.files.scaled[imageData.files.currentIndex];

      if(image instanceof HTMLVideoElement) {
        (image as HTMLVideoElement).currentTime = (imageData.files.original[0] as HTMLVideoElement).currentTime;
      }

      // reset the clip mask
      ctx.restore();
      ctx.resetTransform();
      ctx.save();

      // store or apply transformation matrix instead of rotating and translating manually
      if(this.transformationMatrices[iSide] && this.transformationMatrices[iSide][0]) {
        ctx.setTransform(this.transformationMatrices[iSide][0]);
      } else {
        // apply the translation and rotation
        ctx.translate((this.canvasSize/2 - this.polygonInfo.offset.dx), (this.canvasSize/2 - this.polygonInfo.offset.dy));
        ctx.rotate(iSide * this.angle);

        // store the transformation matrix
        this.transformationMatrices[iSide] = [ctx.getTransform()];
      }

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
      
      // store or apply transformation matrix instead of rotating and translating manually
      if(this.transformationMatrices[iSide] && this.transformationMatrices[iSide][1]) {
        ctx.setTransform(this.transformationMatrices[iSide][1]);
      } else {
        ctx.rotate(Math.PI)
        ctx.rotate((iSide - (0.25 * (this.polygonInfo.sides - 2))) * this.angle + this.polygonInfo.rotation); // Why does this equation work?
        ctx.translate(0, -this.innerPolygonIncircleRadius - this.canvasSize/4 - this.imagePositions[iImage]);
        ctx.rotate((this.settingsBroadcastingService.getLastValue('ImageRotations') as number[])[iImage] * Math.PI / 180);

        // store the transformation matrix
        this.transformationMatrices[iSide].push(ctx.getTransform());
      }

      // apply the flip
      ctx.scale(this.imageFlips[iImage].h ? -1 : 1, this.imageFlips[iImage].v ? -1 : 1);
      // apply the brightness change
      ctx.filter = `brightness(${(this.settingsBroadcastingService.getLastValue('ImageBrightness') as number[])[iImage]}%)`;

      // draw the image
      ctx.drawImage(
        image,
        -image.width/2,
        -image.height/2,
        image.width,
        image.height
      );
    }

    // increment all subimage counters
    this.displayedFiles.forEach((entry) => {
      entry.files.currentIndex = (entry.files.currentIndex + 1) % entry.files.scaled.length;
    });

    // request the next draw if one of the images is animated (video or gif)
    if(this.displayedFiles.some((entry) => entry.type === 'video' || entry.type === 'gif')) {
      this.requestDraw$.next();
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

type DisplayedFile = {
  type: 'image' | 'video' | 'gif',
  displayIndex: number,
  files: {
    original: HTMLImageElement[] | HTMLVideoElement[],
    scaled: HTMLImageElement[] | HTMLVideoElement[]
    currentIndex: number
  }
}