import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StandardDisplayComponent } from '../displays/standard-display/standard-display.component';
import { debounceTime, fromEvent, map, switchMap } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pyramid-display',
  standalone: true,
  imports: [CommonModule, StandardDisplayComponent],
  templateUrl: './pyramid-display.component.html',
  styleUrls: ['./pyramid-display.component.scss']
})
export class PyramidDisplayComponent {
  iconsVisible = false;
  mouseMoving$ = fromEvent(document, 'mousemove');

  readonly displayMethods: {name: string, component: any}[] = [
    { name: 'Standard Method', component: StandardDisplayComponent }
  ]

  constructor(public router: Router) {
    this.mouseMoving$.pipe(
      map(() => this.makeIconsVisible()),
      debounceTime(2000),
      map(() => this.makeIconsInvisible()),
    ).subscribe();
  }

  makeIconsVisible() {
    this.iconsVisible = true;
  }

  makeIconsInvisible() {
    this.iconsVisible = false;
  }
}
