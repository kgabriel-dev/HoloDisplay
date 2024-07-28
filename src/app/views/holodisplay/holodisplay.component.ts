import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, fromEvent, map, Subject } from 'rxjs';
import { SettingsComponent } from '../displays/standard-method/standard-settings/standard-settings.component';
import { StandardDisplayComponent } from '../displays/standard-method/standard-display/standard-display.component';
import { LanguageService } from 'src/app/services/i18n/language.service';
import { TutorialService } from 'src/app/services/tutorial/tutorial.service';
import { LayeredDisplayComponent } from '../displays/layered-method/layered-display/layered-display.component';

@Component({
  selector: 'app-holodisplay',
  standalone: true,
  imports: [CommonModule, SettingsComponent, StandardDisplayComponent, LayeredDisplayComponent, FormsModule],
  templateUrl: './holodisplay.component.html',
  styleUrls: ['./holodisplay.component.scss']
})
export class HoloDisplayComponent {
  selectedDisplayMethodId = 'StandardDisplayMethod';

  iconsVisible = false;
  iconsCanBeInvisible = true;
  forceIconsVisible = false;
  mouseMoving$ = fromEvent(document, 'mousemove');
  resizeEvent$: Subject<Event>;
  doCalculation$ = new Subject<void>();

  readonly displayMethods: {name: string, component: any, id: string}[] = [
    { name: $localize`Standard Display Method`, component: StandardDisplayComponent, id: 'StandardDisplayMethod' },
    { name: $localize`Layered Display Method`, component: LayeredDisplayComponent, id: 'LayeredDisplayMethod' }
  ]

  constructor(public language: LanguageService, private tutorial: TutorialService) {
    this.mouseMoving$.pipe(
      map(() => this.iconsVisible = true),
      debounceTime(2000),
      map(() => this.iconsVisible = this.forceIconsVisible && !this.iconsCanBeInvisible),
    ).subscribe();

    tutorial.tutorialEvents$.subscribe((event) => {
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
    switch(this.selectedDisplayMethodId) {
      case 'StandardDisplayMethod':
        this.tutorial.startTutorial('standardDisplay');
        break;

      case 'LayeredDisplayMethod':
        // TODO: Implement tutorial for layered display
        break;
    }
  }

  hideIcons() {
    this.forceIconsVisible = false;
    this.iconsVisible = this.forceIconsVisible && !this.iconsCanBeInvisible;
  }

  toggleFullScreen() {
    if(document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
}
