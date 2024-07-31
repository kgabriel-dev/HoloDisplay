import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { LayeredDisplaySettingsBrokerService } from 'src/app/services/layered-display/layered-display-settings-broker.service';
import { LayeredDisplayGeneralSettings, LayeredDisplaySettings } from 'src/app/services/layered-display/layered-display-settings.type';
import { MetaDataKeys } from 'src/app/services/standard-display/standard-display-settings.type';

@Component({
  selector: 'app-layered-settings',
  standalone: true,
  templateUrl: './layered-settings.component.html',
  styleUrls: ['./layered-settings.component.scss']
})
export class LayeredDisplaySettingsComponent {
  readonly MY_SETTINGS_BROKER_ID = "LayeredDisplayUserSettingsComponent";

  constructor(private settingsBroker: LayeredDisplaySettingsBrokerService, private http: HttpClient) { 
    settingsBroker.settings$.subscribe(({settings, changedBy}) => {
      if(changedBy == "LayeredSettingsComponent") return;

      // TODO: Update the settings
    });

    this.resetSettings();
  }

  private resetSettings(): void {
    let settingsUrl: string;

    // TODO: check the display size and load either mobile or desktop settings
    settingsUrl = 'assets/settings/layered-display-method/desktop-settings.json';

    // load the settings
    this.http
      .get<SettingsData>(settingsUrl)
      .subscribe((data: SettingsData) => this.loadSettings(data));
  }

  private loadSettings(loadedSettings: SettingsData): void {
    const settings: LayeredDisplaySettings = {
      generalSettings: {
        numberOfLayers: loadedSettings.generalSettings.numberOfLayers
      },
      fileSettings: loadedSettings.fileSettings.map((file) => ({
          fileName: file.name,
          layer: file.layer,
          mimeType: file.mimeType,
          metaData: file.metaData,
          scalingFactor: file.scalingFactor,
          rotation: file.rotation,
          position: file.position,
          flips: file.flips,
          brightness: file.brightness,
          fps: file.framerate > 0 ? { framerate: file.framerate, intervalId: 0 } : undefined,
          files: {
            original: [],
            scaled: [],
            currentFileIndex: 0
          },
          src: file.src,
          unique_id: 'REPLACE_ME'
      }))
    };

    settings.fileSettings.forEach((fileSetting) => {
      fileSetting.unique_id = this.settingsBroker.generateUniqueId(fileSetting.mimeType, settings.fileSettings);
    });

    this.settingsBroker.updateSettings(settings, this.MY_SETTINGS_BROKER_ID);
  }
}

type SettingsData = {
  generalSettings: LayeredDisplayGeneralSettings;
  fileSettings: {
    name: string;
    layer: number;
    mimeType: string;
    metaData: {[key in MetaDataKeys]?: any};
    scalingFactor: number;
    rotation: number;
    position: number;
    flips: { v: boolean; h: boolean; };
    brightness: number;
    framerate: number;
    src: string;
  }[];
}
