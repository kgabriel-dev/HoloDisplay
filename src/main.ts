/// <reference types="@angular/localize" />

import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from "@angular/router";
import { AppRoutes } from "./app/app-routing";
import { AppComponent } from "./app/app.component";


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(AppRoutes),
    importProvidersFrom(HttpClientModule, BrowserAnimationsModule)
  ],
  
}).catch(err => console.error(err));