export type StandardDisplaySettings = {
    generalSettings: StandardDisplayGeneralSettings;
    fileSettings: StandardDisplayFileSettings[];
}

export type StandardDisplayGeneralSettings = {
    numberOfSides: number;
    innerPolygonSize: number;
}

export type StandardDisplayFileSettings = {
    fileName: string;
    mimeType: string;
    unique_id: string;
    metaData: {[key in MetaDataKeys]?: any};
    scalingFactor: number;
    rotation: number;
    position: number;
    flips: { v: boolean; h: boolean; };
    brightness: number;
    fps?: {
        intervalId: number;
        framerate: number;
    };
    files: {
        original: HTMLImageElement[];
        scaled: HTMLImageElement[];
        currentFileIndex: number;
    };
    src?: string;
    displayIndex: number;
}

export enum MetaDataKeys {
    LOADING_STATE,
    LOADING_PROGRESS,
}