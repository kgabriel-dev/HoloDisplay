import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  BroadcastTarget,
  SettingsBroadcastingService,
} from 'src/app/services/settings-broadcasting.service';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments.ts/environment';

@Component({
  selector: 'app-standard-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './standard-settings.component.html',
  styleUrls: ['./standard-settings.component.scss'],
})
export class SettingsComponent {
  innerPolygonSize = new FormControl(50);
  imageSize = new FormControl(400);
  imagePosition = new FormControl(0);
  sideCount = new FormControl(4);
  imageSwapTime = new FormControl(Number(environment.defaultValueSwapTime));

  currentSettingsFile: File | undefined;
  currentImages: { name: string; src: string }[] = [];
  imagesChanged$ = new Subject<string[]>();

  readonly controlsAndTargets: {
    control: FormControl;
    target: BroadcastTarget;
  }[] = [
    { control: this.innerPolygonSize, target: 'InnerPolygonSize' },
    { control: this.imageSize, target: 'ImageSize' },
    { control: this.imagePosition, target: 'ImagePosition' },
    { control: this.sideCount, target: 'SideCount' },
  ];

  constructor(
    private settingsBroadcaster: SettingsBroadcastingService,
    public router: Router
  ) {
    settingsBroadcaster.silentChangeOfSwapTime(this.imageSwapTime.value);
    this.imageSwapTime.valueChanges.subscribe((newValue) => {
      this.settingsBroadcaster.silentChangeOfSwapTime(newValue);
    });

    this.imagesChanged$.subscribe((imgList) => {
      this.settingsBroadcaster.broadcastChange('NewImages', imgList);
    });

    this.controlsAndTargets.forEach((pair) => {
      pair.control.valueChanges.subscribe((newValue) => {
        this.settingsBroadcaster.broadcastChange(pair.target, newValue);
      });
    });
  }

  saveSettings(): void {
    // build the settings string
    const currSettings: SettingsData = {
      innerPolygonSize: this.innerPolygonSize.value || 50,
      imageSize: this.imageSize.value || 100,
      imagePosition: this.imagePosition.value || 0,
      sideCount: this.sideCount.value || 4,
      imageSwapTime: this.imageSwapTime.value || 1000,
    };

    const dlink: HTMLAnchorElement = document.createElement('a');
    dlink.download = 'pyramid-display-settings.json'; // the file name
    const myFileContent: string = JSON.stringify(currSettings, undefined, 2);
    dlink.href = 'data:text/plain;charset=utf-16,' + myFileContent;
    dlink.click(); // this will trigger the dialog window
    dlink.remove();
  }

  loadSettings(event: Event): void {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      this.currentSettingsFile = fileList[0];

      // read in settings
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const loadedSettings = JSON.parse(fileReader.result?.toString() || '');

        this.innerPolygonSize.setValue(loadedSettings.innerPolygonSize || 50);
        this.imageSize.setValue(loadedSettings.imageSize || 100);
        this.imagePosition.setValue(loadedSettings.imagePosition || 0);
        this.sideCount.setValue(loadedSettings.sideCount || 4);
        this.imageSwapTime.setValue(loadedSettings.imageSwapTime || 1000);
      };
      fileReader.readAsText(this.currentSettingsFile);
    }
  }

  addImages(event: Event) {
    const element = event.currentTarget as HTMLInputElement,
      fileList = element.files;

    if (fileList) {
      const fileReader = new FileReader();
      let readingIndex = 0;

      fileReader.onload = (e) => {
        this.currentImages.push({
          src: e.target?.result?.toString() || 'FEHLER - ERROR',
          name: fileList[readingIndex].name,
        });

        if (++readingIndex < fileList.length)
          fileReader.readAsDataURL(fileList[readingIndex]);
        else
          this.imagesChanged$.next(
            this.currentImages.map((imagePair) => imagePair.src)
          );
      };

      fileReader.readAsDataURL(fileList[readingIndex]);
    }
  }

  pushImageUp(index: number) {
    if (index <= 0) return;

    this.currentImages.splice(
      index - 1,
      0,
      this.currentImages.splice(index, 1)[0]
    );

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }

  pushImageDown(index: number) {
    if (index >= this.currentImages.length - 1) return;

    this.currentImages.splice(
      index + 1,
      0,
      this.currentImages.splice(index, 1)[0]
    );

    this.imagesChanged$.next(
      this.currentImages.map((imagePair) => imagePair.src)
    );
  }
}

export type SettingsData = {
  innerPolygonSize: number;
  imageSize: number;
  imagePosition: number;
  sideCount: number;
  imageSwapTime: number;
};
