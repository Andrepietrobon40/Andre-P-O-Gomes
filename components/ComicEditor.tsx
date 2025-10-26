import React, { useRef, useEffect, useState } from 'react';
import BrushIcon from './icons/BrushIcon';
import EraserIcon from './icons/EraserIcon';

interface ComicEditorProps {
    imageDataUrl: string;
    onSave: (newImageBase64: string) => void;
    onClose: () => void;
}

const ComicEditor: React.FC<ComicEditorProps> = ({ imageDataUrl, onSave, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [brushColor, setBrushColor] = useState('#000000');
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context && container) {
            const image = new Image();
            image.src = imageDataUrl;
            image.onload = () => {
                const maxWidth = window.innerWidth * 0.8;
                const maxHeight = window.innerHeight * 0.7;
                let { width, height } = image;
                const ratio = width / height;

                if (width > maxWidth) {
                    width = maxWidth;
                    height = width / ratio;
                }
                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * ratio;
                }
                
                // Set container and canvas dimensions
                container.style.width = `${width}px`;
                container.style.height = `${height}px`;
                canvas.width = width;
                canvas.height = height;

                // Set background image on the container
                container.style.backgroundImage = `url(${imageDataUrl})`;
                container.style.backgroundSize = 'contain';
                container.style.backgroundRepeat = 'no-repeat';
                container.style.backgroundPosition = 'center';

                // Clear canvas for drawing
                context.clearRect(0, 0, width, height);
            };
        }
    }, [imageDataUrl]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number, y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        lastPos.current = pos;
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            const currentPos = getMousePos(e);
            
            context.beginPath();
            context.moveTo(lastPos.current.x, lastPos.current.y);
            context.lineTo(currentPos.x, currentPos.y);

            context.lineWidth = brushSize;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            
            if (tool === 'brush') {
                context.globalCompositeOperation = 'source-over';
                context.strokeStyle = brushColor;
            } else { // eraser
                context.globalCompositeOperation = 'destination-out';
            }
            
            context.stroke();
            context.closePath();

            lastPos.current = currentPos;
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
             const context = canvasRef.current?.getContext('2d');
             if(context) {
                // Reset composite operation to default to avoid affecting next brush stroke
                context.globalCompositeOperation = 'source-over';
             }
            setIsDrawing(false);
        }
    };

    const handleSave = () => {
        const finalCanvas = document.createElement('canvas');
        const finalContext = finalCanvas.getContext('2d');
        const drawingCanvas = canvasRef.current;
        const container = containerRef.current;

        if (finalContext && drawingCanvas && container) {
            const width = drawingCanvas.width;
            const height = drawingCanvas.height;
            finalCanvas.width = width;
            finalCanvas.height = height;

            // Draw original image first
            const image = new Image();
            image.onload = () => {
                finalContext.drawImage(image, 0, 0, width, height);
                // Draw the user's edits on top
                finalContext.drawImage(drawingCanvas, 0, 0, width, height);
                // Get merged result
                const dataUrl = finalCanvas.toDataURL('image/png').split(',')[1];
                onSave(dataUrl);
            };
            image.src = imageDataUrl;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-w-full">
                <h3 className="text-xl font-bold text-white text-center">Editor de Painel</h3>
                <div className="bg-gray-900 rounded-lg p-2 flex flex-wrap items-center justify-center gap-4">
                    <button onClick={() => setTool('brush')} className={`p-2 rounded-md ${tool === 'brush' ? 'bg-orange-600' : 'bg-gray-700'}`}><BrushIcon/></button>
                    <button onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-orange-600' : 'bg-gray-700'}`}><EraserIcon /></button>
                    <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-10 h-10 bg-gray-700 rounded-md cursor-pointer" disabled={tool==='eraser'} />
                    <div className="flex items-center gap-2 text-white">
                        <label htmlFor="brushSize" className="text-sm">Tamanho:</label>
                        <input type="range" id="brushSize" min="1" max="50" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value))} className="w-32" />
                    </div>
                </div>
                <div className="flex justify-center">
                    <div ref={containerRef} className="relative rounded-lg overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="absolute top-0 left-0 cursor-crosshair"
                        />
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="py-2 px-5 bg-gray-600 text-white font-semibold rounded-full hover:bg-gray-500 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="py-2 px-5 bg-orange-600 text-white font-semibold rounded-full hover:bg-orange-700 transition-colors">Salvar Edições</button>
                </div>
            </div>
        </div>
    );
};

export default ComicEditor;