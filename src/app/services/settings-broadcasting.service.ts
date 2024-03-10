import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SettingsBroadcastingService {
  private readonly innerPolygonSize$ = new BehaviorSubject<number>(
    environment.defaultValueInnerPolygonSize
  );
  private readonly imageSizes$ = new BehaviorSubject<number[]>(
    environment.defaultValueImageSizes
  );
  private readonly imagePositions$ = new BehaviorSubject<number[]>(
    environment.defaultValueImagePositions
  );
  private readonly sideCount$ = new BehaviorSubject<number>(
    environment.defaultValueSideCount
  );
  private readonly imageSwap$ = new BehaviorSubject<boolean>(
    environment.defaultValueImageSwap
  );
  private readonly newImages$ = new BehaviorSubject<{src: string, type: string}[]>(
    environment.defaultValueImageArray
  );
  private readonly imageRotations$ = new BehaviorSubject<number[]>([]);
  private readonly imageFlips$ = new BehaviorSubject<{ v: boolean; h: boolean }[]>([]);
  private readonly imageBrightness$ = new BehaviorSubject<number[]>([]);
  private readonly gifFps$ = new BehaviorSubject<number[]>([]);
  private readonly metaDataSet$ = new BehaviorSubject<MetaDataSet>({check: 'metaDataSet'});

  private readonly settingsReset$ = new Subject<void>();
  private readonly removedImage$ = new Subject<number>();

  private imageSwapTime = environment.defaultValueSwapTime;
  private imageSwapInterval?: number;

  public broadcastChange(
    target: BroadcastTarget,
    value: number | boolean | string[] | number[] | { v: boolean; h: boolean }[] | {src: string, type: string}[] | MetaDataSet
  ): void {
    switch (target) {
      case 'InnerPolygonSize':
        if (typeof value == 'number') this.innerPolygonSize$.next(value);
        break;

      case 'ImageSizes':
        if (Array.isArray(value)) this.imageSizes$.next(value as number[]);
        break;

      case 'ImagePositions':
        if (Array.isArray(value)) this.imagePositions$.next(value as number[]);
        break;

      case 'SideCount':
        if (typeof value == 'number') this.sideCount$.next(value);
        break;

      case 'SwapImage':
        if (typeof value == 'boolean' && value) this.imageSwap$.next(true);
        break;

      case 'NewImages':
        if (
          Array.isArray(value)
        )
          this.newImages$.next(value as {src: string, type: string}[]);
        break;
      
      case 'ImageRotations':
        if (Array.isArray(value)) this.imageRotations$.next(value as number[]);
        break;
      
      case 'ImageFlips':
        if (Array.isArray(value)) this.imageFlips$.next(value as { v: boolean; h: boolean }[]);
        break;

      case 'ImageBrightness':
        if (Array.isArray(value)) this.imageBrightness$.next(value as number[]);
        break;
      
      case 'RemovedImage':
        if (typeof value == 'number') this.removedImage$.next(value);
        break;
      
      case 'GifFps':
        if (Array.isArray(value)) this.gifFps$.next(value as number[]);
        break;
      
      case 'MetaDataSet':
        if (this.isMetaDataSet(value)) this.metaDataSet$.next(value as MetaDataSet);
        break;
    }
  }

  public silentChangeOfSwapTime(newTime: number | null): void {
    this.imageSwapTime = newTime || 250;

    if (this.imageSwapInterval) clearInterval(this.imageSwapInterval);

    this.imageSwapInterval = window.setInterval(() => {
      this.broadcastChange('SwapImage', true);
    }, this.imageSwapTime);
  }

  public selectNotificationChannel(target: BroadcastTarget): Observable<any> {
    switch (target) {
      case 'ImagePositions':
        return this.imagePositions$.asObservable();
      case 'ImageSizes':
        return this.imageSizes$.asObservable();
      case 'InnerPolygonSize':
        return this.innerPolygonSize$.asObservable();
      case 'SideCount':
        return this.sideCount$.asObservable();
      case 'SwapImage':
        return this.imageSwap$.asObservable();
      case 'NewImages':
        return this.newImages$.asObservable();
      case 'ImageRotations':
        return this.imageRotations$.asObservable();
      case 'ImageFlips':
        return this.imageFlips$.asObservable();
      case 'ImageBrightness':
        return this.imageBrightness$.asObservable();
      case 'SettingsReset':
        return this.settingsReset$.asObservable();
      case 'RemovedImage':
        return this.removedImage$.asObservable();
      case 'GifFps':
        return this.gifFps$.asObservable();
      case 'MetaDataSet':
        return this.metaDataSet$.asObservable();
    }
  }

  public getLastValue(channel: BroadcastTarget) {
    switch (channel) {
      case 'NewImages':
        return this.newImages$.getValue();
      case 'ImagePositions':
        return this.imagePositions$.getValue();
      case 'ImageSizes':
        return this.imageSizes$.getValue();
      case 'InnerPolygonSize':
        return this.innerPolygonSize$.getValue();
      case 'SideCount':
        return this.sideCount$.getValue();
      case 'SwapImage':
        return this.sideCount$.getValue();
      case 'ImageRotations':
        return this.imageRotations$.getValue();
      case 'ImageFlips':
        return this.imageFlips$.getValue();
      case 'ImageBrightness':
        return this.imageBrightness$.getValue();
      case 'GifFps':
        return this.gifFps$.getValue();
      case 'MetaDataSet':
        return this.metaDataSet$.getValue();

      // all other cases are not supported
      default:
        return;
    }
  }

  public requestSettingsReset(): void {
    this.settingsReset$.next();
  }

  private isMetaDataSet(data: any): data is MetaDataSet {
    let result = true;

    if (typeof data !== 'object') result = false;
    if (data.check !== 'metaDataSet') result = false;

    return result;
  }
}

export type BroadcastTarget =
  | 'InnerPolygonSize'
  | 'ImageSizes'
  | 'ImagePositions'
  | 'SideCount'
  | 'SwapImage'
  | 'NewImages'
  | 'ImageRotations'
  | 'ImageFlips'
  | 'ImageBrightness'
  | 'SettingsReset'
  | 'RemovedImage'
  | 'GifFps'
  | 'MetaDataSet';

export type MetaDataSet = {
  [displayIndex: number]: {
    [key: string]: string;
  },
  check: string;
}