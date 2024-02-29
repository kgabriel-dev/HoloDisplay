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

        if(data.includes('image/gif')) {let gif = decodeGif(new Uint8Array(atob(data.split(',')[1]).split('').map((c) => c.charCodeAt(0))));
          let gifImages: HTMLImageElement[] = [];

          gif.frames.forEach((frame, index) => {
            let imageData = new ImageData(frame.data, gif.width, gif.height);
            let canvas = document.createElement('canvas');
            canvas.width = gif.width;
            canvas.height = gif.height;
            let ctx = canvas.getContext('2d', { alpha: false });
            ctx?.putImageData(imageData, 0, 0);

            let image = new Image();
            image.src = canvas.toDataURL();
            image.width = gif.width;
            image.height = gif.height;

            gifImages.push(image);
          });

          this.displayedFiles.push({type: 'gif', displayIndex: index, subFiles: { original: gifImages, scaled: gifImages, subIndex: 0 }});
        }
        
        else if(data.includes('image/')) {
          let image = new Image();
          image.src = data;

          this.displayedFiles.push({ type: 'image', displayIndex: index, singleFile: { original: image, scaled: image }});
        }

        else if(data.includes('video/')) {
          hiddenDisplayContainer.innerHTML += `<video id="video${index}" autoplay muted loop="true"><source src="${data}" type="video/${type}"></video>`;

          const video = document.getElementById(`video${index}`) as HTMLVideoElement;
          video.ontimeupdate = () => {this.settingsBroadcastingService.broadcastChange('SwapImage', true);};

          this.displayedFiles.push({ type: 'video', displayIndex: index, singleFile: { original: video, scaled: video }});
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
      this.swapTime$,
      this.imageFlips$,
      this.imageBrightness$
    )
    .pipe(debounceTime(100))
    .subscribe(() => {
      this.imageFlips = (this.settingsBroadcastingService.getLastValue('ImageFlips') as { v: boolean, h: boolean }[]);

      this.requestDraw$.next();
    });

    this.requestDraw$
      .pipe(debounceTime(100))
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
      if(entry.type === 'video' && entry.singleFile) {
        entry.singleFile.scaled = (entry.singleFile.original as HTMLVideoElement).cloneNode(true) as HTMLVideoElement;
        entry.singleFile.scaled.setAttribute('width', `${(entry.singleFile.original as HTMLVideoElement).videoWidth * this.imageScalingFactors[entry.displayIndex]}`);
        entry.singleFile.scaled.setAttribute('height', `${(entry.singleFile.original as HTMLVideoElement).videoHeight * this.imageScalingFactors[entry.displayIndex]}`);
      }

      else if(entry.type === 'gif' && entry.subFiles) {
        entry.subFiles.scaled = [];

        entry.subFiles.original?.forEach((image) => {
          if(!entry.subFiles) return;

          entry.subFiles.scaled?.push(image.cloneNode(true) as HTMLImageElement);

          entry.subFiles.scaled[entry.subFiles.scaled.length - 1].setAttribute('width', `${image.width * this.imageScalingFactors[entry.displayIndex]}`);
          entry.subFiles.scaled[entry.subFiles.scaled.length - 1].setAttribute('height', `${image.height * this.imageScalingFactors[entry.displayIndex]}`);
        });
      }

      else if(entry.type === 'image' && entry.singleFile) {
        entry.singleFile.scaled = (entry.singleFile.original as HTMLImageElement).cloneNode(true) as HTMLImageElement;
        (entry.singleFile.scaled as HTMLImageElement).width = entry.singleFile.original.width * this.imageScalingFactors[entry.displayIndex];
        (entry.singleFile.scaled as HTMLImageElement).height = entry.singleFile.original.height * this.imageScalingFactors[entry.displayIndex];
        console.log(entry.singleFile.scaled.width, entry.singleFile.scaled.height)
      }
    });

    // reset transformation matrices because they are not valid anymore
    this.transformationMatrices = [];
  }

  private draw(): void {
    const canvas = this.displayCanvas?.nativeElement;
    if(!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
    ctx.save();
    ctx.resetTransform();
    canvas.width = canvas.width;  // clears canvas as a side effect

    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.helperService.connectPointsWithStraightLines(ctx, this.innerEdgePoints, 'blue');
    this.helperService.connectPointsWithStraightLines(ctx, this.outerEdgePoints, 'red');

    for(let iSide = 0; iSide < (this.settingsBroadcastingService.getLastValue('SideCount') as number); iSide++) {
      const timeStart = performance.now();

      const iImage = iSide % this.displayedFiles.length;
      const imageData = this.displayedFiles[iImage];

      if(!imageData) continue;

      // load the image
      let image: HTMLImageElement | HTMLVideoElement;

      if(imageData.type === 'video' || imageData.type === 'image') {
        image = imageData.singleFile?.scaled as HTMLImageElement | HTMLVideoElement;
      } else {
        if(imageData.subFiles?.scaled && imageData.subFiles.scaled.length > 0 && imageData.subFiles.subIndex !== undefined) {
          const currImageIndex = imageData.subFiles.subIndex;
          image = imageData.subFiles.scaled[currImageIndex] as HTMLImageElement;
        } else {
          image = new Image();
        }
      }

      if(image instanceof HTMLVideoElement) {
        (image as HTMLVideoElement).currentTime = (imageData.singleFile?.original as HTMLVideoElement).currentTime;
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

      // draw the image
      
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

      ctx.drawImage(
        image,
        -image.width/2,
        -image.height/2,
        image.width,
        image.height
      );

      const timeEnd = performance.now();
      console.log(`Drawing image ${iImage} took ${timeEnd - timeStart} ms`);
    }

    // increment all subimage counters
    this.displayedFiles.forEach((entry) => {
      if(entry.subFiles?.original && entry.subFiles.original.length > 0 && entry.subFiles.subIndex !== undefined) {
        entry.subFiles.subIndex = (entry.subFiles.subIndex + 1) % entry.subFiles.original.length;
      }
    });
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
  singleFile?: {
    original: HTMLImageElement | HTMLVideoElement,
    scaled: HTMLImageElement | HTMLVideoElement
  },
  subFiles?: {
    original: HTMLImageElement[],
    scaled: HTMLImageElement[]
    subIndex: number
  }
}