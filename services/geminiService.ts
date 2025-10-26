// FIX: Import necessary response types from the @google/genai library.
import { GoogleGenAI, Type, Modality, GenerateContentResponse, GenerateImageResponse, VideosOperation } from "@google/genai";
// FIX: Add ComicScript to imports to be used in generateComicScript
import type { Post, StructuredText, ComicScript } from '../types';

const MODEL_TEXT = 'gemini-2.5-pro';
const MODEL_IMAGE_GENERATION = 'imagen-4.0-generate-001';
const MODEL_IMAGE_EDITING = 'gemini-2.5-flash-image';
// FIX: Add video generation model constant for generateVideo function
const MODEL_VIDEO_GENERATION = 'veo-3.1-fast-generate-preview';

type AspectRatio = '1:1' | '4:5' | '9:16';

/**
 * A higher-order function that wraps an API call with retry logic for rate limit errors.
 * Implements exponential backoff to wait for longer periods between retries.
 * @param apiCall The async function to call.
 * @param maxRetries The maximum number of times to retry.
 * @param initialDelay The initial delay in milliseconds.
 * @returns The result of the API call.
 * @throws A user-friendly error if all retries fail, or the original error for non-rate-limit issues.
 */
const withRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 5000): Promise<T> => {
    let delay = initialDelay;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await apiCall();
        } catch (e: any) {
            const errorMessage = e?.toString().toLowerCase() || '';
            
            // Check if it's a rate limit error.
            if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
                console.warn(`Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                // Not a rate limit error, re-throw immediately.
                throw e;
            }
        }
    }
    
    // After all retries, throw a user-friendly error.
    throw new Error("Você atingiu o limite de solicitações. Por favor, aguarde um pouco e tente novamente.");
};


function createAIInstance() {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const structuredTextSchema = {
    type: Type.OBJECT,
    properties: {
        tag: {
            type: Type.STRING,
            description: "Uma etiqueta curta de categoria, com 2-3 palavras. Ex: 'DICA RÁPIDA', 'MARKETING DIGITAL'. Em maiúsculas."
        },
        headline: {
            type: Type.STRING,
            description: "O título principal do post, chamativo e conciso, com no máximo 15 palavras."
        },
        cta: {
            type: Type.STRING,
            description: "Uma chamada para ação (call to action) curta e direta. Ex: 'SEGUE O FIO >>>', 'SAIBA MAIS'. Em maiúsculas."
        }
    },
     required: ["tag", "headline", "cta"]
}

const postSchemaWithImagePrompt = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: {
            type: Type.STRING,
            description: "Um prompt detalhado e descritivo para um modelo de geração de imagem criar uma imagem visualmente deslumbrante e relevante para o post. Descreva o estilo, assunto, cores e composição."
        },
        captionOptions: {
            type: Type.ARRAY,
            description: "Uma lista de 3 opções de legenda criativas e distintas para o post.",
            items: structuredTextSchema
        }
    },
    required: ["imagePrompt", "captionOptions"]
};

const postSchemaTextOnly = {
     type: Type.OBJECT,
    properties: {
        captionOptions: {
            type: Type.ARRAY,
            description: "Uma lista de 3 opções de legenda criativas e distintas para o post, baseadas na imagem e no prompt.",
            items: structuredTextSchema
        }
    },
    required: ["captionOptions"]
};

// FIX: Add schemas for comic script generation
const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        sceneNumber: { type: Type.INTEGER, description: "Número sequencial da cena, começando em 1." },
        description: { type: Type.STRING, description: "Descrição visual detalhada da cena, incluindo personagens, cenário, ações e emoções. Deve ser um prompt claro para um modelo de geração de imagem." },
        dialogue: {
            type: Type.ARRAY,
            description: "Uma lista de diálogos curtos para a cena. Pode estar vazia se não houver fala.",
            items: { type: Type.STRING }
        }
    },
    required: ["sceneNumber", "description", "dialogue"]
};

const comicScriptSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "Um título criativo e curto para a história em quadrinhos." },
        summary: { type: Type.STRING, description: "Um resumo conciso da história em uma frase." },
        scenes: {
            type: Type.ARRAY,
            description: "Uma lista de 3 a 6 cenas que compõem a história.",
            items: sceneSchema
        }
    },
    required: ["title", "summary", "scenes"]
};

export const generateInitialPosts = async (
    prompt: string, 
    postType: 'single' | 'carousel',
    uploadedImage: { base64: string; mimeType: string } | undefined,
    includeCaption: boolean
): Promise<Post[]> => {
    const gemini = createAIInstance();
    const isCarousel = postType === 'carousel';

    if (!includeCaption) {
        if (uploadedImage) {
            return [{
                id: crypto.randomUUID(),
                texts: [],
                activeTextIndex: 0,
                image: uploadedImage.base64,
                imageMimeType: uploadedImage.mimeType,
            }];
        } else {
            const count = isCarousel ? 5 : 1;
            const generatedImages = [];
            for (let i = 0; i < count; i++) {
                // Adiciona um atraso entre as solicitações para evitar o limite de taxa
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // atraso de 2 segundos
                }
                const generatedImage = await generateImage(prompt);
                generatedImages.push(generatedImage);
            }
            
            return generatedImages.map(({ image, mimeType }) => ({
                id: crypto.randomUUID(),
                texts: [],
                activeTextIndex: 0,
                image: image,
                imageMimeType: mimeType,
            }));
        }
    }

    const countText = isCarousel ? "de 2 a 5" : "uma";

    if (uploadedImage) {
        const generationPrompt = `Baseado na imagem fornecida e na solicitação do usuário, gere ${countText} ideias de posts para redes sociais. Para cada ideia, forneça 3 opções de legenda distintas no formato estruturado (tag, headline, cta). Solicitação do usuário: "${prompt || 'Crie um texto que combine com a imagem.'}"`;

        // FIX: Add explicit type GenerateContentResponse to the response object.
        const response: GenerateContentResponse = await withRetry(() => gemini.models.generateContent({
            model: MODEL_TEXT,
            contents: { 
                parts: [
                    { inlineData: { data: uploadedImage.base64, mimeType: uploadedImage.mimeType } },
                    { text: generationPrompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        posts: {
                            type: Type.ARRAY,
                            items: postSchemaTextOnly
                        }
                    }
                }
            }
        }));

        const resultJson = JSON.parse(response.text);

        return resultJson.posts.map((postData: { captionOptions: StructuredText[] }) => ({
            id: crypto.randomUUID(),
            texts: postData.captionOptions,
            activeTextIndex: 0,
            image: uploadedImage.base64,
            imageMimeType: uploadedImage.mimeType,
        }));

    } else {
        const generationPrompt = `Com base na seguinte solicitação do usuário, gere ${countText} ideias únicas de posts para redes sociais. Cada ideia deve incluir um prompt de imagem detalhado e 3 opções distintas de legenda no formato estruturado (tag, headline, cta). Solicitação do usuário: "${prompt}"`;

        // FIX: Add explicit type GenerateContentResponse to the response object.
        const response: GenerateContentResponse = await withRetry(() => gemini.models.generateContent({
            model: MODEL_TEXT,
            contents: generationPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        posts: {
                            type: Type.ARRAY,
                            items: postSchemaWithImagePrompt
                        }
                    }
                }
            }
        }));

        const resultJson = JSON.parse(response.text);
        
        const postsData = resultJson.posts as { imagePrompt: string; captionOptions: StructuredText[] }[];
        const generatedPosts: Post[] = [];

        for (const [index, postData] of postsData.entries()) {
            // Adiciona um atraso entre as solicitações para evitar o limite de taxa
            if (index > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // atraso de 2 segundos
            }
            const { image, mimeType } = await generateImage(postData.imagePrompt);
            generatedPosts.push({
                id: crypto.randomUUID(),
                texts: postData.captionOptions,
                activeTextIndex: 0,
                image: image,
                imageMimeType: mimeType,
            });
        }

        return generatedPosts;
    }
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio = '1:1'): Promise<{ image: string; mimeType: string; }> => {
    const gemini = createAIInstance();
    // A API Imagen suporta '1:1', '9:16', '16:9', '4:3', '3:4'. Mapeamos 4:5 para 3:4 como uma aproximação razoável.
    const apiAspectRatio = aspectRatio === '4:5' ? '3:4' : aspectRatio;
    
    // FIX: Add explicit type GenerateImageResponse to the response object.
    const response: GenerateImageResponse = await withRetry(() => gemini.models.generateImages({
        model: MODEL_IMAGE_GENERATION,
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: apiAspectRatio,
        },
    }));

    const generatedImage = response.generatedImages?.[0];

    if (!generatedImage?.image?.imageBytes) {
        console.error("Invalid response from Imagen API for image generation:", JSON.stringify(response, null, 2));
        throw new Error("A IA não conseguiu gerar uma imagem para este comando. Tente ser mais descritivo ou alterar o seu pedido.");
    }
    
    const image_response = generatedImage.image;
    
    return {
        image: image_response.imageBytes,
        mimeType: image_response.mimeType || 'image/png'
    };
};

export const editImage = async (base64Image: string, mimeType: string, editPrompt: string): Promise<string> => {
    const gemini = createAIInstance();
    // FIX: Add explicit type GenerateContentResponse to the response object.
    const response: GenerateContentResponse = await withRetry(() => gemini.models.generateContent({
        model: MODEL_IMAGE_EDITING,
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                { text: editPrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    }));

    const firstCandidate = response.candidates?.[0];
    
    // Check for safety blocks first
    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
        throw new Error(`A edição da imagem foi bloqueada por motivos de segurança: ${blockReason}. Por favor, tente um prompt diferente.`);
    }

    if (!firstCandidate) {
        console.error("Invalid response from Gemini API for image editing:", JSON.stringify(response, null, 2));
        throw new Error("A edição da imagem falhou: A API retornou uma resposta vazia ou inválida.");
    }

    // Check for specific finish reasons that indicate failure
    if (firstCandidate.finishReason === 'NO_IMAGE') {
         throw new Error("A IA não conseguiu editar a imagem com este comando. Tente ser mais claro ou alterar o seu pedido.");
    }

    // Now, try to find the image data
    const imagePart = firstCandidate.content?.parts?.find(part => part.inlineData);

    if (imagePart?.inlineData) {
        return imagePart.inlineData.data;
    }
    
    // If we get here, something else went wrong.
    console.error("No image data found in edited response parts:", JSON.stringify(response, null, 2));
    throw new Error("A edição da imagem falhou ou não retornou dados.");
};

// FIX: Implement and export generateComicScript to be used in ComicCreator
export const generateComicScript = async (storyIdea: string): Promise<ComicScript> => {
    const gemini = createAIInstance();
    const prompt = `Crie um roteiro de história em quadrinhos curto (3 a 6 quadros) com base na seguinte ideia. O roteiro deve ter um título, um resumo de uma frase e uma série de cenas. Cada cena deve ter um número, uma descrição visual detalhada para um gerador de imagens e uma lista de diálogos (que pode ser vazia). Ideia: "${storyIdea}"`;

    const response: GenerateContentResponse = await withRetry(() => gemini.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: comicScriptSchema
        }
    }));
    
    return JSON.parse(response.text);
};

// FIX: Implement and export generateHqPanel to be used in ComicCreator
export const generateHqPanel = async (description: string, dialogue: string[], artStyle: string): Promise<{ image: string; mimeType: string; }> => {
    const dialogueText = dialogue.length > 0 ? ` Diálogos no quadro: ${dialogue.map(d => `"${d}"`).join(', ')}.` : '';
    const prompt = `Crie uma imagem para um quadro de história em quadrinhos. Estilo de arte: ${artStyle}. Descrição da cena: ${description}.${dialogueText} A imagem deve ser vibrante e clara.`;
    
    return generateImage(prompt, '1:1');
};

// FIX: Implement and export generateVideo to be used in VideoCreator
export const generateVideo = async (
    prompt: string,
    image: { base64: string, mimeType: string } | null,
    aspectRatio: '16:9' | '9:16',
    resolution: '720p' | '1080p',
    onProgress: (message: string) => void
): Promise<Blob> => {
    const gemini = createAIInstance();

    onProgress("Iniciando a geração do vídeo...");

    const requestPayload: any = {
        model: MODEL_VIDEO_GENERATION,
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            aspectRatio: aspectRatio,
            resolution: resolution
        }
    };

    if (image) {
        requestPayload.image = {
            imageBytes: image.base64,
            mimeType: image.mimeType,
        };
        if (!prompt) delete requestPayload.prompt;
    } else if (!prompt) {
        throw new Error("Um prompt é necessário se nenhuma imagem for fornecida.");
    }
    
    // FIX: Add VideosOperation type to fix 'done' and 'response' property errors.
    let operation: VideosOperation = await withRetry(() => gemini.models.generateVideos(requestPayload));
    
    onProgress("Operação iniciada. O vídeo está sendo processado...");

    while (!operation.done) {
        onProgress("Aguardando o processamento do vídeo... Isso pode levar alguns minutos.");
        await new Promise(resolve => setTimeout(resolve, 10000));
        try {
            operation = await gemini.operations.getVideosOperation({ operation: operation });
        } catch (e) {
             console.error("Erro ao obter o status da operação, tentando novamente...", e);
        }
    }
    
    onProgress("Processamento concluído. Baixando o vídeo...");

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
        console.error("Falha na geração do vídeo. Nenhuma URL de download retornada.", operation);
        throw new Error("A geração do vídeo falhou ou não retornou um link para download.");
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
         throw new Error("A chave de API não foi encontrada para baixar o vídeo.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);

    if (!videoResponse.ok) {
        const errorBody = await videoResponse.text();
        console.error("Download do vídeo falhou:", errorBody);
        throw new Error(`Falha ao baixar o vídeo. Status: ${videoResponse.status}`);
    }

    onProgress("Download concluído!");
    return await videoResponse.blob();
};