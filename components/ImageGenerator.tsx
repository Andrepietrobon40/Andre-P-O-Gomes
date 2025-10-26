import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { downloadImage } from '../utils/fileUtils';
import Spinner from './Spinner';
import SparklesIcon from './icons/SparklesIcon';
import DownloadIcon from './icons/DownloadIcon';

const VISUAL_STYLES = ['Moderno', 'Tech', 'Dark', 'Vibrante', 'Elegante', 'Natureza', 'Realismo', 'Anime'];

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [visualStyle, setVisualStyle] = useState<string>('Moderno');
    const [generatedImage, setGeneratedImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Por favor, insira um comando para gerar a imagem.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const finalPrompt = `${prompt.trim()}, com um estilo visual ${visualStyle}`;
            const { image: imageBase64, mimeType } = await generateImage(finalPrompt);
            setGeneratedImage({ base64: imageBase64, mimeType });
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao gerar a imagem. Tente novamente.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto">
            <div className="mb-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Um astronauta surfando em uma onda cósmica, estilo synthwave..."
                    className="w-full bg-gray-700 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-orange-500 focus:ring-orange-500 transition-colors duration-300 h-24 resize-none"
                    aria-label="Comando para gerar imagem"
                />
                 <div className="my-4">
                    <h3 className="text-lg font-semibold text-gray-100 mb-3 text-center">Estilo Visual</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {VISUAL_STYLES.map(style => (
                            <button
                                key={style}
                                onClick={() => setVisualStyle(style)}
                                className={`w-full text-center p-3 rounded-lg border-2 transition-colors duration-300 font-medium ${
                                    visualStyle === style 
                                    ? 'bg-orange-600/30 border-orange-500 text-white' 
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleGenerateImage}
                        disabled={isLoading || !prompt.trim()}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <SparklesIcon />
                        {isLoading ? 'Gerando...' : 'Gerar Imagem'}
                    </button>
                </div>
            </div>
            
            {error && <p className="text-center text-red-400 my-4">{error}</p>}

            <div className="mt-6">
                <h3 className="text-lg font-semibold text-center mb-3 text-gray-300">Resultado</h3>
                <div className="rounded-lg w-full bg-gray-700 flex items-center justify-center min-h-[300px] md:min-h-[450px] relative group aspect-square mx-auto" style={{maxWidth: '512px'}}>
                    {isLoading && <Spinner />}
                    {!isLoading && generatedImage && (
                        <>
                            <img src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`} alt="Imagem gerada" className="rounded-lg max-w-full max-h-full object-contain" />
                            <button
                                onClick={() => downloadImage(`data:${generatedImage.mimeType};base64,${generatedImage.base64}`, `genius-post-generated.png`)}
                                className="absolute top-3 right-3 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label="Baixar Imagem Gerada"
                            >
                                <DownloadIcon />
                            </button>
                        </>
                    )}
                    {!isLoading && !generatedImage && (
                        <p className="text-gray-400">Sua imagem gerada aparecerá aqui</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;