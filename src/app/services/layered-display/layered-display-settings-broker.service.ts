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

  public generateUniqueId(mimeType: string, fileSettings=this.getSettings().fileSettings): string {
    if(mimeType === 'image/gif') {
      // get all unique ids for gifs
      const gifIds = fileSettings.filter((f) => f.unique_id.startsWith('gif')).map((f) => parseInt(f.unique_id.split('-')[1]));

      // get the next unique id
      const nextId = Math.max(...gifIds, 0) + 1;

      return `gif-${nextId}`;
    }

    else if(mimeType.startsWith('image')) {
      // get all unique ids for images
      const imageIds = fileSettings.filter((f) => f.unique_id.startsWith('img')).map((f) => parseInt(f.unique_id.split('-')[1]));

      // get the next unique id
      const nextId = Math.max(...imageIds, 0) + 1;

      return `img-${nextId}`;
    }

    else if(mimeType.startsWith('video')) {
      // get all unique ids for videos
      const videoIds = fileSettings.filter((f) => f.unique_id.startsWith('video')).map((f) => parseInt(f.unique_id.split('-')[1]));

      // get the next unique id
      const nextId = Math.max(...videoIds, 0) + 1;

      return `video-${nextId}`;
    }

    else {
      // get all unique ids for unknown files
      const unknownIds = fileSettings.filter((f) => f.unique_id.startsWith('error')).map((f) => parseInt(f.unique_id.split('-')[1]));

      // get the next unique id
      const nextId = Math.max(...unknownIds, 0) + 1;

      return `error-${nextId}`;
    }
  }
}
