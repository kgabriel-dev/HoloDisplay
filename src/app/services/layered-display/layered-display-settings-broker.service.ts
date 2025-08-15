import { Injectable } from '@angular/core';
import { LayeredDisplayFileSettings, LayeredDisplaySettings } from './layered-display-settings.type';
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
    this.settingsSubject.next({settings, changedBy});
  }

  public getSettings(): LayeredDisplaySettings {
    return this.settingsSubject.value.settings;
  }

  public generateUniqueId(mimeType: string, fileSettings=this.getSettings().fileSettings): string {
    return `${mimeType || 'unknown'}-${fileSettings.length > 0 ? fileSettings.length : 0}-${Math.floor(Math.random() * 1000000)}`;
  }

  public restoreLayerOrderConsistency(fileSettings: LayeredDisplayFileSettings[]): LayeredDisplayFileSettings[] {
    const settings = this.getSettings();

    const filesSortedByDisplayIndex = fileSettings.sort((a, b) => a.layer - b.layer);

    let currentIndex = 0;
    
    filesSortedByDisplayIndex.forEach((fileSetting) => {
      fileSetting.layer = currentIndex;
      currentIndex++;
    });

    return fileSettings;
  }

  public fillMissingFileValues(fileSetting: Partial<LayeredDisplayFileSettings>): LayeredDisplayFileSettings {
    const currSettings = this.getSettings();

    // function to get the next free layer
    const getNextFreeLayer = () => {
      let layer = 0;
      while(currSettings.fileSettings.some((fileSetting) => fileSetting.layer === layer))
        layer++;
      return layer;
    }

    // get the unique id
    const unique_id = fileSetting.unique_id || this.generateUniqueId(fileSetting.mimeType || '', currSettings.fileSettings);

    return {
      brightness: fileSetting.brightness || 100,
      fileName: fileSetting.fileName || unique_id,
      files: fileSetting.files || { original: [] as HTMLImageElement[], scaled: [] as HTMLImageElement[], currentFileIndex: 0 },
      flips: fileSetting.flips || { v: false, h: false },
      layer: fileSetting.layer != undefined ? fileSetting.layer : getNextFreeLayer(),
      metaData: fileSetting.metaData || {},
      mimeType: fileSetting.mimeType || 'unknown',
      position: fileSetting.position || 0,
      rotation: fileSetting.rotation || 0,
      scalingFactor: fileSetting.scalingFactor || 100,
      src: fileSetting.src || '',
      unique_id,
      fps: fileSetting.fps,
      loadingState: fileSetting.loadingState || 'not-loaded'
    }
  }
}
