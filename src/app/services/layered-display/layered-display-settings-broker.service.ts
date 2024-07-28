import { Injectable } from '@angular/core';
import { LayeredDisplaySettings } from './layered-display-settings.type';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayeredDisplaySettingsBrokerService {
  private settingsSubject = new BehaviorSubject<{settings: LayeredDisplaySettings, changedBy: string | undefined}>({
    settings: {
      generalSettings: {
        numberOfLayers: 2
      },
      fileSettings: []
    },
    changedBy: undefined
  });
  public settings$ = this.settingsSubject.asObservable();

  public updateSettings(settings: LayeredDisplaySettings, changedBy: string): void {
    console.log('Updating settings by ' + changedBy, settings);

    this.settingsSubject.next({settings, changedBy});
  }

  public getSettings(): LayeredDisplaySettings {
    return this.settingsSubject.value.settings;
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
