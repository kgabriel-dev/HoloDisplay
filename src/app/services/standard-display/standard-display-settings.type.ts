export type StandardDisplaySettings = {
    generalSettings: GeneralSettings;
    fileSettings: FileSettings[];
}

type GeneralSettings = {
    numberOfSides: number;
}

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
        intervalId: number;
        framerate: number;
    };
    files: File[];
}

type MetaDataSet = {
    [displayIndex: number]: {
      [key: string]: string;
    }
};