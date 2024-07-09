import { Injectable } from '@angular/core';
import { FileSettings, StandardDisplaySettings } from './standard-display-settings.type';
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

  public fillMissingFileValues(fileSetting: Partial<FileSettings>): FileSettings {
    return {
      brightness: fileSetting.brightness || 100,
      flips: fileSetting.flips || { v: false, h: false },
      position: fileSetting.position || 0,
      rotation: fileSetting.rotation || 0,
      scalingFactor: fileSetting.scalingFactor || 100,
      metaData: fileSetting.metaData || {},
      fileName: fileSetting.fileName || '',
      mimeType: fileSetting.mimeType || '',
      unique_id: fileSetting.unique_id || '',
      files: fileSetting.files || { original: [] as HTMLImageElement[], scaled: [] as HTMLImageElement[], currentFileIndex: 0 },
      displayIndex: fileSetting.displayIndex || 0,
      src: fileSetting.src || ''
    }
  }
}
