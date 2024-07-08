export type StandardDisplaySettings = {
    generalSettings: GeneralSettings;
    fileSettings: FileSettings[];
}

type GeneralSettings = {
    numberOfSides: number;
    innerPolygonSize: number;
}

type FileSettings = {
    fileName: string;
    mimeType: string;
    unique_id: string;
    metaData: {[key in MetaDataKeys]: any};
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

type MetaDataSet = {
    [displayIndex: number]: {
      [key: string]: string;
    }
};

export enum MetaDataKeys {
    LOADING_STATE,
    LOADING_PROGRESS
}