import React, { useState, useCallback, useRef } from 'react';
import type { Post, StructuredText } from './types';
import { generateInitialPosts, editImage as editImageAPI } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import PostCard from './components/PostCard';
import Spinner from './components/Spinner';
import SparklesIcon from './components/icons/SparklesIcon';
import ImageEditor from './components/ImageEditor';
import ImageGenerator from './components/ImageGenerator';
import RemoveIcon from './components/icons/RemoveIcon';

type PostType = 'single' | 'carousel';
type ActiveTab = 'creator' | 'editor' | 'generator';

const VISUAL_STYLES = ['Moderno', 'Tech', 'Dark', 'Vibrante', 'Elegante', 'Natureza', 'Realismo', 'Anime'];

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [postType, setPostType] = useState<PostType>('single');
    const [includeCaption, setIncludeCaption] = useState<boolean>(true);
    const [posts, setPosts] = useState<Post[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('creator');
    const [uploadedImage, setUploadedImage] = useState<{ base64: string; dataUrl: string; mimeType: string } | null>(null);
    const imageCreatorInputRef = useRef<HTMLInputElement>(null);
    const [visualStyle, setVisualStyle] = useState<string>('Moderno');

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Por favor, envie um arquivo de imagem válido (PNG, JPG, etc.).');
                return;
            }
            setError(null);
            try {
                const base64 = await fileToBase64(file);
                const dataUrl = URL.createObjectURL(file);
                setUploadedImage({ base64, dataUrl, mimeType: file.type });
            } catch (e) {
                console.error("Error processing file:", e);
                setError("Ocorreu um erro ao processar sua imagem.");
            }
        }
    };

    const handleRemoveImage = () => {
        if (uploadedImage) {
            URL.revokeObjectURL(uploadedImage.dataUrl);
        }
        setUploadedImage(null);
        if (imageCreatorInputRef.current) {
            imageCreatorInputRef.current.value = '';
        }
    };
    
    const triggerImageUpload = () => imageCreatorInputRef.current?.click();

    const handleGeneratePosts = async () => {
        if (!prompt.trim() && !uploadedImage) {
            setError('Por favor, insira um comando ou envie uma imagem.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPosts(null);
        try {
            const styleInstruction = `com um estilo visual ${visualStyle}`;
            const enhancedPrompt = prompt.trim() ? `${prompt.trim()} ${styleInstruction}` : styleInstruction;
            const imagePayload = uploadedImage ? { base64: uploadedImage.base64, mimeType: uploadedImage.mimeType } : undefined;
            const generatedPosts = await generateInitialPosts(enhancedPrompt, postType, imagePayload, includeCaption);
            setPosts(generatedPosts);
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao gerar os posts. Por favor, tente novamente.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageEdit = useCallback(async (postId: string, editPrompt: string): Promise<void> => {
        const postToEdit = posts?.find(p => p.id === postId);
        if (!postToEdit) return;

        try {
            const newImageBase64 = await editImageAPI(postToEdit.image, postToEdit.imageMimeType, editPrompt);
            setPosts(currentPosts => 
                currentPosts?.map(p => 
                    p.id === postId ? { ...p, image: newImageBase64 } : p
                ) || null
            );
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error ? e.message : 'Falha ao editar a imagem. Por favor, tente novamente.';
            alert(errorMessage);
        }
    }, [posts]);

    const handleCaptionChange = useCallback((postId: string, newIndex: number) => {
        setPosts(currentPosts => 
            currentPosts?.map(p => 
                p.id === postId ? { ...p, activeTextIndex: newIndex } : p
            ) || null
        );
    }, []);
    
    const handleCaptionPartChange = useCallback((postId: string, part: keyof StructuredText, value: string) => {
        setPosts(currentPosts =>
            currentPosts?.map(p => {
                if (p.id === postId && p.texts[p.activeTextIndex]) {
                    // Crie uma cópia profunda dos textos para evitar mutação direta do estado
                    const newTexts = JSON.parse(JSON.stringify(p.texts));
                    newTexts[p.activeTextIndex][part] = value;
                    return { ...p, texts: newTexts };
                }
                return p;
            }) || null
        );
    }, []);

    const renderTabButton = (tab: ActiveTab, label: string) => (
         <button onClick={() => setActiveTab(tab)} className={`py-3 px-6 text-lg font-medium transition-colors duration-300 ${activeTab === tab ? 'text-orange-400 border-b-2 border-orange-400' : 'text-gray-400 hover:text-white'}`}>
            {label}
        </button>
    );

    return (
        <div className="bg-gray-900 min-h-screen text-white font-sans">
            <div className="container mx-auto px-4 py-8">
                <header className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                        GÊNIO POST
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">
                        Crie e Edite Conteúdo Profissional para Redes Sociais com um Simples Comando
                    </p>
                </header>

                <div className="max-w-5xl mx-auto mb-12">
                     <div className="flex justify-center border-b border-gray-700 mb-8 flex-wrap">
                        {renderTabButton('creator', 'Criador de Posts')}
                        {renderTabButton('editor', 'Editor de Imagens')}
                        {renderTabButton('generator', 'Gerador de Imagens')}
                    </div>

                    {activeTab === 'creator' && (
                        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">1. Descreva seu post</h3>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Ex: Anúncio da inauguração de uma nova cafeteria vegana... ou envie uma imagem e descreva o post."
                                        className="w-full bg-gray-700 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-orange-500 focus:ring-orange-500 transition-colors duration-300 h-40 resize-none"
                                    />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-300 mb-2">2. Envie uma imagem (Opcional)</h3>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" ref={imageCreatorInputRef} />
                                    {uploadedImage ? (
                                        <div className="relative group">
                                            <img src={uploadedImage.dataUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                                            <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-1.5 rounded-full hover:bg-opacity-80 transition-all opacity-0 group-hover:opacity-100" aria-label="Remover imagem">
                                                <RemoveIcon />
                                            </button>
                                        </div>
                                    ) : (
                                        <div onClick={triggerImageUpload} className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-orange-500 hover:bg-gray-700/50 transition-colors">
                                            <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <p className="font-semibold text-white">Clique para enviar</p>
                                            <p className="text-xs text-gray-400">Ou a IA irá gerar uma para você</p>
                                        </div>
                                    )}
                                </div>
                           </div>
                           <div className="mt-6 pt-6 border-t border-gray-700">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="flex items-center gap-4 bg-gray-700 rounded-full p-1">
                                        {(['single', 'carousel'] as PostType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setPostType(type)}
                                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${postType === type ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}
                                            >
                                                {type === 'single' ? 'Post Único' : 'Carrossel'}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="include-caption"
                                            checked={includeCaption}
                                            onChange={(e) => setIncludeCaption(e.target.checked)}
                                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 bg-gray-700"
                                        />
                                        <label htmlFor="include-caption" className="text-sm text-gray-300 select-none">Incluir legenda de IA</label>
                                    </div>
                                    
                                    <div className="w-full max-w-xl">
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
                                    
                                    <div className="w-full pt-4">
                                        <button
                                            onClick={handleGeneratePosts}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        >
                                            <SparklesIcon />
                                            {isLoading ? 'Gerando...' : 'Gerar Posts'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'creator' && (
                    <>
                        {error && <p className="text-center text-red-400 mt-4">{error}</p>}
                        
                        {isLoading && (
                            <div className="text-center py-10">
                                <Spinner />
                                <p className="mt-4 text-gray-300">Criando seu conteúdo... isso pode levar um momento.</p>
                            </div>
                        )}

                        {posts && (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {posts.map(post => (
                                    <PostCard 
                                        key={post.id} 
                                        post={post} 
                                        onImageEdit={handleImageEdit}
                                        onCaptionChange={handleCaptionChange}
                                        onCaptionPartChange={handleCaptionPartChange}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'editor' && <ImageEditor />}
                {activeTab === 'generator' && <ImageGenerator />}
            </div>
        </div>
    );
};

export default App;