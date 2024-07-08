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
      numberOfSides: environment.defaultValueSideCount
    },
    fileSettings: []
  }

  private settingsSubject = new BehaviorSubject<{settings: StandardDisplaySettings, topic: TOPICS}>({
    settings: this.settings,
    topic: TOPICS.BOTH
  });
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.settings$.subscribe((value) => (this.settings = value.settings));
  }

  public updateSettings(settings: StandardDisplaySettings): void {
    const topic = this.spotTopics(settings, this.settings);

    if(!topic) return;

    this.settingsSubject.next({settings, topic});
  }

  public getSettings(): StandardDisplaySettings {
    return this.settings;
  }

  private spotTopics(newSettings: StandardDisplaySettings, oldSettings: StandardDisplaySettings): TOPICS | undefined {
    let changesInGeneralSettings = false,
      changesInDisplaySettings = false;

    changesInGeneralSettings = JSON.stringify(newSettings.generalSettings) !== JSON.stringify(oldSettings.generalSettings);
    changesInDisplaySettings = JSON.stringify(newSettings.fileSettings) !== JSON.stringify(oldSettings.fileSettings);

    if (changesInGeneralSettings && changesInDisplaySettings) {
      return TOPICS.BOTH;
    } else if (changesInGeneralSettings) {
      return TOPICS.ONLY_GENERAL_SETTINGS;
    } else if (changesInDisplaySettings) {
      return TOPICS.ONLY_DISPLAY_SETTINGS;
    } else {
      return undefined;
    }
  }
}

export enum TOPICS {
  ONLY_GENERAL_SETTINGS,
  ONLY_DISPLAY_SETTINGS,
  BOTH
}
