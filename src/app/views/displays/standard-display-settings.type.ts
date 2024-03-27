import { MetaDataSet } from "src/app/services/settings-broadcasting.service";

export type StandardDisplaySettings = {
    generalSettings: GeneralSettings;
    fileSettings: FileSettings[];
};

type GeneralSettings = {
    numberOfSides: number;
};

type FileSettings = {
    fileName: string;
    mimeType: string;
    unique_id: string;
    metaData: MetaDataSet;
    scalingFactor: number;
    rotation: number;
    position: number;
    flips: { v: boolean; h: boolean; };
    brightness: number;
    fps?: {
        interval: number;
        framerate: number;
    };
    files: File[];
};