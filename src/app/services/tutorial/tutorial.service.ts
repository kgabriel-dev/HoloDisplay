import { Injectable } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { Subject } from 'rxjs';
import { LanguageService } from '../i18n/language.service';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {

  private tutorialEvents = new Subject<'start' | 'complete' | 'hideButtons' | 'showButtons'>();
  private currentTutorialName?: TutorialName;

  
  private readonly BUTTONS = {
    exit: {text: $localize `Exit`, action: 'exit'},
    back: {text: $localize `Back`, action: 'back'},
    next: {text: $localize `Next`, action: 'next'},
    finish: {text: $localize `Finish`, action: 'exit'}
  };

  constructor(private shepherd: ShepherdService, private languageService: LanguageService) {
    this.basic_initialization();
  }

  get tutorialEvents$() {
    return this.tutorialEvents.asObservable();
  }

  get isTutorialActive() {
    return this.shepherd.isActive;
  }

  private basic_initialization() {
    this.shepherd.defaultStepOptions = {
      scrollTo: false,
      cancelIcon: {
        enabled: true
      },
      buttons: this.getButtons([this.BUTTONS.exit, this.BUTTONS.back, this.BUTTONS.next])
    };

    this.shepherd.modal = true;
    this.shepherd.confirmCancel = false;
  }

  public startTutorial(tutorialName: TutorialName) {
    if(this.shepherd.tourObject) this.shepherd.tourObject.steps = [];

    this.currentTutorialName = tutorialName;
    switch(tutorialName) {
      case 'standardDisplay':
        this.loadStandardDisplayTutorial();
        break;
    }

    this.tutorialEvents.next('start');
    this.shepherd.start();
  }

  public isTutorialDeactivated(tutorialName: TutorialName) {
    return localStorage.getItem('tutorialDeactivated_' + tutorialName) === 'true';
  }

  public deactivateTutorial(tutorialName: TutorialName) {
    localStorage.setItem('tutorialDeactivated_' + tutorialName, 'true');
  }

  private loadStandardDisplayTutorial() {
    this.shepherd.addSteps([
      {
        id: 'welcome',
        attachTo: {
          element: '#displayCanvas',
          on: 'top'
        },
        buttons: this.getButtons([this.BUTTONS.exit, this.BUTTONS.next]),
        title: $localize`Welcome to the tutorial!`,
        text: [$localize`This is a tutorial to help you get started with the application.`],
        canClickTarget: false
      },
      {
        id: 'settings',
        attachTo: {
          element: '#settingsButton',
          on: 'bottom'
        },
        title: $localize`Settings`,
        text: [$localize`Click this button to open the settings menu.`],
        beforeShowPromise: () => {
          // make sure the buttons are shown
          return new Promise<void>(async (resolve) => {
            // preperations to later make sure the buttons are shown
            let buttonsShown = false;
            this.tutorialEvents.subscribe((event) => {
              if(event === 'showButtons') buttonsShown = true;
            });

            // tell the component to show the buttons
            this.tutorialEvents.next('showButtons');

            // now make sure the buttons are shown
            do await new Promise((resolve) => setTimeout(resolve, 2)); while(!buttonsShown);

            resolve();
          });
        },
        canClickTarget: false
      },
      {
        id: 'language',
        attachTo: {
          element: '#languageButton',
          on: 'bottom'
        },
        title: $localize`Language`,
        text:[$localize`This buttons lets you change the language.<br><br>Currently, English and German are supported.`],
        canClickTarget: false
      },
      {
        id: 'tutorial',
        attachTo: {
          element: '#tutorialButton',
          on: 'bottom'
        },
        title: $localize`Repeating the tutorial`,
        text: [$localize`If you want to see this tutorial again, click this button.`],
        canClickTarget: false
      },
      {
        id: 'methods',
        attachTo: {
          element: '#displayMethodSelection',
          on: 'bottom'
        },
        title: $localize`Display methods`,
        text: [$localize`Later, you can choose between different display methods here.`],
        canClickTarget: false
      },
      {
        id: 'calculator',
        attachTo: {
          element: '#calculatorButton',
          on: 'top'
        },
        title: $localize`Calculator`,
        text: [$localize`This button opens the calculator. It helps you to build everything you need to display a hologram.`],
        canClickTarget: false
      },
      {
        id: 'imprint',
        attachTo: {
          element: '#imprintButton',
          on: 'top'
        },
        title: $localize`Imprint`,
        text: [$localize`This button opens the imprint containing some legal information about this page.`],
        canClickTarget: false
      },
      {
        id: 'github',
        attachTo: {
          element: '#githubButton',
          on: 'top'
        },
        title: $localize`GitHub`,
        text: [$localize`This button opens the GitHub page of this project. Here you can find some help, the source code and more.<br><br>If you want to, you can help me to improve this project by contributing to it there.`],
        canClickTarget: false
      },
      {
        id: 'finished',
        attachTo: {
          element: '#displayCanvas',
          on: 'top'
        },
        buttons: this.getButtons([this.BUTTONS.back, this.BUTTONS.finish]),
        title: $localize`Finished!`,
        text: [$localize`You have finished the tutorial. I hope you enjoy creating holograms!`],
        canClickTarget: false
      }
    ])
  }

  private doTutorialAction(action: string) {
    return () => {
      if(action === 'next') {
        this.shepherd.next();
      } else if(action === 'exit') {
        this.shepherd.cancel();

        if(this.currentTutorialName)
          this.deactivateTutorial(this.currentTutorialName)

        this.tutorialEvents.next('complete');
      } else if(action === 'back') {
        this.shepherd.back();
      }
    }
  }

  private getButtons(buttons: typeof this.BUTTONS['exit' | 'back' | 'next'][]) {
    return buttons.map((button) => {
        return {
          text: button.text,
          action: this.doTutorialAction(button.action),
          label: button.text
        }
    });
  }
}

type TutorialName = 'standardDisplay';
type Button = { text: string, action: 'next' | 'exit' | 'back' }
