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

  innerPolygonSize = new FormControl(Number(environment.defaultValueInnerPolygonSize));
  imageSizes: FormControl[] = [];
  imagePositions: FormControl[] = [];
  sideCount = new FormControl(Number(environment.defaultValueSideCount));
  imageSwapTime = new FormControl(Number(environment.defaultValueSwapTime));
  imageFlips: {v: boolean, h: boolean}[] = [];

  currentSettingsFile: File | undefined;
  currentImages: { name: string; src: string }[] = [];
  imagesChanged$ = new Subject<string[]>();

  readonly controlsAndTargets: {
    control: FormControl;
    target: BroadcastTarget;
  }[] = [
    { control: this.innerPolygonSize, target: 'InnerPolygonSize' },
    { control: this.sideCount, target: 'SideCount' },
  ];

  constructor(
    private settingsBroadcaster: SettingsBroadcastingService,
    public router: Router
  ) {
    settingsBroadcaster.silentChangeOfSwapTime(this.imageSwapTime.value);
    this.imageSwapTime.valueChanges.subscribe((newValue) => {
      this.settingsBroadcaster.silentChangeOfSwapTime(newValue);
    });

    this.imagesChanged$.subscribe((imgList) => {
      this.settingsBroadcaster.broadcastChange('NewImages', imgList);

      if(imgList.length > this.imageSizes.length) {
        for(let i = 0; i < imgList.length; i++) {
          this.imageSizes.push(new FormControl(100));
          this.imagePositions.push(new FormControl(0));
        }

        this.imageFlips.push({v: false, h: false});
      }

      this.settingsBroadcaster.broadcastChange('ImageSizes', this.imageSizes.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImagePositions', this.imagePositions.map((control) => control.value));

    });

    this.controlsAndTargets.forEach((pair) => {
      pair.control.valueChanges.subscribe((newValue) => {
        this.settingsBroadcaster.broadcastChange(pair.target, newValue);
      });
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
      imageFlips: this.imageFlips
    };

    const dlink: HTMLAnchorElement = document.createElement('a');
    dlink.download = 'pyramid-display-settings.json'; // the file name
    const myFileContent: string = JSON.stringify(currSettings, undefined, 2);
    dlink.href = 'data:text/plain;charset=utf-8,' + myFileContent;
    dlink.click(); // this will trigger the dialog window
    dlink.remove();
  }

  loadSettings(event: Event): void {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      this.currentSettingsFile = fileList[0];

      // read in settings
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const loadedSettings = JSON.parse(fileReader.result?.toString() || '');

        this.innerPolygonSize.setValue(loadedSettings.innerPolygonSize || 50);
        this.imageSizes = (loadedSettings.imageSizes || '[]').map((size: number) => new FormControl(size));
        this.imagePositions = (loadedSettings.imagePositions || '[]').map((pos: number) => new FormControl(pos));
        this.sideCount.setValue(loadedSettings.sideCount || 4);
        this.imageSwapTime.setValue(loadedSettings.imageSwapTime || 1000);
      };
      fileReader.readAsText(this.currentSettingsFile);
    }
  }

  addImages(event: Event) {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      const fileReader = new FileReader();
      let readingIndex = 0;

      fileReader.onload = (e) => {
        this.currentImages.push({
          src: e.target?.result?.toString() || 'FEHLER - ERROR',
          name: fileList[readingIndex].name,
        });

        if (++readingIndex < fileList.length)
          fileReader.readAsDataURL(fileList[readingIndex]);
        else
          this.imagesChanged$.next(
            this.currentImages.map((imagePair) => imagePair.src)
          );
      };

      fileReader.readAsDataURL(fileList[readingIndex]);
    }
  }

  pushImageUp(imageIndex: number) {
    if (imageIndex <= 0) return;

    // swap images, positions and sizes
    [this.currentImages[imageIndex - 1], this.currentImages[imageIndex]] = [this.currentImages[imageIndex], this.currentImages[imageIndex - 1]];
    [this.imagePositions[imageIndex - 1], this.imagePositions[imageIndex]] = [this.imagePositions[imageIndex], this.imagePositions[imageIndex - 1]];
    [this.imageSizes[imageIndex - 1], this.imageSizes[imageIndex]] = [this.imageSizes[imageIndex], this.imageSizes[imageIndex - 1]];
    [this.imageFlips[imageIndex - 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex - 1]];

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
    [this.imageFlips[imageIndex + 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex + 1]];

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
    this.imageFlips.splice(imageIndex, 1);

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  flipImage(imageIndex: number, direction: 'v' | 'h'): void {
    const img = new Image();
    img.src = this.currentImages[imageIndex].src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (direction === 'v') {
          this.imageFlips[imageIndex].v = !this.imageFlips[imageIndex].v;
          ctx.translate(0, img.height);
          ctx.scale(1, -1);
        } else if (direction === 'h') {
          this.imageFlips[imageIndex].h = !this.imageFlips[imageIndex].h;
          ctx.translate(img.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(img, 0, 0);
        this.currentImages[imageIndex].src = canvas.toDataURL();
        this.imagesChanged$.next(
          this.currentImages.map((imagePair) => imagePair.src)
        );
      }
    };
  
  }
}

export type SettingsData = {
  innerPolygonSize: number;
  imageSizes: number[];
  imagePositions: number[];
  sideCount: number;
  imageSwapTime: number;
  imageFlips: {v: boolean, h: boolean}[];
};
