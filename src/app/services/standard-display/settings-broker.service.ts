import { Injectable } from '@angular/core';
import { StandardDisplayFileSettings, StandardDisplaySettings } from './standard-display-settings.type';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SettingsBrokerService {
  private settings: StandardDisplaySettings = {
    generalSettings: {
      numberOfSides: environment.defaultValueSideCount,
      innerPolygonSize: environment.defaultValueInnerPolygonSize
    },
    fileSettings: []
  }

  private settingsSubject = new BehaviorSubject<{settings: StandardDisplaySettings, changedBy: string | undefined}>({
    settings: this.settings,
    changedBy: undefined
  });
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.settings$.subscribe((value) => (this.settings = value.settings));
  }

  public updateSettings(settings: StandardDisplaySettings, changedBy: string): void {
    this.settingsSubject.next({settings, changedBy});
  }

  public getSettings(): StandardDisplaySettings {
    return this.settings;
  }

  public fillMissingFileValues(fileSetting: Partial<StandardDisplayFileSettings>, resetInterval=true): StandardDisplayFileSettings {
    const currentSettings = this.getSettings();

    const getNextFreeDisplayIndex = () => {
      let index = 0;
      while(currentSettings.fileSettings.some((fileSetting) => fileSetting.displayIndex === index))
        index++;
      return index;
    }

    const newSettings = {
      brightness: fileSetting.brightness || 100,
      flips: fileSetting.flips || { v: false, h: false },
      position: fileSetting.position || 0,
      rotation: fileSetting.rotation || 0,
      scalingFactor: fileSetting.scalingFactor || 100,
      metaData: fileSetting.metaData || {},
      fileName: fileSetting.fileName || '',
      mimeType: fileSetting.mimeType || 'unknown',
      unique_id: fileSetting.unique_id || this.generateUniqueId(fileSetting.mimeType || ''),
      files: fileSetting.files || { original: [] as HTMLImageElement[], scaled: [] as HTMLImageElement[], currentFileIndex: 0 },
      displayIndex: fileSetting.displayIndex != undefined ? fileSetting.displayIndex : getNextFreeDisplayIndex(),
      src: fileSetting.src || '',
      fps: resetInterval ? undefined : (fileSetting.fps ? fileSetting.fps : undefined)
    }

    if(resetInterval)
      window.clearInterval(fileSetting.fps?.intervalId);
  
    return newSettings;
  }

  public generateUniqueId(mimeType: string): string {
    const settings = this.getSettings();

    if(mimeType === 'image/gif') {
      // count all the gifs
      const gifCount = settings.fileSettings.filter((f) => f.mimeType === 'image/gif').length || 0;
      return `gif-${gifCount}`;
    }

    else if(mimeType.startsWith('image')) {
      // count all the images
      const imageCount = settings.fileSettings.filter((f) => f.mimeType.startsWith('image')).length || 0;
      return `img-${imageCount}`;
    }

    else if(mimeType.startsWith('video')) {
      // count all the videos
      const videoCount = settings.fileSettings.filter((f) => f.mimeType.startsWith('video')).length || 0;
      return `vid-${videoCount}`;
    }

    // return an error id
    const errorCount = settings.fileSettings.filter((f) => f.unique_id.startsWith('error')).length || 0;
    return `error-${errorCount}`;
  }
}
