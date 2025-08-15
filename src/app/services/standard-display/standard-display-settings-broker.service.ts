import { Injectable } from '@angular/core';
import { StandardDisplayFileSettings, StandardDisplaySettings } from './standard-display-settings.type';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StandardDisplaySettingsBrokerService {
  private settings: StandardDisplaySettings = {
    generalSettings: {
      numberOfSides: 4,
      innerPolygonSize: 50
    },
    fileSettings: []
  }

  private settingsSubject = new BehaviorSubject<{settings: StandardDisplaySettings, changedBy: string | undefined}>({
    settings: this.settings,
    changedBy: undefined
  });
  public settings$ = this.settingsSubject.asObservable();

  public updateSettings(settings: StandardDisplaySettings, changedBy: string): void {
    this.settings = settings;
    this.settingsSubject.next({settings, changedBy});
  }

  public getSettings(): StandardDisplaySettings {
    return this.settings;
  }

  public fillMissingFileValues(fileSetting: Partial<StandardDisplayFileSettings>): StandardDisplayFileSettings {
    const currentSettings = this.getSettings();

    const getNextFreeDisplayIndex = () => {
      let index = 0;
      while(currentSettings.fileSettings.some((fileSetting) => fileSetting.displayIndex === index))
        index++;
      return index;
    }

    return {
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
      fps: fileSetting.fps
    }
  }

  public generateUniqueId(mimeType: string): string {
    const fileSettings = this.getSettings().fileSettings;
    return `${mimeType || 'unknown'}-${fileSettings.length > 0 ? fileSettings.length : 0}-${Math.floor(Math.random() * 1000000)}`;
  }

  public restoreDisplayIndexConsistency(fileSettings: StandardDisplayFileSettings[]): StandardDisplayFileSettings[] {
    const settings = this.getSettings();

    const filesSortedByDisplayIndex = fileSettings.sort((a, b) => a.displayIndex - b.displayIndex);

    let currentIndex = 0;
    
    filesSortedByDisplayIndex.forEach((fileSetting) => {
      fileSetting.displayIndex = currentIndex;
      currentIndex++;
    });

    return fileSettings;
  }
}
