import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input, OnInit,
  ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { decompressFrames, parseGIF } from 'gifuct-js';
import { Observable, Subject, debounceTime, merge } from 'rxjs';
import { StandardMethodCalculatorService } from 'src/app/services/calculators/standard-method/standard-method-calculator.service';
import { HelperService, Point } from 'src/app/services/helpers/helper.service';
import { StandardDisplaySettingsBrokerService } from 'src/app/services/standard-display/standard-display-settings-broker.service';
import { StandardDisplayFileSettings, MetaDataKeys, StandardDisplayGeneralSettings, StandardDisplaySettings } from 'src/app/services/standard-display/standard-display-settings.type';
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

  calculatorDPI = 96;
  calculatorSlope = 45;
  calculatorImageWidthPx = 0;
  calculatorImageHeightPx = 0;
  calculatorJsPixelRatio = window.devicePixelRatio;

  constructor(
    private helperService: HelperService,
    private calculator: StandardMethodCalculatorService,
    private tutorial: TutorialService,
    public settingsBroker: StandardDisplaySettingsBrokerService
  ) {
    settingsBroker.settings$.subscribe(({settings, changedBy}) => {
      if(changedBy == this.MY_SETTINGS_BROKER_ID) {
        return;
      }

      // update the calculated values (working with the general settings)
      this.recalculateValues(settings.generalSettings);

      // update the images (working with the file settings)
      this.updateImageSettings(settings);
    });

    this.requestDraw$.subscribe(() => this.draw());
  }

  ngOnInit(): void {
    this.resizeEvent$.pipe(debounceTime(20)).subscribe((event) => {
      this.resizeCanvas((event.target as Window).innerWidth, (event.target as Window).innerHeight);

      // scale the images again because the canvas size changed
      const settings = this.settingsBroker.getSettings();
      this.scaleImagesFromFileSetting(settings.fileSettings).then(() => {
        this.recalculateValues(settings.generalSettings);
        this.requestDraw$.next();
      });
    });

    // define the calculation function
    this.calculate$.subscribe(() => {
      this.toggleModal('calculatorExtraSettingsModal');
    });
  }

  ngAfterViewInit(): void {
    this.resizeCanvas(this.container.nativeElement.clientWidth, this.container.nativeElement.clientHeight);
    this.recalculateValues(this.settingsBroker.getSettings().generalSettings);

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

  private recalculateValues(generalSettings: StandardDisplayGeneralSettings): void {
    const sideCount = generalSettings.numberOfSides;

    this.angle = 2 * Math.PI / sideCount;
    let outerPolygon = this.helperService.getMaxRegPolygonPointsHeuristic(this.canvasSize, sideCount, false);
    this.polygonInfo = { rotation: outerPolygon.angle, offset: outerPolygon.offset, sides: sideCount };
    this.outerEdgePoints = this.helperService.centerPoints(outerPolygon.points, outerPolygon.offset).points;

    this.innerEdgePoints = [];
    for(let i = 0; i < sideCount; i++) {
      this.innerEdgePoints.push(this.helperService.getPointOnCircle(generalSettings.innerPolygonSize, i * this.angle - this.polygonInfo.rotation, {x: 0, y: 0}));
    }
    this.innerEdgePoints = this.helperService.centerPoints(this.innerEdgePoints, outerPolygon.offset).points;
    this.innerEdgePoints.reverse();
    const lastPoint = this.innerEdgePoints.pop() as Point;
    this.innerEdgePoints.unshift(lastPoint);

    this.innerPolygonIncircleRadius = this.helperService.getRadiusOfIncircleOfRegularPolygon((generalSettings.innerPolygonSize) / 2, sideCount);

    // reset transformation matrices because they are not valid anymore
    this.transformationMatrices = [];
  }

  private scaleImagesFromFileSetting(fileSettings: StandardDisplayFileSettings[]) {
    let settingsFinished = 0;

    fileSettings.forEach((fileSetting) => {
      const scalingFactor = fileSetting.scalingFactor;
      const originalFiles = fileSetting.files.original;

      if((fileSetting.mimeType === 'image/gif' || fileSetting.mimeType.startsWith('video')) && originalFiles.length > 0) {
        const newlyScaledFiles: HTMLImageElement[] = [];
        let loadedImages = 0;

        originalFiles.forEach((image) => {
          const scaled = document.createElement('img');
          scaled.src = image.src;
          scaled.width = image.width * scalingFactor/100;
          scaled.height = image.height * scalingFactor/100;

          scaled.onload = () => {
            newlyScaledFiles.push(scaled);
            loadedImages++;
          }

          scaled.onerror = () => {
            console.error('Failed to load gif frame');
            loadedImages++;
          }

        });

        // wait until all images are loaded
        const intervalId = window.setInterval(() => {
          if(loadedImages == originalFiles.length) {
            window.clearInterval(intervalId);
            fileSetting.files.scaled = newlyScaledFiles;
            settingsFinished++;
          }
        }, 100);
      }

      else if(fileSetting.mimeType.startsWith('image') && originalFiles.length > 0) {
        const scaled = document.createElement('img');
        scaled.src = originalFiles[0].src;
        scaled.width = originalFiles[0].width * scalingFactor/100;
        scaled.height = originalFiles[0].height * scalingFactor/100;


        scaled.onload = () => {
          fileSetting.files.scaled = [scaled];
          settingsFinished++;
        }

        scaled.onerror = () => {
          console.error('Failed to load image');
          settingsFinished++;
        }
      }
    });

    return new Promise<void>((resolve) => {
      const intervalId = window.setInterval(() => {
        if(settingsFinished == fileSettings.length) {
          clearInterval(intervalId);
          resolve();
        }
      }, 100);
    });
  }

  private updateImageSettings(settings: StandardDisplaySettings) {
    settings.fileSettings.forEach((latestFile) => {
      const unique_ids_displayed = settings.fileSettings.map((file) => file.unique_id);

      latestFile = this.settingsBroker.fillMissingFileValues(latestFile);

      // update the file if it is already displayed
      if(unique_ids_displayed.includes(latestFile.unique_id) && latestFile.files.original.length > 0) {
        const existingFile = settings.fileSettings.find((file) => file.unique_id == latestFile.unique_id)!;

        // update all changeable settings of the already existing file
        existingFile.brightness = latestFile.brightness;
        existingFile.flips = latestFile.flips;
        existingFile.metaData = latestFile.metaData;
        existingFile.position = latestFile.position;
        existingFile.rotation = latestFile.rotation;
        existingFile.scalingFactor = latestFile.scalingFactor;

        if(existingFile.mimeType === 'image/gif' || existingFile.mimeType.startsWith('video')) {
          const framerate = existingFile.fps?.framerate || (latestFile.mimeType === 'image/gif' ? 10 : 30);

          this.scaleImagesFromFileSetting([existingFile]).then(() => {
            const updatedSettings = this.settingsBroker.getSettings();
            const updatedFileIndex = updatedSettings.fileSettings.findIndex((f) => f.unique_id == existingFile.unique_id);

            if(updatedFileIndex == -1) return;

            if(existingFile.fps)
              window.clearInterval(existingFile.fps.intervalId);

            existingFile.fps = {
              framerate,
              intervalId: window.setInterval(() => {
                const updatedSettings = this.settingsBroker.getSettings();
  
                if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == existingFile.unique_id) == -1) return;
  
                const upToDateFile = updatedSettings.fileSettings.find((f) => f.unique_id == existingFile.unique_id)!;
  
                upToDateFile.files.currentFileIndex = (upToDateFile.files.currentFileIndex + 1) % upToDateFile.files.original.length;
  
                this.requestDraw$.next();
                this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);
              }, 1000/framerate)
            };

            updatedSettings.fileSettings[updatedFileIndex] = existingFile;
            this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);
          });
        }

        else if(existingFile.mimeType.startsWith('image')) {
          this.scaleImagesFromFileSetting([existingFile]).then(() => {
            const updatedSettings = this.settingsBroker.getSettings();
            const updatedFileIndex = updatedSettings.fileSettings.findIndex((f) => f.unique_id == existingFile.unique_id);

            if(updatedFileIndex == -1) return;

            updatedSettings.fileSettings[updatedFileIndex] = existingFile;
            this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);
            this.requestDraw$.next();
          });
        }
      }

      // load the file if it is not already displayed
      else {
        if(!latestFile.src) {
          console.error("Passed file has no src attribute and therefore cannot be loaded!", latestFile);
          return;
        }
        
        if(latestFile.fps)
          window.clearInterval(latestFile.fps.intervalId);

        if(latestFile.mimeType == 'image/gif') {
          // prepare a request to load the gif
          let xhr = new XMLHttpRequest();
          xhr.open('GET', latestFile.src!, true);
          xhr.responseType = 'arraybuffer';

          xhr.onload = () => {
            let arrayBuffer = xhr.response;
            
            if(arrayBuffer) {
              // parse the gif and load the frames
              let gif = parseGIF(arrayBuffer);
              let gifFrames = decompressFrames(gif, true);

              let gifImages: HTMLImageElement[] = [];
              let gifImagesLoaded = 0;

              // wait until all images are loaded by checking the number of loaded images every 100ms
              const interval = window.setInterval(() => {
                if(gifImagesLoaded == gifFrames.length) {
                  window.clearInterval(interval);
    
                  latestFile.files.original = gifImages;
                  latestFile.files.currentFileIndex = 0;
                  this.scaleImagesFromFileSetting([latestFile]).then(() => {
                    const updatedSettings = this.settingsBroker.getSettings();
                    const updatedFileIndex = updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id);
    
                    if(updatedFileIndex == -1) return;

                    if(latestFile.fps)
                      window.clearInterval(latestFile.fps.intervalId);
      
                    const framerate = latestFile.fps?.framerate || 10;

                    latestFile.fps = {
                      framerate,
                      intervalId: window.setInterval(() => {
                        const updatedSettings = this.settingsBroker.getSettings();
      
                        if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id) == -1) return;
      
                        const upToDateFile = updatedSettings.fileSettings.find((f) => f.unique_id == latestFile.unique_id)!;
      
                        upToDateFile.files.currentFileIndex = (upToDateFile.files.currentFileIndex + 1) % upToDateFile.files.original.length;
  
                        this.requestDraw$.next();
                      }, 1000/framerate)
                    }
    
                    updatedSettings.fileSettings[updatedFileIndex] = latestFile;
                    this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);
                  });
                }
              })

              // load the images
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

                image.onload = () => {
                  gifImagesLoaded++;
                }
              });
            }

            else {
              const settings = this.settingsBroker.getSettings();
              const latestFileIndex = settings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id);

              settings.fileSettings.splice(latestFileIndex, 1);
              alert('Failed to load gif');
              this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
              return;
            }
          }

          xhr.onerror = () => {
            const settings = this.settingsBroker.getSettings();
            const latestFileIndex = settings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id);

            settings.fileSettings.splice(latestFileIndex, 1);
            alert('Failed to load gif');
            this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
            return;
          }

          xhr.send();
        }
        
        else if(['image/jpeg', 'image/png', 'image/webp'].includes(latestFile.mimeType)) {          
          const originalImage = new Image();
          originalImage.src = latestFile.src || '';

          latestFile.files.original = [originalImage];
          latestFile.files.currentFileIndex = 0;

          originalImage.onload = () => this.scaleImagesFromFileSetting([latestFile]).then(() => {
              const updatedSettings = this.settingsBroker.getSettings();
              const updatedFileIndex = updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id);

              if(updatedFileIndex == -1) return;

              updatedSettings.fileSettings[updatedFileIndex] = latestFile;
              this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);
              this.requestDraw$.next();
            });
        }

        else if(latestFile.mimeType.startsWith('video')) {
          // clear the interval id if it exists
          if(latestFile.fps)
            window.clearInterval(latestFile.fps.intervalId);

          // init a video element to load the video
          let video = document.createElement('video');
          video.src = latestFile.src!;
          
          video.onloadeddata = () => {
            // load the video and extract the frames to handle it as a gif
            const videoFrames = require('video-frames');

            videoFrames({
              url: video.src,
              count: video.duration * 30, // extract 30 frames per second
              width: 720,
              onProgress: (framesExtracted: number, totalFrames: number) => {
                const updatedSettings = this.settingsBroker.getSettings();

                if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id) == -1)
                  return;

                updatedSettings.fileSettings.find((f) => f.unique_id == latestFile.unique_id)!.metaData[MetaDataKeys.LOADING_PROGRESS] = $localize`${framesExtracted} of ${totalFrames} frames`;
              }
            }).then((frames: { offset: number, image: string }[]) => {
              const updatedSettings = this.settingsBroker.getSettings();
              const updatedFile = updatedSettings.fileSettings.find((f) => f.unique_id == latestFile.unique_id);

              if(!updatedFile) return;

              updatedFile.metaData[MetaDataKeys.LOADING_PROGRESS] = $localize`Finalizing...`;
              this.settingsBroker.updateSettings(updatedSettings, this.MY_SETTINGS_BROKER_ID);

              let videoImages: HTMLImageElement[] = [];
              let videoImagesLoaded = 0;

              // wait until all images are loaded by checking the number of loaded images every 100ms
              const interval = window.setInterval(() => {
                if(videoImagesLoaded == frames.length) {
                  window.clearInterval(interval);
              
                  if(updatedFile.fps)
                    window.clearInterval(updatedFile.fps.intervalId);

                  delete latestFile.metaData[MetaDataKeys.LOADING_PROGRESS];
                  latestFile.files.original = videoImages;
                  latestFile.files.currentFileIndex = 0;
    
                  if(latestFile.fps)
                    window.clearInterval(latestFile.fps.intervalId);

                  const framerate = latestFile.fps?.framerate || 30;
    
                  this.scaleImagesFromFileSetting([latestFile]).then(() => {
                    latestFile.fps = {
                      framerate,
                      intervalId: window.setInterval(() => {
                        const updatedSettings = this.settingsBroker.getSettings();
      
                        if(updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id) == -1) return;
      
                        const upToDateFile = updatedSettings.fileSettings.find((f) => f.unique_id == latestFile.unique_id)!;
                        upToDateFile.files.currentFileIndex = (upToDateFile.files.currentFileIndex + 1) % upToDateFile.files.original.length;
      
                        this.requestDraw$.next();
                      }, 1000/framerate)
                    };
    
                    const updatedSettings = this.settingsBroker.getSettings();
                    const i = updatedSettings.fileSettings.findIndex((f) => f.unique_id == latestFile.unique_id);
                    updatedSettings.fileSettings[i] = latestFile;
      
                    this.settingsBroker.updateSettings(updatedSettings!, this.MY_SETTINGS_BROKER_ID);
                  });
                }
              }, 100);

              // load the images
              frames.forEach((frame) => {
                let image = new Image();
                image.src = frame.image;

                videoImages.push(image);

                image.onload = () => {
                  videoImagesLoaded++;
                }
              });
            });
          }
        }
      }
    });

    // remove all files that are not in the latest settings anymore
    settings.fileSettings.forEach((file) => {
      if(settings.fileSettings.findIndex((f) => f.unique_id == file.unique_id) == -1) {
        if(file.fps)
          window.clearInterval(file.fps.intervalId);
      }
    });

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  private draw(): void {const canvas = this.displayCanvas?.nativeElement;
    if(!canvas) return;

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.resetTransform();
    canvas.width = canvas.width;  // clears canvas as a side effect

    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.helperService.connectPointsWithStraightLines(ctx, this.innerEdgePoints, 'blue');
    this.helperService.connectPointsWithStraightLines(ctx, this.outerEdgePoints, 'red');

    const settings = this.settingsBroker.getSettings();

    const maxDisplayIndex = Math.max(...settings.fileSettings.map((file) => file.displayIndex)) + 1;

    for(let iSide = 0; iSide < settings.generalSettings.numberOfSides; iSide++) {
      const iImage = iSide % maxDisplayIndex;
      const imageData = settings.fileSettings.find((entry) => entry.displayIndex === iImage);

      if(!imageData) {
        continue;
      };

      // load the image
      const image = imageData.files.scaled[Math.min(imageData.files.currentFileIndex, imageData.files.scaled.length)];
      if(!image) {
        console.error(`No image found for side ${iSide} in image data!`);
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
        ctx.translate(0, -this.innerPolygonIncircleRadius - this.canvasSize/4 - imageData.position);
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
    const settings = this.settingsBroker.getSettings();

    const canvas = this.calculator.calculateImage(
      settings.generalSettings.numberOfSides,
      this.calculatorSlope,
      settings.generalSettings.innerPolygonSize,
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