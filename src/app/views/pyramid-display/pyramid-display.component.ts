import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, fromEvent, map, Subject } from 'rxjs';
import { SettingsComponent } from '../displays/standard-method/standard-settings/standard-settings.component';
import { StandardDisplayComponent } from '../displays/standard-method/standard-display/standard-display.component';
import { LanguageService } from 'src/app/services/i18n/language.service';
import { TutorialService } from 'src/app/services/tutorial/tutorial.service';

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
  iconsCanBeInvisible = true;
  forceIconsVisible = false;
  mouseMoving$ = fromEvent(document, 'mousemove');
  resizeEvent$: Subject<Event>;
  doCalculation$ = new Subject<void>();

  readonly displayMethods: {name: string, component: any}[] = [
    { name: 'Standard Method', component: StandardDisplayComponent }
  ]

  constructor(public language: LanguageService, private tutorial: TutorialService) {
    this.mouseMoving$.pipe(
      map(() => this.iconsVisible = true),
      debounceTime(2000),
      map(() => this.iconsVisible = this.forceIconsVisible && !this.iconsCanBeInvisible),
    ).subscribe();

    tutorial.tutorialEvents$.subscribe((event) => {
      console.log(event);

      if(event == 'showButtons') {
        this.forceIconsVisible = true;
        this.iconsCanBeInvisible = false;
        this.iconsVisible = true;
      } else if(event == 'hideButtons') {
        this.forceIconsVisible = false;
        this.iconsCanBeInvisible = true;
      }
    });

    this.resizeEvent$ = new Subject<Event>();
  }

  onResize(event: Event) {
    this.resizeEvent$.next(event);
  }

  toggleModal(modalId: string): void {
    if(!document.getElementById(modalId)) return;

    document.getElementById(modalId)!.classList.toggle("hidden");
  }

  startCurrentTutorial() {
    switch(this.selectedDisplayMethod) {
      case 'Standard Method':
        this.tutorial.startTutorial('standardDisplay');
        break;
    }
  }

  hideIcons() {
    this.forceIconsVisible = false;
    this.iconsVisible = this.forceIconsVisible && !this.iconsCanBeInvisible;
  }
}
