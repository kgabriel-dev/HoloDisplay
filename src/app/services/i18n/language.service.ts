import { getLocaleId } from '@angular/common';
import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  readonly languages = ['en-US', 'de-DE'];

  constructor(@Inject(LOCALE_ID) private locale: string, private router: Router) {}

  public getCurrentLanguageDetails() {
    return this.locale;
  }

  public getCurrentLanguage() {
    return getLocaleId(this.locale);
  }

  public changeToNextLanguage() {
    const currentLanguage = this.getCurrentLanguageDetails();

    const index = this.languages.indexOf(currentLanguage);
    this.changeLanguage(this.languages[(index + 1) % this.languages.length]);
  }

  public changeLanguage(language: string) {
    const currentUrl = window.location.href;
    const currentLanguage = this.getCurrentLanguageDetails();
    const newUrl = currentUrl.replace(currentLanguage, language);
    window.location.href = newUrl;
  }

}
