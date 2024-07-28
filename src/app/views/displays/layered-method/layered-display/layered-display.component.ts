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

      this.recalculateValues(settings.generalSettings)

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

    this.requestDraw$.next();
  }

  private recalculateValues(generalSettings: LayeredDisplayGeneralSettings): void {

  }

  private draw(): void {
    const canvas = this.displayCanvas.nativeElement;
    const ctx = this.displayCanvas.nativeElement.getContext('2d')!;
    const settings = this.settingsBroker.getSettings();

    ctx.save();
    ctx.resetTransform();
    canvas.width = canvas.width; // Clear the canvas

    // draw the lines between the layers
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;

    for(let i = 0; i < settings.generalSettings.numberOfLayers - 1; i++) {
      ctx.beginPath();
      ctx.moveTo((canvas.width / settings.generalSettings.numberOfLayers) * (i+1), 0);
      ctx.lineTo((canvas.width / settings.generalSettings.numberOfLayers) * (i+1), canvas.height);
      ctx.stroke();
    }
  }
}
