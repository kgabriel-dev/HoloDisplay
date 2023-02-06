import { Routes } from "@angular/router";
import { SettingsComponent } from "./views/settings/settings.component";

export const AppRoutes: Routes = [
    {
        path: 'settings',
        component: SettingsComponent,
        pathMatch: 'full'
    }
]