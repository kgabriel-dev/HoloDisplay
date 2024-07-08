import { Injectable } from '@angular/core';
import { StandardDisplaySettings } from './standard-display-settings.type';
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
}
