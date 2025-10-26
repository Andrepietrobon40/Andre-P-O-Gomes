import React, { useState, useEffect, useRef } from 'react';
import { generateVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Spinner from './Spinner';
import VideoIcon from './icons/VideoIcon';
import RemoveIcon from './icons/RemoveIcon';
import DownloadIcon from './icons/DownloadIcon';

type AspectRatio = '16:9' | '9:16';
type Resolution = '720p' | '1080p';

const loadingMessages = [
    "Aquecendo os motores de vídeo...",
    "Consultando as musas da criatividade...",
    "Renderizando pixels fotograma a fotograma...",
    "Alinhando os fótons para a cena perfeita...",
    "A magia está quase a acontecer...",
    "Compilando a sua obra-prima digital...",
    "Só mais um momento, polindo as arestas...",
];

const VideoCreator: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<{ base64: string; dataUrl: string; mimeType: string } | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [resolution, setResolution] = useState<Resolution>('720p');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const loadingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            }
        };
        checkKey();

        return () => {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
            }
            if (generatedVideoUrl) {
                URL.revokeObjectURL(generatedVideoUrl);
            }
        };
    }, []);

    useEffect(() => {
        if (isLoading) {
            setLoadingMessage(loadingMessages[0]);
            loadingIntervalRef.current = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 5000);
        } else {
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current);
                loadingIntervalRef.current = null;
            }
        }
    }, [isLoading]);

    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true);
        }
    };
    
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, envie um arquivo de imagem válido (PNG, JPG, etc.).');
                return;
            }
            setError(null);
            const base64 = await fileToBase64(file);
            const dataUrl = URL.createObjectURL(file);
            setImage({ base64, dataUrl, mimeType: file.type });
        }
    };
    
    const handleRemoveImage = () => {
        if (image) URL.revokeObjectURL(image.dataUrl);
        setImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleGenerateVideo = async () => {
        if (!prompt.trim() && !image) {
            setError('Por favor, insira um comando ou envie uma imagem.');
            return;
        }
        setIsLoading(true);
        setError(null);
        if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        setGeneratedVideoUrl(null);
        
        try {
            const videoBlob = await generateVideo(
                prompt, 
                image ? { base64: image.base64, mimeType: image.mimeType } : null,
                aspectRatio, 
                resolution,
                (progressMsg) => { console.log(progressMsg); }
            );
            const url = URL.createObjectURL(videoBlob);
            setGeneratedVideoUrl(url);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao gerar o vídeo.';
            setError(errorMessage);
            if (errorMessage.includes("Requested entity was not found")) {
                setError("Chave de API inválida. Por favor, selecione uma chave de API válida para usar este recurso.");
                setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!apiKeySelected) {
        return (
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-orange-400 mb-4">Recurso Premium: Geração de Vídeo</h3>
                <p className="text-gray-300 mb-6">A criação de vídeos com IA é um recurso avançado. Para utilizá-lo, por favor, selecione sua própria chave de API do Google AI Studio. O uso será cobrado na sua conta Google Cloud.</p>
                <button
                    onClick={handleSelectKey}
                    className="bg-orange-600 text-white font-bold py-3 px-8 rounded-full hover:bg-orange-700 transition-colors"
                >
                    Selecionar Chave de API
                </button>
                <p className="text-xs text-gray-500 mt-4">
                    Para mais informações sobre preços, consulte a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-400">documentação de cobrança</a>.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Coluna de Controles */}
                <div>
                    <div>
                        <label className="block text-xl font-bold text-gray-100 mb-2">1. Descreva seu vídeo</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: Um holograma de néon de um gato a conduzir em alta velocidade" className="w-full bg-gray-700 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-orange-500 h-32 resize-none" />
                    </div>

                    <div className="mt-6">
                        <label className="block text-xl font-bold text-gray-100 mb-2">2. Imagem Inicial (Opcional)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={fileInputRef} />
                        {image ? (
                            <div className="relative group">
                                <img src={image.dataUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                                <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-1.5 rounded-full hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100" aria-label="Remover imagem"><RemoveIcon /></button>
                            </div>
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-orange-500 hover:bg-gray-700/50 transition-colors">
                                <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                <p className="font-semibold text-white">Clique para enviar</p>
                            </div>
                        )}
                    </div>

                     <div className="mt-6">
                        <label className="block text-xl font-bold text-gray-100 mb-2">3. Configurações</label>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Proporção</h4>
                                <div className="flex items-center gap-2 bg-gray-700 rounded-full p-1">
                                    {(['16:9', '9:16'] as AspectRatio[]).map(ratio => <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`w-full px-4 py-2 rounded-full text-sm font-semibold transition-all ${aspectRatio === ratio ? 'bg-orange-600' : 'hover:bg-gray-600'}`}>{ratio === '16:9' ? 'Paisagem' : 'Retrato'}</button>)}
                                </div>
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Resolução</h4>
                                <div className="flex items-center gap-2 bg-gray-700 rounded-full p-1">
                                    {(['720p', '1080p'] as Resolution[]).map(res => <button key={res} onClick={() => setResolution(res)} className={`w-full px-4 py-2 rounded-full text-sm font-semibold transition-all ${resolution === res ? 'bg-orange-600' : 'hover:bg-gray-600'}`}>{res}</button>)}
                                </div>
                            </div>
                        </div>
                     </div>
                     <div className="mt-8">
                        <button onClick={handleGenerateVideo} disabled={isLoading || (!prompt.trim() && !image)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            <VideoIcon />
                            {isLoading ? 'Gerando Vídeo...' : 'Gerar Vídeo'}
                        </button>
                    </div>
                </div>

                {/* Coluna de Resultado */}
                <div>
                     <h3 className="text-xl font-bold text-center mb-4 text-gray-100">Resultado</h3>
                     {error && <p className="text-center text-red-400 my-4">{error}</p>}
                     <div className="rounded-lg w-full bg-gray-900/50 flex items-center justify-center min-h-[400px] aspect-video mx-auto relative group border border-gray-700">
                        {isLoading && <div className="text-center p-4"><Spinner /><p className="mt-4 text-gray-300 animate-pulse">{loadingMessage}</p></div>}
                        {!isLoading && generatedVideoUrl && (
                            <>
                                <video src={generatedVideoUrl} controls autoPlay loop className="max-w-full max-h-full rounded-lg" />
                                <a href={generatedVideoUrl} download={`genius-post-video.mp4`} className="absolute top-2 right-2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-0 group-hover:opacity-100" aria-label="Baixar Vídeo">
                                    <DownloadIcon />
                                </a>
                            </>
                        )}
                        {!isLoading && !generatedVideoUrl && (
                             <div className="text-center text-gray-500">
                                <VideoIcon className="h-16 w-16 mx-auto mb-2" />
                                <p>Seu vídeo gerado aparecerá aqui</p>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default VideoCreator;
