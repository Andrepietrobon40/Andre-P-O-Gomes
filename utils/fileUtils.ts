import { StructuredText } from "../types";

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const downloadImage = (imageDataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const mergeTextAndImage = (
    base64Image: string, 
    mimeType: string, 
    text: StructuredText
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return reject(new Error('Could not get canvas context'));
        }

        const image = new Image();
        image.onload = () => {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            // --- Constants ---
            const padding = canvas.width * 0.08;
            const maxWidth = canvas.width - (padding * 2);

            // --- Draw Gradient for Readability ---
            const gradient = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // --- Text Wrapping Logic ---
            const wrapText = (context: CanvasRenderingContext2D, textToWrap: string, x: number, y: number, maxW: number, lineH: number): string[] => {
                const words = textToWrap.split(' ');
                let line = '';
                const lines = [];

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    if (metrics.width > maxW && n > 0) {
                        lines.push(line.trim());
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line.trim());
                return lines;
            };

            // --- Draw Headline ---
            const headlineFontSize = Math.max(32, Math.round(canvas.width / 15));
            ctx.font = `900 ${headlineFontSize}px sans-serif`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const headlineLineHeight = headlineFontSize * 1.1;
            const headlineLines = wrapText(ctx, text.headline, padding, 0, maxWidth, headlineLineHeight);
            const headlineTotalHeight = headlineLines.length * headlineLineHeight;

            // --- Draw CTA ---
            const ctaFontSize = Math.max(18, Math.round(canvas.width / 30));
            ctx.font = `700 ${ctaFontSize}px sans-serif`;
            const ctaMetrics = ctx.measureText(text.cta);
            const ctaHeight = ctaFontSize * 1.6;
            const ctaY = canvas.height - padding;

            // Draw CTA Background
            const ctaBgPadding = ctaFontSize * 0.4;
            ctx.fillStyle = '#DC2626'; // red-600
            ctx.beginPath();
            ctx.roundRect(padding, ctaY - ctaHeight + ctaBgPadding / 2, ctaMetrics.width + ctaBgPadding * 2, ctaHeight, 8);
            ctx.fill();
            
            // Draw CTA Text
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'middle';
            ctx.fillText(text.cta, padding + ctaBgPadding, ctaY - ctaHeight / 2 + ctaBgPadding/2);
            
            // --- Position and Draw Headline ---
            const headlineY = ctaY - ctaHeight - (padding * 0.5);
            ctx.font = `900 ${headlineFontSize}px sans-serif`;
            ctx.textBaseline = 'bottom';
            for (let i = 0; i < headlineLines.length; i++) {
                ctx.fillText(headlineLines[i], padding, headlineY - (headlineLines.length - 1 - i) * headlineLineHeight);
            }
            
            // --- Draw Tag ---
            const tagY = headlineY - headlineTotalHeight - (padding * 0.5);
            const tagFontSize = Math.max(16, Math.round(canvas.width / 35));
            ctx.font = `600 ${tagFontSize}px sans-serif`;
            const tagMetrics = ctx.measureText(text.tag);
            const tagHeight = tagFontSize * 1.8;

            // Draw Tag Background
            ctx.fillStyle = '#F97316'; // orange-500
            ctx.beginPath();
            ctx.roundRect(padding, tagY - tagHeight, tagMetrics.width + (tagFontSize * 1.5), tagHeight, 8);
            ctx.fill();
            
            // Draw Tag Text
            ctx.fillStyle = 'white';
            ctx.textBaseline = 'middle';
            ctx.fillText(text.tag, padding + (tagFontSize*0.75), tagY - tagHeight/2);
            
            resolve(canvas.toDataURL('image/png'));
        };

        image.onerror = (error) => {
            reject(error);
        };

        image.src = `data:${mimeType};base64,${base64Image}`;
    });
};
