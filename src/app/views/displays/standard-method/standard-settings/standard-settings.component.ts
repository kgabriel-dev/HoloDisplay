import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  BroadcastTarget,
  SettingsBroadcastingService,
} from 'src/app/services/settings-broadcasting.service';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-standard-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './standard-settings.component.html',
  styleUrls: ['./standard-settings.component.scss'],
})
export class SettingsComponent {
  readonly SCALING_STEP_SIZE = 5;
  readonly POSITIONING_STEP_SIZE = 5;

  readonly TEXT_MOVE_IMG_UP = $localize`Move image up`;
  readonly TEXT_MOVE_IMG_DOWN = $localize`Move image down`;
  readonly TEXT_DELETE_IMG = $localize`Delete image`;
  readonly TEXT_FLIP_IMG_VERT = $localize`Flip image vertically`;
  readonly TEXT_FLIP_IMG_HOR = $localize`Flip image horizontally`;
  readonly TEXT_ROTATE_IMG_PLUS = $localize`Rotate image clockwise`;
  readonly TEXT_ROTATE_IMG_MINUS = $localize`Rotate image counter-clockwise`;
  readonly TEXT_SCALE_IMG_UP = $localize`Scale image up`;
  readonly TEXT_SCALE_IMG_DOWN = $localize`Scale image down`;
  readonly TEXT_MOVE_IMG_OUT = $localize`Move image outwards`;
  readonly TEXT_MOVE_IMG_IN = $localize`Move image inwards`;
  readonly TEXT_IMG_BRIGHTER = $localize`Make image brighter`;
  readonly TEXT_IMG_DARKER = $localize`Make image darker`;
  readonly TEXT_IMG_URL_PLACEH = $localize`URL of the image`;

  innerPolygonSize = new FormControl(Number(environment.defaultValueInnerPolygonSize));
  imageSizes: FormControl[] = [];
  imagePositions: FormControl[] = [];
  sideCount = new FormControl(Number(environment.defaultValueSideCount));
  imageSwapTime = new FormControl(Number(environment.defaultValueSwapTime));
  imageRotations: FormControl[] = [];
  imageFlips: { v: FormControl; h: FormControl }[] = [];
  imageBrightness: FormControl[] = [];
  
  currentImages: { name: string; src: string }[] = [];
  imagesChanged$ = new Subject<string[]>();
  settingsResetRequested$ = this.settingsBroadcaster.selectNotificationChannel('SettingsReset');

  readonly controlsAndTargets: {
    control: FormControl;
    target: BroadcastTarget;
  }[] = [
    { control: this.innerPolygonSize, target: 'InnerPolygonSize' },
    { control: this.sideCount, target: 'SideCount' },
  ];

  constructor(
    private settingsBroadcaster: SettingsBroadcastingService,
    public router: Router,
    private http: HttpClient
  ) {
    settingsBroadcaster.silentChangeOfSwapTime(this.imageSwapTime.value);
    this.imageSwapTime.valueChanges.subscribe((newValue) => {
      this.settingsBroadcaster.silentChangeOfSwapTime(newValue);
    });

    this.imagesChanged$.subscribe((imgList) => {
      this.settingsBroadcaster.broadcastChange('NewImages', imgList);
      this.settingsBroadcaster.broadcastChange('ImageSizes', this.imageSizes.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImagePositions', this.imagePositions.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImageRotations', this.imageRotations.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImageFlips', this.imageFlips.map((pair) => ({ v: pair.v.value, h: pair.h.value })));
      this.settingsBroadcaster.broadcastChange('ImageBrightness', this.imageBrightness.map((control) => control.value));
    });

    this.controlsAndTargets.forEach((pair) => {
      pair.control.valueChanges.subscribe((newValue) => {
        this.settingsBroadcaster.broadcastChange(pair.target, newValue);
      });
    });

    this.settingsResetRequested$.subscribe(() => {
      this.resetSettings();
    });
  }

  saveSettings(): void {
    // build the settings string
    const currSettings: SettingsData = {
      innerPolygonSize: this.innerPolygonSize.value || 50,
      imagePositions: this.imagePositions.map((control) => control.value),
      imageSizes: this.imageSizes.map((control) => control.value),
      sideCount: this.sideCount.value || 4,
      imageSwapTime: this.imageSwapTime.value || 1000,
      imageRotations: this.imageRotations.map((control) => control.value),
      imageFlips: this.imageFlips.map((pair) => ({ v: pair.v.value, h: pair.h.value })),
      imageBrightness: this.imageBrightness.map((control) => control.value),
      images: this.currentImages.map((imagePair) => imagePair.src)
    };

    const dlink: HTMLAnchorElement = document.createElement('a');
    dlink.download = 'pyramid-display-settings.json'; // the file name
    const myFileContent: string = JSON.stringify(currSettings, undefined, 2);
    dlink.href = 'data:text/plain;charset=utf-8,' + myFileContent;
    dlink.click(); // this will trigger the dialog window
    dlink.remove();
  }

  loadSettings(settings: SettingsData): void {
    this.innerPolygonSize.setValue(settings.innerPolygonSize || 50);
    this.imageSizes = (settings.imageSizes || '[]').map((size: number) => new FormControl(size));
    this.imagePositions = (settings.imagePositions || '[]').map((pos: number) => new FormControl(pos));
    this.sideCount.setValue(settings.sideCount || 4);
    this.imageSwapTime.setValue(settings.imageSwapTime || 1000);
    this.imageRotations = (settings.imageRotations || '[]').map((rot: number) => new FormControl(rot));
    this.imageFlips = (settings.imageFlips || '[]').map((pair: { v: boolean, h: boolean }) => ({ v: new FormControl(pair.v), h: new FormControl(pair.h) }));
    this.imageBrightness = (settings.imageBrightness || '[]').map((brightness: number) => new FormControl(brightness));
    this.currentImages = (settings.images || '[]').map((src: string, index: number) => ({ name: $localize`Image` + ' #' + (index + 1), src }));

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  onLoadSettingsClick(event: Event): void {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList && fileList.length > 0) {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const loadedSettings = JSON.parse(fileReader.result?.toString() || '');
        this.loadSettings(loadedSettings);
      };

      fileReader.readAsText(fileList[0]);
    }
  }

  addImage(src: string, name: string = ''): void {
    this.imageSizes.push(new FormControl(100));
    this.imagePositions.push(new FormControl(0));
    this.imageRotations.push(new FormControl(0));
    this.imageFlips.push({ v: new FormControl(false), h: new FormControl(false) });
    this.imageBrightness.push(new FormControl(100));

    this.currentImages.push({
      src: src || '',
      name: name || $localize`Image` + ' #' + (this.currentImages.length + 1),
    });
  }

  onUploadImagesClick(event: Event) {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      const fileReader = new FileReader();
      let readingIndex = 0;

      fileReader.onload = (e) => {
        this.addImage(e.target?.result?.toString() || '', fileList[readingIndex].name);

        // add image to the list
        if (++readingIndex < fileList.length)
          fileReader.readAsDataURL(fileList[readingIndex]);
        else    // all images have been read
          this.imagesChanged$.next(
            this.currentImages.map((imagePair) => imagePair.src)
          );
      };

      fileReader.readAsDataURL(fileList[readingIndex]);
    }
  }

  addImageByUrl(url: string): void {
    this.addImage(url);
    
    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  pushImageUp(imageIndex: number) {
    if (imageIndex <= 0) return;

    // swap images, positions and sizes
    [this.currentImages[imageIndex - 1], this.currentImages[imageIndex]] = [this.currentImages[imageIndex], this.currentImages[imageIndex - 1]];
    [this.imagePositions[imageIndex - 1], this.imagePositions[imageIndex]] = [this.imagePositions[imageIndex], this.imagePositions[imageIndex - 1]];
    [this.imageSizes[imageIndex - 1], this.imageSizes[imageIndex]] = [this.imageSizes[imageIndex], this.imageSizes[imageIndex - 1]];
    [this.imageRotations[imageIndex - 1], this.imageRotations[imageIndex]] = [this.imageRotations[imageIndex], this.imageRotations[imageIndex - 1]];
    [this.imageFlips[imageIndex - 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex - 1]];
    [this.imageBrightness[imageIndex - 1], this.imageBrightness[imageIndex]] = [this.imageBrightness[imageIndex], this.imageBrightness[imageIndex - 1]];

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  pushImageDown(imageIndex: number) {
    if (imageIndex >= this.currentImages.length - 1) return;

    // swap images, positions and sizes
    [this.currentImages[imageIndex + 1], this.currentImages[imageIndex]] = [this.currentImages[imageIndex], this.currentImages[imageIndex + 1]];
    [this.imagePositions[imageIndex + 1], this.imagePositions[imageIndex]] = [this.imagePositions[imageIndex], this.imagePositions[imageIndex + 1]];
    [this.imageSizes[imageIndex + 1], this.imageSizes[imageIndex]] = [this.imageSizes[imageIndex], this.imageSizes[imageIndex + 1]];
    [this.imageRotations[imageIndex + 1], this.imageRotations[imageIndex]] = [this.imageRotations[imageIndex], this.imageRotations[imageIndex + 1]];
    [this.imageFlips[imageIndex + 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex + 1]];
    [this.imageBrightness[imageIndex + 1], this.imageBrightness[imageIndex]] = [this.imageBrightness[imageIndex], this.imageBrightness[imageIndex + 1]];

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  scaleImage(imageIndex: number, action: 'plus' | 'minus') {
    if (action === 'plus') this.imageSizes[imageIndex].setValue(this.imageSizes[imageIndex].value + this.SCALING_STEP_SIZE);
    else if (action === 'minus' && this.imageSizes[imageIndex].value > this.SCALING_STEP_SIZE) this.imageSizes[imageIndex].setValue(this.imageSizes[imageIndex].value - this.SCALING_STEP_SIZE);

    this.settingsBroadcaster.broadcastChange('ImageSizes', this.imageSizes.map((control) => control.value));
  }

  moveImage(imageIndex: number, action: 'up' | 'down') {
    if (action === 'up') this.imagePositions[imageIndex].setValue(this.imagePositions[imageIndex].value + this.POSITIONING_STEP_SIZE);
    else if (action === 'down') this.imagePositions[imageIndex].setValue(this.imagePositions[imageIndex].value - this.POSITIONING_STEP_SIZE);

    this.settingsBroadcaster.broadcastChange('ImagePositions', this.imagePositions.map((control) => control.value));
  }

  deleteImage(imageIndex: number): void {
    this.currentImages.splice(imageIndex, 1);
    this.imageSizes.splice(imageIndex, 1);
    this.imagePositions.splice(imageIndex, 1);
    this.imageRotations.splice(imageIndex, 1);
    this.imageFlips.splice(imageIndex, 1);
    this.imageBrightness.splice(imageIndex, 1);

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  flipImage(imageIndex: number, direction: 'v' | 'h'): void {
    this.imageFlips[imageIndex][direction].setValue(!this.imageFlips[imageIndex][direction].value);

    this.settingsBroadcaster.broadcastChange('ImageFlips', this.imageFlips.map((pair) => ({ v: pair.v.value, h: pair.h.value })));
  }

  rotateImage(imageIndex: number, angle: number): void {
    this.imageRotations[imageIndex].setValue((this.imageRotations[imageIndex].value + angle) % 360);

    this.settingsBroadcaster.broadcastChange('ImageRotations', this.imageRotations.map((control) => control.value));
  }

  getFlippingText(imageIndex: number) {
    const textFlipV = $localize`v`,
          textFlipH = $localize`h`;
    
    const flips = this.imageFlips[imageIndex];
    
    const texts = [
      ...flips.h.value ? [textFlipH] : [],
      ...flips.v.value ? [textFlipV] : []
    ];

    if(texts.length === 0) return $localize`None`;

    return texts.join(', ');
  }

  changeImageBrightness(imageIndex: number, amount: number) {
    const oldValue = this.imageBrightness[imageIndex].value;
    let newValue = oldValue + amount;

    if(newValue < 0) newValue = 0;

    this.imageBrightness[imageIndex].setValue(newValue);

    this.settingsBroadcaster.broadcastChange('ImageBrightness', this.imageBrightness.map((control) => control.value));
  }

  resetSettings(): void {
    this.http
        .get<SettingsData>('assets/settings/pyramid-display-settings.json')
        .subscribe((data: SettingsData) => this.loadSettings(data));
  }
}

export type SettingsData = {
  innerPolygonSize: number;
  imageSizes: number[];
  imagePositions: number[];
  sideCount: number;
  imageSwapTime: number;
  imageRotations: number[];
  imageFlips: { v: boolean; h: boolean }[];
  imageBrightness: number[];
  images: string[];
};
