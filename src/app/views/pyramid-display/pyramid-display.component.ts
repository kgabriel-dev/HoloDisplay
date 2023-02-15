import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StandardDisplayComponent } from '../displays/standard-display/standard-display.component';
import { debounceTime, fromEvent, map, Observable, Subject, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  selector: 'app-pyramid-display',
  standalone: true,
  imports: [CommonModule, SettingsComponent, StandardDisplayComponent, FormsModule],
  templateUrl: './pyramid-display.component.html',
  styleUrls: ['./pyramid-display.component.scss']
})
export class PyramidDisplayComponent {
  selectedDisplayMethod = 'Standard Method';

  iconsVisible = false;
  forceIconsVisible = false;
  mouseMoving$ = fromEvent(document, 'mousemove');
  resizeEvent$: Subject<Event>;

  readonly displayMethods: {name: string, component: any}[] = [
    { name: 'Standard Method', component: StandardDisplayComponent }
  ]

  constructor(public router: Router) {
    this.mouseMoving$.pipe(
      map(() => this.iconsVisible = true),
      debounceTime(2000),
      map(() => this.iconsVisible = this.forceIconsVisible),
    ).subscribe();

    this.resizeEvent$ = new Subject<Event>();
  }

  onResize(event: Event) {
    this.resizeEvent$.next(event);
  }
}
