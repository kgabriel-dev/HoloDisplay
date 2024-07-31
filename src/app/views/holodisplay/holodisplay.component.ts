import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, fromEvent, map, Subject } from 'rxjs';
import { StandardDisplaySettingsComponent } from '../displays/standard-method/standard-settings/standard-settings.component';
import { StandardDisplayComponent } from '../displays/standard-method/standard-display/standard-display.component';
import { LanguageService } from 'src/app/services/i18n/language.service';
import { TutorialService } from 'src/app/services/tutorial/tutorial.service';
import { LayeredDisplayComponent } from '../displays/layered-method/layered-display/layered-display.component';
import { LayeredDisplaySettingsComponent } from '../displays/layered-method/layered-settings/layered-settings.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-holodisplay',
  standalone: true,
  imports: [
    CommonModule,
    StandardDisplaySettingsComponent,
    StandardDisplayComponent,
    LayeredDisplayComponent,
    LayeredDisplaySettingsComponent,
    FormsModule
  ],
  templateUrl: './holodisplay.component.html',
  styleUrls: ['./holodisplay.component.scss']
})
export class HoloDisplayComponent implements OnInit {
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

  constructor(
    public language: LanguageService,
    private tutorial: TutorialService,
    private route: ActivatedRoute,
    private router: Router
  ) {
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

  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;

    if(queryParams['displayMethod']) {
      const allDisplayMethods = this.displayMethods.map(dm => dm.id);

      if(allDisplayMethods.includes(queryParams['displayMethod']))
        this.selectedDisplayMethodId = queryParams['displayMethod'];
      else {
        console.error(`Invalid display method: ${queryParams['displayMethod']}`);
        this.router.navigate([], {
          queryParams: { displayMethod: this.selectedDisplayMethodId },
          queryParamsHandling: 'merge'
        });
      }
    }
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

  updateQueryParams(key: string, value: string) {
    console.log(`Updating query params: ${key}=${value}`);
    this.router.navigate([], {
      queryParams: { [key]: value },
      queryParamsHandling: 'merge'
    });
  }
}
