import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
  private readonly newImages$ = new BehaviorSubject<string[]>(
    environment.defaultValueImageArray
  );

  private imageSwapTime = environment.defaultValueSwapTime;
  private imageSwapInterval?: number;

  public broadcastChange(
    target: BroadcastTarget,
    value: number | boolean | string[] | number[]
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
          this.newImages$.next(value as string[]);
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
    }
  }
}

export type BroadcastTarget =
  | 'InnerPolygonSize'
  | 'ImageSizes'
  | 'ImagePositions'
  | 'SideCount'
  | 'SwapImage'
  | 'NewImages';
