import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Frame, ParsedFrame, ParsedGif, decompressFrames, parseGIF } from 'gifuct-js';
import { Observable, Subject, debounceTime, merge } from 'rxjs';
import { StandardMethodCalculatorService } from 'src/app/services/calculators/standard-method/standard-method-calculator.service';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { MetaDataSet, SettingsBroadcastingService } from 'src/app/services/settings-broadcasting.service';
import { SettingsBrokerService } from 'src/app/services/standard-display/settings-broker.service';
import { FileSettings, MetaDataKeys, StandardDisplaySettings } from 'src/app/services/standard-display/standard-display-settings.type';
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

  private readonly requestDraw$ = new Subject<void>();

  private readonly MY_SETTINGS_BROKER_ID = "StandardDisplayComponent";

  @ViewChild('displayCanvas') displayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  private innerEdgePoints: Point[] = [];
  private outerEdgePoints: Point[] = [];
  private canvasSize = 0;
  private angle = 0;
  private innerPolygonIncircleRadius = 0;
  private polygonInfo: { rotation: number, offset: {dx: number, dy: number}, sides: number } = {} as typeof this.polygonInfo;
  private transformationMatrices: DOMMatrix[][] = [];

  private latestSettings?: StandardDisplaySettings;
  private lastDisplayedSettings?: StandardDisplaySettings;

  calculatorDPI = 96;
  calculatorSlope = 45;
  calculatorImageWidthPx = 0;
  calculatorImageHeightPx = 0;
  calculatorJsPixelRatio = window.devicePixelRatio;

  constructor(
    public settingsBroadcastingService: SettingsBroadcastingService,
    private helperService: HelperService,
    private calculator: StandardMethodCalculatorService,
    private tutorial: TutorialService,
    private settingsBroker: SettingsBrokerService
  ) {
    settingsBroker.settings$.subscribe(({settings, changedBy}) => {
      if(changedBy == this.MY_SETTINGS_BROKER_ID) {
        this.lastDisplayedSettings = settings;
        return;
      };

      // read in the new settings
      this.latestSettings = settings;

      // update the calculated values (working with the general settings)
      this.recalculateValues();

      // update the images (working with the file settings)
      this.updateImageSettings();

      // update the stored settings
      this.lastDisplayedSettings = JSON.parse(JSON.stringify(this.latestSettings));

      // request a draw
      this.requestDraw$.next();
    });

    this.requestDraw$
      .subscribe(() => this.draw());
  }

  ngOnInit(): void {
    this.resizeEvent$.pipe(debounceTime(20)).subscribe((event) => {
      this.resizeCanvas((event.target as Window).innerWidth, (event.target as Window).innerHeight);
      this.recalculateValues();
      this.requestDraw$.next();
    });

    // define the calculation function
    this.calculate$.subscribe(() => {
      this.toggleModal('calculatorExtraSettingsModal');
    });
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
    if(!this.latestSettings) {
      console.error("No latest settings found! This is *only* correct on startup.")
      return;
    }

    const sideCount = this.latestSettings.generalSettings.numberOfSides;

    this.angle = 2 * Math.PI / sideCount;
    let outerPolygon = this.helperService.getMaxRegPolygonPointsHeuristic(this.canvasSize, sideCount, false);
    this.polygonInfo = { rotation: outerPolygon.angle, offset: outerPolygon.offset, sides: sideCount };
    this.outerEdgePoints = this.helperService.centerPoints(outerPolygon.points, outerPolygon.offset).points;

    this.innerEdgePoints = [];
    for(let i = 0; i < sideCount; i++) {
      this.innerEdgePoints.push(this.helperService.getPointOnCircle(this.latestSettings.generalSettings.innerPolygonSize, i * this.angle - this.polygonInfo.rotation, {x: 0, y: 0}));
    }
    this.innerEdgePoints = this.helperService.centerPoints(this.innerEdgePoints, outerPolygon.offset).points;
    this.innerEdgePoints.reverse();
    const lastPoint = this.innerEdgePoints.pop() as Point;
    this.innerEdgePoints.unshift(lastPoint);

    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon((this.latestSettings.generalSettings.innerPolygonSize) / 2, sideCount);
  
    // scale everything here and not in draw()
    this.latestSettings!.fileSettings.forEach((entry) => {
      const scalingFactor = entry.scalingFactor;
      const originalFiles = entry.files.original as HTMLImageElement[];
      const scaledFiles = entry.files.scaled as HTMLImageElement[];

      if(entry.mimeType === 'image/gif' && originalFiles.length > 0) {
        const newlyScaledFiles: HTMLImageElement[] = [];

        originalFiles.forEach((image) => {
          const scaled = image.cloneNode(true) as HTMLImageElement;
          scaled.width = image.width * scalingFactor;
          scaled.height = image.height * scalingFactor;

          newlyScaledFiles.push(scaled as HTMLImageElement);
        });

        entry.files.scaled = newlyScaledFiles;
      }

      else if(entry.mimeType.startsWith('image') && originalFiles.length > 0) {
        scaledFiles[0] = (originalFiles[0] as HTMLImageElement).cloneNode(true) as HTMLImageElement;
        scaledFiles[0].width = (originalFiles[0] as HTMLImageElement).width * scalingFactor;
        scaledFiles[0].height = (originalFiles[0] as HTMLImageElement).height * scalingFactor;
      }
    });

    // reset transformation matrices because they are not valid anymore
    this.transformationMatrices = [];
  }

  private updateImageSettings() {
    if(!this.latestSettings) {
      console.error("Cannot udpate the image settings values because no latest settings were found!");
      return;
    }

    if(!this.lastDisplayedSettings) {
      this.lastDisplayedSettings = JSON.parse(JSON.stringify(this.latestSettings));
    }

    this.latestSettings.fileSettings.forEach((fileSetting) => {
      const unique_ids_displayed = this.lastDisplayedSettings!.fileSettings.map((file) => file.unique_id);
      let file: typeof this.latestSettings.fileSettings[number];

      if(unique_ids_displayed.includes(fileSetting.unique_id)) {
        file = this.lastDisplayedSettings?.fileSettings.find((file) => file.unique_id == fileSetting.unique_id)!;

        // update all changeable settings of the already existing file
        file.brightness = fileSetting.brightness;
        file.flips = fileSetting.flips;
        file.fps = fileSetting.fps;
        file.metaData = fileSetting.metaData;
        file.position = fileSetting.position;
        file.rotation = fileSetting.rotation;
        file.scalingFactor = fileSetting.scalingFactor;
      }
      else {
        if(!fileSetting.src) {
          console.error("Passed file has no src attribute and therefore cannot be loaded!", fileSetting);
          return;
        }
        
        const i = this.latestSettings!.fileSettings.push(fileSetting);
        file = this.latestSettings!.fileSettings[i];

        file = this.settingsBroker.fillMissingFileValues(fileSetting);

        if(file.mimeType == 'image/gif') {
          // prepare a request to load the gif
          let xhr = new XMLHttpRequest();
          xhr.open('GET', file.src!, true);
          xhr.responseType = 'arraybuffer';

          xhr.onload = () => {
            let arrayBuffer = xhr.response;
            
            if(arrayBuffer) {
              // parse the gif and load the frames
              let gif = parseGIF(arrayBuffer);
              let gifFrames = decompressFrames(gif, true);

              let gifImages: HTMLImageElement[] = [];

              gifFrames.forEach((frame) => {
                let imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
                let canvas = document.createElement('canvas');
                canvas.width = frame.dims.width;
                canvas.height = frame.dims.height;
                let ctx = canvas.getContext('2d');
                ctx?.putImageData(imageData, 0, 0);

                let image = new Image();
                image.src = canvas.toDataURL();
                image.width = canvas.width;
                image.height = canvas.height;

                gifImages.push(image);
              });

              fileSetting.fps = {
                framerate: 10,
                intervalId: window.setInterval(() => {
                  const updatedSettings = this.settingsBroker.getSettings();

                  if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == file.unique_id) == -1) return;

                  const upToDateFile = updatedSettings.fileSettings.find((f) => f.unique_id == file.unique_id)!;

                  upToDateFile.files.currentFileIndex = (upToDateFile.files.currentFileIndex + 1) % upToDateFile.files.original.length;
                })
              }
            }
          }

          xhr.onerror = () => {
            this.latestSettings!.fileSettings.splice(i, 1);
            alert('Failed to load gif');
            return;
          }

          xhr.send();

          fileSetting = this.settingsBroker.fillMissingFileValues(fileSetting);
        }
        
        else if(['image/jpeg', 'image/png', 'image/webp'].includes(file.mimeType)) {
          fileSetting = this.settingsBroker.fillMissingFileValues(fileSetting);
          
          const originalImage = new Image();
          originalImage.src = fileSetting.src || '';

          fileSetting.files.original = [originalImage];
        }

        else if(file.mimeType.startsWith('video')) {
          // init a video element to load the video
          let video = document.createElement('video');
          video.src = file.src!;
          
          video.onloadeddata = () => {
            // load the video and extract the frames to handle it as a gif
            const videoFrames = require('video-frames');

            videoFrames({
              url: video.src,
              count: video.duration * 30, // extract 30 frames per second
              width: 720,
              onProgress: (framesExtracted: number, totalFrames: number) => {
                const updatedSettings = this.settingsBroker.getSettings();

                if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == file.unique_id) == -1)
                  return;

                updatedSettings.fileSettings.find((f) => f.unique_id == file.unique_id)!.metaData[MetaDataKeys.LOADING_PROGRESS] = `${framesExtracted} of ${totalFrames} frames`;
              }
            }).then((frames: { offset: number, image: string }[]) => {
              const updatedSettings = this.settingsBroker.getSettings();

              if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == file.unique_id) == -1)
                return;

              updatedSettings.fileSettings.find((f) => f.unique_id == file.unique_id)!.metaData[MetaDataKeys.LOADING_PROGRESS] = `Finalizing...`;

              let videoImages: HTMLImageElement[] = [];

              frames.forEach((frame) => {
                let image = new Image();
                image.src = frame.image;

                videoImages.push(image);
              });

              fileSetting = this.settingsBroker.fillMissingFileValues(fileSetting);
            });
          }
        }
      }
    });

    this.settingsBroker.updateSettings(this.latestSettings, this.MY_SETTINGS_BROKER_ID);
  }

  private draw(): void {
    console.log('drawing with latest settings: ', this.latestSettings);

    if(!this.latestSettings) {
      console.error("No latest settings found while drawing! Drawing cancelled.");
      return;
    }

    const canvas = this.displayCanvas?.nativeElement;
    if(!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.resetTransform();
    canvas.width = canvas.width;  // clears canvas as a side effect

    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.helperService.connectPointsWithStraightLines(ctx, this.innerEdgePoints, 'blue');
    this.helperService.connectPointsWithStraightLines(ctx, this.outerEdgePoints, 'red');

    const maxDisplayIndex = Math.max(...this.latestSettings.fileSettings.map((file) => file.displayIndex)) + 1;

    for(let iSide = 0; iSide < this.latestSettings.generalSettings.numberOfSides; iSide++) {

      const iImage = iSide % maxDisplayIndex;
      const imageData = this.lastDisplayedSettings!.fileSettings.find((entry) => entry.displayIndex === iImage);

      if(!imageData) {
        console.error("No image data found for side " + iSide + " and image " + iImage + "!");
        continue;
      };

      // load the image
      const image = imageData.files.scaled[Math.min(imageData.files.currentFileIndex, imageData.files.scaled.length)];
      if(!image) {
        console.error("No image found for side " + iSide + " and image " + iImage + "!");
        console.error(imageData)
        continue;
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
        ctx.translate(0, -this.innerPolygonIncircleRadius - this.canvasSize/4 - imageData.rotation);
        ctx.rotate(imageData.rotation * Math.PI / 180);

        // store the transformation matrix
        this.transformationMatrices[iSide].push(ctx.getTransform());
      }

      // apply the flip
      ctx.scale(imageData.flips.h ? -1 : 1, imageData.flips.v ? -1 : 1);
      // apply the brightness change
      ctx.filter = `brightness(${imageData.brightness}%)`;
      
      // draw the image
      ctx.drawImage(
        image,
        -image.width/2,
        -image.height/2,
        image.width,
        image.height
      );
    }
  }

  onCalculateClick(): void {
    if(!this.latestSettings) {
      console.error("Cannot calculate because no latest settings were found!")
      return;
    }

    const canvas = this.calculator.calculateImage(
      this.latestSettings.generalSettings.numberOfSides,
      this.calculatorSlope,
      this.latestSettings.generalSettings.innerPolygonSize,
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