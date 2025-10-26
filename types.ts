export interface StructuredText {
    tag: string;
    headline: string;
    cta: string;
}

export interface Post {
    id: string;
    texts: StructuredText[];
    activeTextIndex: number;
    image: string; // base64 encoded image
    imageMimeType: string;
}

// FIX: Add missing types for ComicCreator component
export interface Scene {
    sceneNumber: number;
    description: string;
    dialogue: string[];
}

export interface ComicScript {
    title: string;
    summary: string;
    scenes: Scene[];
}

export interface GeneratedPanel {
    imageBase64: string;
    mimeType: string;
    sceneNumber: number;
}
