import { Injectable } from '@angular/core';
import { ShepherdService } from 'angular-shepherd';

@Injectable({
  providedIn: 'platform'
})
export class TutorialService {

  constructor(private shepherd: ShepherdService) {
    this.basic_initialization();
  }

  private basic_initialization() {
    this.shepherd.defaultStepOptions = {
      scrollTo: false,
      cancelIcon: {
        enabled: true
      },
      buttons: [
        {
          text: 'Exit',
          action: this.doTutorialAction('cancel'),
          label: 'Exit'
        },
        {
          text: 'Back',
          action: this.doTutorialAction('back'),
          label: 'Back'
        },
        {
          text: 'Next',
          action: this.doTutorialAction('next'),
          label: 'Next',
        }
      ]
    };

    this.shepherd.modal = true;
    this.shepherd.confirmCancel = false;
  }

  public startTutorial() {
    this.shepherd.start();
  }

  public loadStandardDisplayTutorial() {
    this.shepherd.addSteps([
      {
        id: 'welcome',
        attachTo: {
          element: '#displayCanvas',
          on: 'top'
        },
        title: 'Welcome to the tutorial!',
        text: 'This is a tutorial to help you get started with the application.'
      },
      {
        id: 'settings',
        attachTo: {
          element: '#settingsButton',
          on: 'bottom'
        },
        title: 'Settings',
        text: 'Click this button to open the settings menu.'
      },
      {
        id: 'finished',
        attachTo: {
          element: '#displayCanvas',
          on: 'top'
        },
        buttons: [
          {
            text: 'Exit',
            action: this.doTutorialAction('cancel'),
            label: 'Exit'
          }
        ],
        title: 'Finished!',
        text: 'You have finished the tutorial. I hope you enjoy using the application!'
      }
    ])
  }

  private doTutorialAction(action: 'next' | 'cancel' | 'back') {
    return () => {
      if(action === 'next') {
        this.shepherd.next();
      } else if(action === 'cancel') {
        this.shepherd.cancel();
      } else if(action === 'back') {
        this.shepherd.back();
      }
    }
  }
}
