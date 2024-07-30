import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { debounceTime, fromEvent, Observable, Subject } from 'rxjs';
import { LayeredDisplaySettingsBrokerService } from 'src/app/services/layered-display/layered-display-settings-broker.service';
import { LayeredDisplayGeneralSettings } from 'src/app/services/layered-display/layered-display-settings.type';

@Component({
  selector: 'app-layered-display',
  standalone: true,
  templateUrl: './layered-display.component.html',
  styleUrls: ['./layered-display.component.scss']
})
export class LayeredDisplayComponent implements AfterViewInit {
  @Input() resizeEvent$ = fromEvent(window, 'resize');

  private readonly requestDraw$ = new Subject<void>();
  private readonly MY_SETTINGS_BROKER_ID = "LayeredDisplayComponent";

  @ViewChild('displayCanvas') displayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;

  constructor(private settingsBroker: LayeredDisplaySettingsBrokerService) {
    settingsBroker.settings$.subscribe(({settings, changedBy}) => {
      if(changedBy == this.MY_SETTINGS_BROKER_ID) return;

      this.recalculateValues(settings.generalSettings);

      this.requestDraw$.next();
    });

    this.requestDraw$.subscribe(() => this.draw());
    this.resizeEvent$.pipe(debounceTime(100)).subscribe(() => this.onCanvasResize());
  }

  ngAfterViewInit(): void {
    this.recalculateValues(this.settingsBroker.getSettings().generalSettings);
    this.onCanvasResize();

    // TODO: Start the tutorial
  }

  onCanvasResize(): void {
    console.log('Canvas resized');
    // TODO: Scale the images

    this.recalculateValues(this.settingsBroker.getSettings().generalSettings);

    this.displayCanvas.nativeElement.width = this.container.nativeElement.clientWidth;
    this.displayCanvas.nativeElement.height = this.container.nativeElement.clientHeight;
    this.displayCanvas.nativeElement.style.width = `${this.container.nativeElement.clientWidth}px`;
    this.displayCanvas.nativeElement.style.height = `${this.container.nativeElement.clientHeight}px`;

    this.requestDraw$.next();
  }

  private recalculateValues(generalSettings: LayeredDisplayGeneralSettings): void {

  }

  private draw(): void {
    const canvas = this.displayCanvas.nativeElement;
    const ctx = this.displayCanvas.nativeElement.getContext('2d')!;
    const settings = this.settingsBroker.getSettings();
    const layerSize = canvas.width / settings.generalSettings.numberOfLayers;

    ctx.save();
    canvas.width = canvas.width; // Clear the canvas

    // draw the images
    for(let i = 0; i < settings.generalSettings.numberOfLayers; i++) {
      const layerFile = settings.fileSettings.find((f) => f.layer === i);

      if(!layerFile) {
        console.error(`No file for layer ${i}; Skipping...`);
        continue;
      }

      // draw the image in the center of the layer
      const image = new Image();
      image.src = layerFile.src;

      image.onload = () => {
        console.log('Image loaded');

        ctx.resetTransform();
        ctx.restore();
        ctx.save();

        ctx.translate(i * layerSize, 0);

        ctx.beginPath();
        ctx.rect(0, 0, layerSize, canvas.height);
        ctx.clip();

        ctx.rotate(Math.PI / 2);

        console.log(image.naturalWidth, image.naturalHeight);

        ctx.drawImage(
          image,
          canvas.height/2 - image.width/2 * (layerFile.scalingFactor/100),
          -layerSize/2 - image.height/2 * (layerFile.scalingFactor/100),
          image.width * (layerFile.scalingFactor/100),
          image.height * (layerFile.scalingFactor/100)
        );
      }
    }

    // draw the lines between the layers
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;

    for(let i = 0; i < settings.generalSettings.numberOfLayers - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(layerSize * (i+1), 0);
      ctx.lineTo(layerSize * (i+1), canvas.height);
      ctx.stroke();
    }
  }
}
