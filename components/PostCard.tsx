import React, { useState } from 'react';
import type { Post, StructuredText } from '../types';
import Spinner from './Spinner';
import EditIcon from './icons/EditIcon';
import DownloadIcon from './icons/DownloadIcon';
import { downloadImage, mergeTextAndImage } from '../utils/fileUtils';

interface PostCardProps {
    post: Post;
    onImageEdit: (postId: string, editPrompt: string) => Promise<void>;
    onCaptionChange: (postId: string, newIndex: number) => void;
    onCaptionPartChange: (postId: string, part: keyof StructuredText, value: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onImageEdit, onCaptionChange, onCaptionPartChange }) => {
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const activeText = post.texts.length > 0 ? post.texts[post.activeTextIndex] : null;

    const handleImageEdit = async () => {
        if (!editPrompt.trim() || isEditingImage) return;
        setIsEditingImage(true);
        try {
            await onImageEdit(post.id, editPrompt);
            setEditPrompt('');
        } catch (error) {
            console.error("Failed to edit image on card:", error);
        } finally {
            setIsEditingImage(false);
        }
    };
    
    const handleDownload = async () => {
        if (!activeText) {
            downloadImage(`data:${post.imageMimeType};base64,${post.image}`, `genius-post-${post.id.substring(0, 8)}.png`);
            return;
        };
        setIsDownloading(true);
        try {
            const mergedImageDataUrl = await mergeTextAndImage(post.image, post.imageMimeType, activeText);
            downloadImage(mergedImageDataUrl, `genius-post-${post.id.substring(0, 8)}.png`);
        } catch (error) {
            console.error("Failed to merge image and text:", error);
            alert("Desculpe, ocorreu um erro ao criar a imagem do seu post.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCycleCaption = () => {
        const newIndex = (post.activeTextIndex + 1) % post.texts.length;
        onCaptionChange(post.id, newIndex);
    };

    const handleTextUpdate = (part: keyof StructuredText, e: React.FocusEvent<HTMLElement>) => {
        if (activeText && e.currentTarget.textContent !== activeText[part]) {
            onCaptionPartChange(post.id, part, e.currentTarget.textContent || '');
        }
    };

    return (
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-transform duration-300 hover:transform hover:-translate-y-2">
            <div className="relative group/card">
                <img
                    src={`data:${post.imageMimeType};base64,${post.image}`}
                    alt="Generated post background"
                    className="w-full h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                    {activeText && (
                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md text-xs opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none">
                            Clique no texto para editar
                        </div>
                    )}
                    {activeText && (
                        <>
                            <div className="mb-auto"></div>
                             <div className="mb-2">
                                <span 
                                    contentEditable
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleTextUpdate('tag', e)}
                                    className="text-sm font-semibold bg-orange-500 px-2 py-1 rounded-md outline-none focus:ring-2 focus:ring-orange-400 focus:bg-orange-600 transition-all cursor-text"
                                >{activeText.tag}</span>
                            </div>
                            <h2 
                                contentEditable
                                suppressContentEditableWarning={true}
                                onBlur={(e) => handleTextUpdate('headline', e)}
                                className="text-2xl font-black leading-tight outline-none focus:ring-2 focus:ring-orange-400 rounded-sm p-1 -m-1 transition-all cursor-text"
                                style={{textShadow: '1px 1px 4px rgba(0,0,0,0.9)'}}
                            >{activeText.headline}</h2>
                            <div className="mt-2">
                                <span 
                                    contentEditable
                                    suppressContentEditableWarning={true}
                                    onBlur={(e) => handleTextUpdate('cta', e)}
                                    className="text-sm font-bold bg-red-600 px-2 py-1 rounded-md outline-none focus:ring-2 focus:ring-orange-400 focus:bg-red-700 transition-all cursor-text"
                                >{activeText.cta}</span>
                            </div>
                        </>
                    )}
                </div>
                {isEditingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <Spinner />
                    </div>
                )}
            </div>
            <div className="p-5 flex-grow flex flex-col bg-gray-800 space-y-4">
                 {post.texts.length > 1 && (
                    <button
                        onClick={handleCycleCaption}
                        className="text-sm text-orange-400 hover:text-orange-300 font-semibold self-start"
                    >
                        Gerar Novas Opções ({post.activeTextIndex + 1}/{post.texts.length})
                    </button>
                )}
               
                <div className="pt-4 border-t border-gray-700 mt-auto">
                     <p className="text-sm font-semibold text-orange-300 mb-2">Ajustes Finais na Imagem</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Editar imagem..."
                            className="flex-grow bg-gray-700 text-white p-2 rounded-md border-2 border-gray-600 focus:border-orange-500 focus:ring-orange-500 text-sm"
                            disabled={isEditingImage}
                        />
                        <button
                            onClick={handleImageEdit}
                            disabled={isEditingImage || !editPrompt.trim()}
                            className="bg-orange-600 p-2 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Editar Imagem"
                        >
                           <EditIcon />
                        </button>
                         <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="bg-green-600 p-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Baixar Post"
                        >
                            {isDownloading ? <Spinner /> : <DownloadIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostCard;