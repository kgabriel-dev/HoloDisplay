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
  readonly TEXT_FPS_PLUS = $localize`Increase FPS`;
  readonly TEXT_FPS_MINUS = $localize`Decrease FPS`;

  innerPolygonSize = new FormControl(Number(environment.defaultValueInnerPolygonSize));
  imageSizes: FormControl[] = [];
  imagePositions: FormControl[] = [];
  sideCount = new FormControl(Number(environment.defaultValueSideCount));
  imageSwapTime = new FormControl(Number(environment.defaultValueSwapTime));
  imageRotations: FormControl[] = [];
  imageFlips: { v: FormControl; h: FormControl }[] = [];
  imageBrightness: FormControl[] = [];
  imageTypes: string[] = [];
  gifFps: number[] = [];
  
  currentImages: { name: string; src: string, type: string }[] = [];
  imagesChanged$ = new Subject<{ src: string; type: string }[]>();

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
    this.imageSwapTime.valueChanges.subscribe((newValue) => {
      this.settingsBroadcaster.silentChangeOfSwapTime(newValue);
    });

    this.imagesChanged$.subscribe((imgList) => {
      this.settingsBroadcaster.broadcastChange('NewImages', imgList.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      }));
      this.settingsBroadcaster.broadcastChange('ImageSizes', this.imageSizes.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImagePositions', this.imagePositions.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImageRotations', this.imageRotations.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('ImageFlips', this.imageFlips.map((pair) => ({ v: pair.v.value, h: pair.h.value })));
      this.settingsBroadcaster.broadcastChange('ImageBrightness', this.imageBrightness.map((control) => control.value));
      this.settingsBroadcaster.broadcastChange('GifFps', this.gifFps);
    });

    this.controlsAndTargets.forEach((pair) => {
      pair.control.valueChanges.subscribe((newValue) => {
        this.settingsBroadcaster.broadcastChange(pair.target, newValue);
      });
    });

    this.settingsBroadcaster.selectNotificationChannel('SettingsReset').subscribe(() => {
      this.resetSettings();
    });

    this.settingsBroadcaster.selectNotificationChannel('RemovedImage').subscribe((index) => {
      this.deleteImage(index);
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
      imageTypes: this.imageTypes,
      gifFps: this.gifFps,
      images: this.currentImages.map((imagePair) => imagePair.src)
    };

    const dlink: HTMLAnchorElement = document.createElement('a');
    dlink.download = 'holodisplay-settings.json'; // the file name
    const myFileContent: string = JSON.stringify(currSettings, undefined, 2);
    dlink.href = 'data:text/plain;charset=utf-8,' + myFileContent;
    dlink.click(); // this will trigger the dialog window
    dlink.remove();
  }

  loadSettings(settings: SettingsData): void {
    // if there are no images, there is nothing to do here
    if(!settings.images || settings.images.length === 0) return;

    const numberOfImages = settings.images.length;

    // create standard values if necessary
    let standardImageSizes = Array(numberOfImages).fill(100),
        standardImagePositions = Array(numberOfImages).fill(0),
        standardImageRotations = Array(numberOfImages).fill(0),
        standardImageFlips = Array(numberOfImages).fill({ v: false, h: false }),
        standardImageBrightness = Array(numberOfImages).fill(100),
        standardGifFps = Array(numberOfImages).fill(10);

    // load settings or standard values into the form controls
    this.innerPolygonSize.setValue(settings.innerPolygonSize || 50);

    this.imageSizes = (settings.imageSizes || standardImageSizes)
      .map((size: number) => new FormControl(size));

    this.imagePositions = (settings.imagePositions || standardImagePositions)
      .map((pos: number) => new FormControl(pos));

    this.sideCount.setValue(settings.sideCount || 4);

    this.imageSwapTime.setValue(settings.imageSwapTime || 1000);

    this.imageRotations = (settings.imageRotations || standardImageRotations)
      .map((rot: number) => new FormControl(rot));

    this.imageFlips = (settings.imageFlips || standardImageFlips)
      .map((pair: { v: boolean, h: boolean }) => ({ v: new FormControl(pair.v), h: new FormControl(pair.h) }));

    this.imageBrightness = (settings.imageBrightness || standardImageBrightness)
      .map((brightness: number) => new FormControl(brightness));

    this.gifFps = (settings.gifFps || standardGifFps);

    // set image types by guessing them
    if(settings.images) {
      // there are image types listed, let's use and update them if they're "unknown"
      if(settings.imageTypes) {
        settings.imageTypes.forEach((type, index) => {
          if(type === 'unknown') {
            settings.imageTypes![index] = this.guessFileType(settings.images![index]);
          }
        });

        // if there were not enough types, guess the rest
        if(settings.imageTypes.length < numberOfImages) {
          const guessedTypes = settings.images.slice(settings.imageTypes.length).map((image) => this.guessFileType(image));
          settings.imageTypes = settings.imageTypes.concat(guessedTypes);
        }
      }

      // there are no image types listed, let's guess them all
      else {
        settings.imageTypes = settings.images.map((image) => this.guessFileType(image));
      }
    }


    this.currentImages = (settings.images)
      .map((src: string, index: number) => ({ name: $localize`Image` + ' #' + (index + 1), src, type: settings.imageTypes?.[index] || 'unknown'}));

    // broadcast the changes
    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      })
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

  addImage(src: string, name: string = '', type: string): void {
    this.imageSizes.push(new FormControl(100));
    this.imagePositions.push(new FormControl(0));
    this.imageRotations.push(new FormControl(0));
    this.imageFlips.push({ v: new FormControl(false), h: new FormControl(false) });
    this.imageBrightness.push(new FormControl(100));
    this.imageTypes.push(type);
    this.gifFps.push(type === 'image/gif' ? 10 : 0);

    this.currentImages.push({
      src,
      name: name || $localize`File` + ' #' + (this.currentImages.length + 1),
      type
    });
  }

  onUploadImagesClick(event: Event) {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      const fileReader = new FileReader();
      let readingIndex = 0;

      fileReader.onload = (e) => {
        this.addImage(
          e.target?.result?.toString() || '',
          fileList[readingIndex].name,
          fileList[readingIndex].type
        );

        // add image to the list
        if (++readingIndex < fileList.length)
          fileReader.readAsDataURL(fileList[readingIndex]);
        else    // all images have been read
          this.imagesChanged$.next(
            this.currentImages.map((imagePair) => {
              return { src: imagePair.src, type: imagePair.type };
            })
          );
      };

      fileReader.readAsDataURL(fileList[readingIndex]);
    }
  }

  addImageByUrl(url: string, type: string): void {
    // guess the name
    const urlSplits = url.split('.');
    const guessedName = urlSplits[urlSplits.length - 2].split('/').pop() + '.' + urlSplits[urlSplits.length - 1];

    this.addImage(url, guessedName, type);

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      })
    );
  }

  pushImageUp(imageIndex: number) {
    if (imageIndex <= 0) return;

    // swap values in the arrays
    [this.currentImages[imageIndex - 1], this.currentImages[imageIndex]] = [this.currentImages[imageIndex], this.currentImages[imageIndex - 1]];
    [this.imagePositions[imageIndex - 1], this.imagePositions[imageIndex]] = [this.imagePositions[imageIndex], this.imagePositions[imageIndex - 1]];
    [this.imageSizes[imageIndex - 1], this.imageSizes[imageIndex]] = [this.imageSizes[imageIndex], this.imageSizes[imageIndex - 1]];
    [this.imageRotations[imageIndex - 1], this.imageRotations[imageIndex]] = [this.imageRotations[imageIndex], this.imageRotations[imageIndex - 1]];
    [this.imageFlips[imageIndex - 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex - 1]];
    [this.imageBrightness[imageIndex - 1], this.imageBrightness[imageIndex]] = [this.imageBrightness[imageIndex], this.imageBrightness[imageIndex - 1]];
    [this.imageTypes[imageIndex - 1], this.imageTypes[imageIndex]] = [this.imageTypes[imageIndex], this.imageTypes[imageIndex - 1]];
    [this.gifFps[imageIndex - 1], this.gifFps[imageIndex]] = [this.gifFps[imageIndex], this.gifFps[imageIndex - 1]];

    // broadcast the changes
    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      })
    );
  }

  pushImageDown(imageIndex: number) {
    if (imageIndex >= this.currentImages.length - 1) return;

    // swap values in the arrays
    [this.currentImages[imageIndex + 1], this.currentImages[imageIndex]] = [this.currentImages[imageIndex], this.currentImages[imageIndex + 1]];
    [this.imagePositions[imageIndex + 1], this.imagePositions[imageIndex]] = [this.imagePositions[imageIndex], this.imagePositions[imageIndex + 1]];
    [this.imageSizes[imageIndex + 1], this.imageSizes[imageIndex]] = [this.imageSizes[imageIndex], this.imageSizes[imageIndex + 1]];
    [this.imageRotations[imageIndex + 1], this.imageRotations[imageIndex]] = [this.imageRotations[imageIndex], this.imageRotations[imageIndex + 1]];
    [this.imageFlips[imageIndex + 1], this.imageFlips[imageIndex]] = [this.imageFlips[imageIndex], this.imageFlips[imageIndex + 1]];
    [this.imageBrightness[imageIndex + 1], this.imageBrightness[imageIndex]] = [this.imageBrightness[imageIndex], this.imageBrightness[imageIndex + 1]];
    [this.imageTypes[imageIndex + 1], this.imageTypes[imageIndex]] = [this.imageTypes[imageIndex], this.imageTypes[imageIndex + 1]];
    [this.gifFps[imageIndex + 1], this.gifFps[imageIndex]] = [this.gifFps[imageIndex], this.gifFps[imageIndex + 1]];

    // broadcast the changes
    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      })
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
    this.imageTypes.splice(imageIndex, 1);
    this.gifFps.splice(imageIndex, 1);

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => {
        return { src: imagePair.src, type: imagePair.type };
      })
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
    let settingsUrl: string;

    // decide if the settings for desktop or mobile should be loaded
    if (window.innerWidth < 768)
      settingsUrl = 'assets/settings/holodisplay-settings-mobile.json';
    else
      settingsUrl = 'assets/settings/holodisplay-settings.json';

    this.http
        .get<SettingsData>(settingsUrl)
        .subscribe((data: SettingsData) => this.loadSettings(data));
  }

  guessFileType(data: string): string {    
    // check if it is base64 starting with data:category/type;base64,
    const type = data.split(';')[0].split(':')[1];
    if(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'].includes(type)) return type;
    
    // if it is not a known type, try to guess it from the end of the string (could be a url or a file name)
    const extension = data.split('.').pop()?.toLowerCase();

    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    else if (extension === 'png') return 'image/png';
    else if (extension === 'gif') return 'image/gif';
    else if (extension === 'webp') return 'image/webp';
    else if (extension === 'mp4') return 'video/mp4';

    // still not known, return unknown
    return 'unknown';
  }

  isUploadButtonEnabled(select: HTMLSelectElement, url: string): boolean {
    return select.value !== 'unknown' && url.length > 0;
  }

  changeFps(imageIndex: number, amount: number) {
    const oldValue = this.gifFps[imageIndex] || 10;
    let newValue = oldValue + amount;

    if(newValue < 1) newValue = 1;

    this.gifFps[imageIndex] = newValue;

    this.settingsBroadcaster.broadcastChange('GifFps', this.gifFps);
  }

  getLocalizedString(key: string, value: any): string {
    switch(key) {
      case 'brightness':
        return $localize`Brightness: ${value}%`;

      case 'flipped':
        return $localize`Flipped: ${value}`;

      case 'rotation':
        return $localize`Rotation: ${value}°`;

      case 'size':
        return $localize`Size: ${value}%`;

      case 'position':
        return $localize`Position: ${value}`;

      case 'framerate':
        return $localize`Framerate: ${value}fps`;

      default:
        return '';
    }
  }
}

export type SettingsData = {
  innerPolygonSize?: number;
  imageSizes?: number[];
  imagePositions?: number[];
  sideCount?: number;
  imageSwapTime?: number;
  imageRotations?: number[];
  imageFlips?: { v: boolean; h: boolean }[];
  imageBrightness?: number[];
  imageTypes?: string[];
  gifFps?: number[];
  images?: string[];
};
