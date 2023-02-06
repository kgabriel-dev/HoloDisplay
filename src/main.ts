import { importProvidersFrom } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { HttpClientModule } from '@angular/common/http';
import { provideRouter, RouterModule } from "@angular/router";
import { AppRoutes } from "./app/app-routing";
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(AppRoutes),
    importProvidersFrom(HttpClientModule, BrowserAnimationsModule)
  ],
  
}).catch(err => console.error(err));