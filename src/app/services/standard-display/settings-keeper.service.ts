import { Injectable } from '@angular/core';
import { StandardDisplaySettings } from './standard-display-settings.type';
import { environment } from 'src/environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SettingsKeeperService {
  private settings: StandardDisplaySettings = {
    generalSettings: {
      numberOfSides: environment.defaultValueSideCount
    },
    fileSettings: []
  }

  private settingsSubject = new BehaviorSubject<StandardDisplaySettings>(this.settings);
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.settings$.subscribe((settings) => (this.settings = settings));
  }

  public updateSettings(settings: StandardDisplaySettings): void {
    this.settingsSubject.next(settings);
  }

  public getSettings(): StandardDisplaySettings {
    return this.settings;
  }
}
