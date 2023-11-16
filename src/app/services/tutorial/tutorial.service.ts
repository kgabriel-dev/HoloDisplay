import { Injectable } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {

  private tutorialEvents = new Subject<'start' | 'complete' | 'hideButtons' | 'showButtons'>();
  private currentTutorialName?: TutorialName;

  constructor(private shepherd: ShepherdService) {
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
      buttons: this.getButtons(['Exit', 'Back', 'Next'])
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
        buttons: this.getButtons(['Exit', 'Next']),
        title: 'Welcome to the tutorial!',
        text: ['This is a tutorial to help you get started with the application.'],
      },
      {
        id: 'settings',
        attachTo: {
          element: '#settingsButton',
          on: 'bottom'
        },
        title: 'Settings',
        text: 'Click this button to open the settings menu.',
        beforeShowPromise: () => {
          // make sure the buttons are shown
          return new Promise<void>((resolve) => {
            this.tutorialEvents.next('showButtons');
            resolve();
          });
        }
      },
      {
        id: 'language',
        attachTo: {
          element: '#languageButton',
          on: 'bottom'
        },
        title: 'Language',
        text: 'This buttons lets you change the language.<br><br>Currently, English and German are supported.',
      },
      {
        id: 'tutorial',
        attachTo: {
          element: '#tutorialButton',
          on: 'bottom'
        },
        title: 'Repeating the tutorial',
        text: 'If you want to see this tutorial again, click this button.',
      },
      {
        id: 'methods',
        attachTo: {
          element: '#displayMethodSelection',
          on: 'bottom'
        },
        title: 'Display methods',
        text: 'Later, you can choose between different display methods here.',
      },
      {
        id: 'calculator',
        attachTo: {
          element: '#calculatorButton',
          on: 'top'
        },
        title: 'Calculator',
        text: 'This button opens the calculator. It helps you to build everything you need to display a hologram.'
      },
      {
        id: 'finished',
        attachTo: {
          element: '#displayCanvas',
          on: 'top'
        },
        buttons: this.getButtons(['Back', 'Exit']),
        title: 'Finished!',
        text: 'You have finished the tutorial. I hope you enjoy creating holograms!'
      }
    ])
  }

  private doTutorialAction(action: 'next' | 'exit' | 'back') {
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

  private getButtons(buttons: ('Next' | 'Exit' | 'Back')[]) {
    return buttons.map((button) => {
      return {
        text: button,
        action: this.doTutorialAction(button.toLowerCase() as 'next' | 'exit' | 'back'),
        label: button
      }
    });
  }
}

type TutorialName = 'standardDisplay';
