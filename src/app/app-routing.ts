import { Routes } from "@angular/router";
import { PyramidDisplayComponent } from "./views/pyramid-display/pyramid-display.component";
import { SettingsComponent } from "./views/settings/settings.component";

export const AppRoutes: Routes = [
    {
        path: 'settings',
        component: SettingsComponent,
        pathMatch: 'full'
    }, 
    {
        path: 'display',
        component: PyramidDisplayComponent
    }
]