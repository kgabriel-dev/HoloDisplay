import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from 'src/environments.ts/environment';

@Injectable({
  providedIn: 'root',
})
export class SettingsBroadcastingService {
  private readonly innerPolygonSize$ = new BehaviorSubject<number>(
    environment.defaultValueInnerPolygonSize
  );
  private readonly imageSize$ = new BehaviorSubject<number>(
    environment.defaultValueImageSize
  );
  private readonly imagePosition$ = new BehaviorSubject<number>(
    environment.defaultValueImagePosition
  );
  private readonly sideCount$ = new BehaviorSubject<number>(
    environment.defaultValueSideCount
  );
  private readonly imageSwap$ = new BehaviorSubject<boolean>(
    environment.defaultValueImageSwap
  );
  private readonly newImages$ = new BehaviorSubject<string[]>(
    environment.defaultValueImageArray
  );

  private imageSwapTime = environment.defaultValueSwapTime;
  private imageSwapInterval: NodeJS.Timer | undefined;

  public broadcastChange(
    target: BroadcastTarget,
    value: number | boolean | string[]
  ): void {
    switch (target) {
      case 'InnerPolygonSize':
        if (typeof value == 'number') this.innerPolygonSize$.next(value);
        break;

      case 'ImageSize':
        if (typeof value == 'number') this.imageSize$.next(value);
        break;

      case 'ImagePosition':
        if (typeof value == 'number') this.imagePosition$.next(value);
        break;

      case 'SideCount':
        if (typeof value == 'number') this.sideCount$.next(value);
        break;

      case 'SwapImage':
        if (typeof value == 'boolean' && value) this.imageSwap$.next(true);
        break;

      case 'NewImages':
        if (
          Array.isArray(value) &&
          value.every((entry) => typeof entry == 'string')
        )
          this.newImages$.next(value);
    }
  }

  public silentChangeOfSwapTime(newTime: number | null): void {
    this.imageSwapTime = newTime || 250;

    if (this.imageSwapInterval) clearInterval(this.imageSwapInterval);

    this.imageSwapInterval = setInterval(() => {
      this.broadcastChange('SwapImage', true);
    }, this.imageSwapTime);
  }

  public selectNotificationChannel(target: BroadcastTarget): Observable<any> {
    switch (target) {
      case 'ImagePosition':
        return this.imagePosition$.asObservable();

      case 'ImageSize':
        return this.imageSize$.asObservable();

      case 'InnerPolygonSize':
        return this.innerPolygonSize$.asObservable();

      case 'SideCount':
        return this.sideCount$.asObservable();

      case 'SwapImage':
        return this.imageSwap$.asObservable();

      case 'NewImages':
        return this.newImages$.asObservable();
    }
  }

  public getLastValue(channel: BroadcastTarget) {
    switch (channel) {
      case 'NewImages':
        return this.newImages$.getValue();
      case 'ImagePosition':
        return this.imagePosition$.getValue();
      case 'ImageSize':
        return this.imageSize$.getValue();
      case 'InnerPolygonSize':
        return this.innerPolygonSize$.getValue();
      case 'SideCount':
        return this.sideCount$.getValue();
      case 'SwapImage':
        return this.sideCount$.getValue();
    }
  }
}

export type BroadcastTarget =
  | 'InnerPolygonSize'
  | 'ImageSize'
  | 'ImagePosition'
  | 'SideCount'
  | 'SwapImage'
  | 'NewImages';
