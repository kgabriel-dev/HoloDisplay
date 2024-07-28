import { Injectable } from '@angular/core';
import { LayeredDisplaySettings } from './layered-display-settings.type';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LayeredDisplaySettingsBrokerService {
  private settings: LayeredDisplaySettings = {
    generalSettings: {
      numberOfLayers: 2
    },
    fileSettings: []
  }

  private settingsSubject = new BehaviorSubject<{settings: LayeredDisplaySettings, changedBy: string | undefined}>({
    settings: this.settings,
    changedBy: undefined
  });
  public settings$ = this.settingsSubject.asObservable();

  public updateSettings(settings: LayeredDisplaySettings, changedBy: string): void {
    this.settings = settings;
    this.settingsSubject.next({settings, changedBy});
  }

  public getSettings(): LayeredDisplaySettings {
    return this.settings;
  }
}
