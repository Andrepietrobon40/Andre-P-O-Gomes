import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { fileToBase64, downloadImage } from '../utils/fileUtils';
import Spinner from './Spinner';
import SparklesIcon from './icons/SparklesIcon';
import DownloadIcon from './icons/DownloadIcon';

const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<{ base64: string, dataUrl: string, mimeType: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, envie um arquivo de imagem válido.');
                return;
            }
            setError(null);
            setEditedImage(null);
            const base64 = await fileToBase64(file);
            const dataUrl = URL.createObjectURL(file);
            setOriginalImage({ base64, dataUrl, mimeType: file.type });
        }
    };

    const handleEditImage = async () => {
        if (!originalImage || !editPrompt.trim()) {
            setError('Por favor, envie uma imagem e forneça um comando de edição.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const newImageBase64 = await editImage(originalImage.base64, originalImage.mimeType, editPrompt);
            setEditedImage(newImageBase64);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao editar a imagem. Por favor, tente novamente.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto">
            {!originalImage && (
                <div onClick={triggerFileSelect} className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-orange-500 hover:bg-gray-700/50 transition-colors">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                    <svg className="w-12 h-12 text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <p className="text-xl font-semibold text-white">Clique para enviar uma imagem</p>
                    <p className="text-gray-400">PNG, JPG, GIF até 10MB</p>
                </div>
            )}
            
            {originalImage && (
                <div>
                     <div className="mb-4">
                        <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Ex: Remova a pessoa no fundo"
                            className="w-full bg-gray-700 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-orange-500 focus:ring-orange-500 transition-colors duration-300 h-24 resize-none"
                        />
                        <div className="flex items-center justify-between mt-4">
                             <button onClick={triggerFileSelect} className="text-orange-400 hover:text-orange-300 font-semibold">
                                Trocar Imagem
                             </button>
                             <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
                             <button
                                onClick={handleEditImage}
                                disabled={isLoading || !editPrompt.trim()}
                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <SparklesIcon />
                                {isLoading ? 'Editando...' : 'Aplicar Edição'}
                            </button>
                        </div>
                    </div>
                     {error && <p className="text-center text-red-400 my-4">{error}</p>}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                            <h3 className="text-lg font-semibold text-center mb-3 text-gray-300">Original</h3>
                            <img src={originalImage.dataUrl} alt="Original" className="rounded-lg w-full h-auto object-contain" />
                        </div>
                         <div className="relative">
                            <h3 className="text-lg font-semibold text-center mb-3 text-gray-300">Editada</h3>
                            <div className="rounded-lg w-full h-full bg-gray-700 flex items-center justify-center min-h-[200px] relative group">
                                {isLoading && <Spinner />}
                                {!isLoading && editedImage && originalImage && (
                                    <>
                                        <img src={`data:${originalImage.mimeType};base64,${editedImage}`} alt="Editada" className="rounded-lg w-full h-auto object-contain" />
                                        <button
                                            onClick={() => downloadImage(`data:${originalImage.mimeType};base64,${editedImage}`, 'imagem-editada.png')}
                                            className="absolute top-3 right-3 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            aria-label="Baixar Imagem Editada"
                                        >
                                            <DownloadIcon />
                                        </button>
                                    </>
                                )}
                                {!isLoading && !editedImage && (
                                    <p className="text-gray-400">Sua imagem editada aparecerá aqui</p>
                                )}
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImageEditor;