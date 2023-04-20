import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, fromEvent, map, Subject } from 'rxjs';
import { SettingsComponent } from '../displays/standard-method/standard-settings/standard-settings.component';
import { StandardDisplayComponent } from '../displays/standard-method/standard-display/standard-display.component';
import { LanguageService } from 'src/app/services/i18n/language.service';
import { StandardMethodCalculatorService } from 'src/app/services/calculators/standard-method/standard-method-calculator.service';

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
  doCalculation$ = new Subject<void>();

  readonly displayMethods: {name: string, component: any}[] = [
    { name: 'Standard Method', component: StandardDisplayComponent }
  ]

  constructor(public language: LanguageService, private calculator: StandardMethodCalculatorService) {
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
