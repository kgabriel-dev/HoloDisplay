import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MetaDataKeys, StandardDisplayFileSettings, StandardDisplayGeneralSettings, StandardDisplaySettings } from 'src/app/services/standard-display/standard-display-settings.type';
import { SettingsBrokerService } from 'src/app/services/standard-display/settings-broker.service';

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

  readonly MY_SETTINGS_BROKER_ID = "StandardDisplayUserSettingsComponent";

  public lastUsedSettings?: StandardDisplaySettings;

  constructor(
    private settingsBroker: SettingsBrokerService,
    public router: Router,
    private http: HttpClient
  ) {
    this.settingsBroker.settings$.subscribe(({settings, changedBy}) => {
      this.lastUsedSettings = settings;
    });

    this.resetSettings();
  }

  saveSettings(): void {
    const latestSesttings = this.settingsBroker.getSettings();

    const settingsToSave: SettingsData = {
      generalSettings: latestSesttings.generalSettings,
      fileSettings: latestSesttings.fileSettings.map((file) => ({
        src: file.src || '',
        fileName: file.fileName,
        mimeType: file.mimeType,
        displayIndex: file.displayIndex,
        scalingFactor: file.scalingFactor,
        position: file.position,
        flips: file.flips,
        rotation: file.rotation,
        brightness: file.brightness,
        metaData: file.metaData,
        framerate: file.fps?.framerate || 0
      }))
    }

    const dlink: HTMLAnchorElement = document.createElement('a');
    dlink.download = 'holodisplay-settings.json'; // the file name
    const myFileContent: string = JSON.stringify(settingsToSave, undefined, 2);
    dlink.href = 'data:text/plain;charset=utf-8,' + myFileContent;
    dlink.click(); // this will trigger the dialog window
    dlink.remove();
  }

  loadSettings(settings: SettingsData): void {
    const newSettings: StandardDisplaySettings = {
      generalSettings: settings.generalSettings,
      fileSettings: settings.fileSettings.map((file) => ({
        fileName: file.fileName,
        mimeType: file.mimeType,
        unique_id: this.settingsBroker.generateUniqueId(file.mimeType),
        metaData: file.metaData,
        scalingFactor: file.scalingFactor,
        position: file.position,
        flips: file.flips,
        rotation: file.rotation,
        brightness: file.brightness,
        fps: file.framerate > 0 ? { framerate: file.framerate, intervalId: 0 } : undefined,
        files: { original: [], scaled: [], currentFileIndex: 0 },
        src: file.src,
        displayIndex: file.displayIndex
      }))
    };

    newSettings.fileSettings.forEach((file) => this.settingsBroker.fillMissingFileValues(file));

    this.settingsBroker.updateSettings(newSettings, this.MY_SETTINGS_BROKER_ID);
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

  addImage(src: string, name: string = '', type: string, settings: StandardDisplaySettings): void {
    const newFileSettings = this.settingsBroker.fillMissingFileValues({
      src, fileName: name, mimeType: type, unique_id: this.settingsBroker.generateUniqueId(type)
    });

    settings.fileSettings.push(newFileSettings);
  }

  onUploadImagesClick(event: Event) {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files,
      settings = this.settingsBroker.getSettings();

    if (fileList) {
      const fileReader = new FileReader();
      let readingIndex = 0;

      fileReader.onload = (e) => {
        this.addImage(
          e.target?.result?.toString() || '',
          fileList[readingIndex].name,
          fileList[readingIndex].type,
          settings
        );

        // add image to the list
        if (++readingIndex < fileList.length)
          fileReader.readAsDataURL(fileList[readingIndex]);
        else   // all images have been read
          this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
      };

      fileReader.readAsDataURL(fileList[readingIndex]);
    }
  }

  addImageByUrl(url: string, type: string): void {
    // guess the name
    const urlSplits = url.split('.');
    const guessedName = urlSplits[urlSplits.length - 2].split('/').pop() + '.' + urlSplits[urlSplits.length - 1];
    const settings = this.settingsBroker.getSettings();

    this.addImage(url, guessedName, type, settings);

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  pushImageUp(imageIndex: number) {
    if (imageIndex <= 0) return;
    
    const settings = this.settingsBroker.getSettings();
    const changedFile = settings.fileSettings[imageIndex];
    
    if(!changedFile) {
      console.error("Couldn't find the file to move up!");
      return;
    }

    const fileToChangeWith = settings.fileSettings[imageIndex - 1];
    if(!fileToChangeWith) {
      console.error("Couldn't find the file to swap with!");
      return;
    }

    const tempDisplayIndex = changedFile.displayIndex;
    changedFile.displayIndex = fileToChangeWith.displayIndex;
    fileToChangeWith.displayIndex = tempDisplayIndex;

    // broadcast the changes
    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  pushImageDown(imageIndex: number) {
    const settings = this.settingsBroker.getSettings();

    if(imageIndex >= settings.fileSettings.length - 1) return;

    const changedFile = settings.fileSettings[imageIndex];
    if(!changedFile) {
      console.error("Couldn't find the file to move down!");
      return;
    }

    const fileToChangeWith = settings.fileSettings[imageIndex + 1];
    if(!fileToChangeWith) {
      console.error("Couldn't find the file to swap with!");
      return;
    }

    const tempDisplayIndex = changedFile.displayIndex;
    changedFile.displayIndex = fileToChangeWith.displayIndex;
    fileToChangeWith.displayIndex = tempDisplayIndex;

    // broadcast the changes
    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  scaleImage(imageIndex: number, action: 'plus' | 'minus') {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    if (action === 'plus') image.scalingFactor += this.SCALING_STEP_SIZE;
    else if (action === 'minus' && image.scalingFactor > this.SCALING_STEP_SIZE) image.scalingFactor -= this.SCALING_STEP_SIZE;

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  moveImage(imageIndex: number, action: 'up' | 'down') {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    if (action === 'up') image.position += this.POSITIONING_STEP_SIZE;
    else if (action === 'down') image.position -= this.POSITIONING_STEP_SIZE;

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  deleteImage(imageIndex: number): void {
    const settings = this.settingsBroker.getSettings();
    settings.fileSettings.splice(imageIndex, 1);

    settings.fileSettings = this.settingsBroker.restoreDisplayIndexConsistency(settings.fileSettings);

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  flipImage(imageIndex: number, direction: 'v' | 'h'): void {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    image.flips[direction] = !image.flips[direction];

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  rotateImage(imageIndex: number, angle: number): void {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    image.rotation = (image.rotation + angle) % 360;

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }

  getFlippingText(imageIndex: number) {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    const textFlipV = $localize`v`,
          textFlipH = $localize`h`;
    
    const texts = [
      ...image.flips.h ? [textFlipH] : [],
      ...image.flips.v ? [textFlipV] : []
    ];

    if(texts.length === 0) return $localize`None`;

    return texts.join(', ');
  }

  changeImageBrightness(imageIndex: number, amount: number) {
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    const oldValue = image.brightness;
    let newValue = oldValue + amount;

    if(newValue < 0) newValue = 0;

    image.brightness = newValue;

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
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
    const settings = this.settingsBroker.getSettings();
    const image = settings.fileSettings[imageIndex];

    if(!image) {
      console.error("Couldn't find the image to scale!");
      return;
    }

    if(!image.fps) return;

    const oldValue = image.fps.framerate;
    let newValue;

    if(oldValue <= 1) {
      const denominator = 1 / oldValue;
      let newDenominator = denominator - amount;

      if(newDenominator == 0) {
        if(amount > 0) newValue = amount == 1 ? 2 : amount;
        else {
          newDenominator = 1 - amount
          newValue = 1 / newDenominator;
        }
      } else {
        newValue = 1 / newDenominator;
      }
    } 
    else
      newValue = oldValue + amount;
    
    image.fps.framerate = newValue;

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
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

  getLocalizedMetaData(key: string): string {
    switch(key) {
      case MetaDataKeys.LOADING_STATE.toString():
        return $localize`Loading state`;

      case MetaDataKeys.LOADING_PROGRESS.toString():
        return $localize`Loading progress`;

      default:
        return '';
    }
  }

  updateSettingsAttribute(event: Event, key: string) {
    const settings = this.settingsBroker.getSettings();
    const value = Number.parseInt((event.currentTarget as HTMLInputElement).value);
    
    if(key == "NumberOfSides") {
      settings.generalSettings.numberOfSides = value;
      this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
    }
    else if(key == "InnerPolygonSize") {
      settings.generalSettings.innerPolygonSize = value;
      this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
    }
    else
      console.error("Couldn't find the settings to update for key '" + key + "'!");
  }

  getFilesSortedByDisplayIndex(): StandardDisplayFileSettings[] {
    const settings = this.settingsBroker.getSettings();

    return settings.fileSettings.sort((a, b) => a.displayIndex - b.displayIndex);
  }

  convertToReadableFps(fps: number): string {
    if(fps < 1) {
      let denominator = 1 / fps;
      denominator = Math.round(denominator);
      return `1/${denominator}`;
    }

    return fps.toString();
  }
}

type SettingsData = {
  generalSettings: StandardDisplayGeneralSettings;
  fileSettings: {
    fileName: string;
    mimeType: string;
    metaData: {[key in MetaDataKeys]?: any};
    scalingFactor: number;
    rotation: number;
    position: number;
    flips: { v: boolean; h: boolean; };
    brightness: number;
    framerate: number;
    src: string;
    displayIndex: number;
  }[];
}
