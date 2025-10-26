import React, { useState } from 'react';
import { generateComicScript, generateHqPanel } from '../services/geminiService';
import { downloadImage } from '../utils/fileUtils';
import Spinner from './Spinner';
import SparklesIcon from './icons/SparklesIcon';
import DownloadIcon from './icons/DownloadIcon';
import type { ComicScript, GeneratedPanel, Scene } from '../types';

type Step = 'idea' | 'script' | 'panels';
type PanelState = (GeneratedPanel | { isLoading: true; sceneNumber: number; error?: string });

const ART_STYLES = ['Cartoon', 'Mangá', 'Realista', 'Desenho Simples'];

const ComicCreator: React.FC = () => {
    const [step, setStep] = useState<Step>('idea');
    const [storyIdea, setStoryIdea] = useState('');
    const [script, setScript] = useState<ComicScript | null>(null);
    const [panels, setPanels] = useState<PanelState[]>([]);
    const [artStyle, setArtStyle] = useState('Cartoon');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateScript = async () => {
        if (!storyIdea.trim()) {
            setError('Por favor, descreva sua ideia para a história.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setScript(null);
        try {
            const generatedScript = await generateComicScript(storyIdea);
            setScript(generatedScript);
            setStep('script');
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Falha ao gerar o roteiro.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGeneratePanels = async () => {
        if (!script) return;
        setStep('panels');
        setPanels(script.scenes.map(scene => ({ isLoading: true, sceneNumber: scene.sceneNumber })));

        for (const [index, scene] of script.scenes.entries()) {
            try {
                // Adiciona um atraso antes de cada chamada, exceto a primeira, para evitar atingir os limites de taxa.
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // atraso de 2 segundos
                }

                const result = await generateHqPanel(scene.description, scene.dialogue, artStyle);
                setPanels(prevPanels => prevPanels.map(p =>
                    'isLoading' in p && p.sceneNumber === scene.sceneNumber
                        ? { imageBase64: result.image, mimeType: result.mimeType, sceneNumber: scene.sceneNumber }
                        : p
                ));
            } catch (err) {
                 console.error(`Falha ao gerar o painel para a cena ${scene.sceneNumber}`, err);
                 setPanels(prevPanels => prevPanels.map(p =>
                    'isLoading' in p && p.sceneNumber === scene.sceneNumber
                        ? { isLoading: false, sceneNumber: scene.sceneNumber, error: 'Falha ao gerar' }
                        : p
                ));
            }
        }
    };
    
    const handleStartOver = () => {
        setStep('idea');
        setScript(null);
        setPanels([]);
        setError(null);
        setIsLoading(false);
    };
    
    const handleDownloadPanel = (panel: GeneratedPanel) => {
         downloadImage(`data:${panel.mimeType};base64,${panel.imageBase64}`, `quadrinho-quadro-${panel.sceneNumber}.png`);
    };

    const renderStepper = () => (
        <div className="flex items-center justify-center mb-8">
            {['Ideia', 'Roteiro', 'Quadros'].map((label, index) => {
                const stepOrder: Step[] = ['idea', 'script', 'panels'];
                const currentStepIndex = stepOrder.indexOf(step);
                const isActive = index <= currentStepIndex;
                return (
                    <React.Fragment key={label}>
                        <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                {index + 1}
                            </div>
                            <p className={`ml-2 font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>{label}</p>
                        </div>
                        {index < 2 && <div className={`flex-auto h-1 mx-4 ${isActive && index < currentStepIndex ? 'bg-orange-500' : 'bg-gray-700'}`}></div>}
                    </React.Fragment>
                )
            })}
        </div>
    );
    
    const renderIdeaStep = () => (
        <>
            {renderStepper()}
            <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-100 mb-2">1. Comece com sua Ideia</h3>
                <p className="text-gray-400 mb-6">Descreva a história que você quer criar. A IA irá transformá-la em um roteiro de HQ.</p>
                <textarea
                    value={storyIdea}
                    onChange={(e) => setStoryIdea(e.target.value)}
                    placeholder="Ex: Um menino encontra um robô abandonado no quintal e eles se tornam amigos."
                    className="w-full bg-gray-700 text-white p-4 rounded-lg border-2 border-gray-600 focus:border-orange-500 h-32 resize-none"
                />
                <div className="mt-6">
                    <button onClick={handleGenerateScript} disabled={isLoading} className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <><Spinner /> Gerando Roteiro...</> : <><SparklesIcon /> Gerar Roteiro</>}
                    </button>
                </div>
            </div>
        </>
    );

    const renderScriptStep = () => (
        <>
            {renderStepper()}
            <div className="text-center mb-8">
                 <h3 className="text-2xl font-bold text-gray-100 mb-2">2. Roteiro e Estilo</h3>
                 <p className="text-gray-400">Aqui está o roteiro gerado. Agora, escolha o estilo de arte para os quadros.</p>
            </div>
            {script && (
                 <div className="space-y-6 bg-gray-900/50 p-6 rounded-xl border border-gray-700">
                    <h4 className="text-2xl font-bold text-orange-400 text-center">{script.title}</h4>
                    <p className="text-gray-300 text-center italic">"{script.summary}"</p>
                    <div className="space-y-4">
                        {script.scenes.map(scene => (
                            <div key={scene.sceneNumber} className="bg-gray-700/50 p-4 rounded-lg">
                                <p className="font-bold text-white">Quadro {scene.sceneNumber}:</p>
                                <p className="text-gray-300"><span className="font-semibold text-gray-400">Cena:</span> {scene.description}</p>
                                {scene.dialogue.length > 0 && <p className="text-gray-300 mt-1"><span className="font-semibold text-gray-400">Diálogos:</span> {scene.dialogue.map(d => `"${d}"`).join(' / ')}</p>}
                            </div>
                        ))}
                    </div>
                 </div>
            )}
             <div className="mt-6">
                <h4 className="text-lg font-bold text-center text-gray-200 mb-3">Escolha o Estilo de Arte</h4>
                <div className="flex flex-wrap justify-center items-center gap-2 bg-gray-700 rounded-full p-1 max-w-md mx-auto">
                    {ART_STYLES.map(style => (
                        <button key={style} onClick={() => setArtStyle(style)} className={`flex-grow px-4 py-2 rounded-full text-sm font-semibold transition-all ${artStyle === style ? 'bg-orange-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                            {style}
                        </button>
                    ))}
                </div>
             </div>
             <div className="mt-8 flex justify-center gap-4">
                 <button onClick={() => setStep('idea')} className="text-gray-300 font-semibold py-3 px-6 rounded-full hover:bg-gray-700 transition-colors">
                     Voltar
                 </button>
                <button onClick={handleGeneratePanels} className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full hover:from-orange-600 hover:to-orange-700 transition-all">
                    <SparklesIcon /> Gerar Quadros
                </button>
            </div>
        </>
    );

    const renderPanelsStep = () => (
        <>
            {renderStepper()}
             <div className="text-center mb-8">
                 <h3 className="text-2xl font-bold text-gray-100 mb-2">3. Sua História em Quadrinhos!</h3>
                 <p className="text-gray-400">{script?.title}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {panels.map((panel, index) => (
                    <div key={index} className="bg-gray-700/50 p-3 rounded-lg flex flex-col items-center">
                        <p className="font-bold text-white mb-2">Quadro {panel.sceneNumber}</p>
                        <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center relative group">
                             {'isLoading' in panel && panel.isLoading ? (
                                <Spinner />
                            ) : 'error' in panel && panel.error ? (
                                <p className="text-red-400 text-sm p-4 text-center">{panel.error}</p>
                            ) : 'imageBase64' in panel ? (
                                <>
                                    <img src={`data:${panel.mimeType};base64,${panel.imageBase64}`} alt={`Quadro ${panel.sceneNumber}`} className="w-full h-full object-cover rounded-md" />
                                    <button onClick={() => handleDownloadPanel(panel)} className="absolute top-2 right-2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-all opacity-0 group-hover:opacity-100">
                                        <DownloadIcon />
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>
             <div className="mt-8 text-center">
                 <button onClick={handleStartOver} className="text-orange-400 font-semibold py-3 px-6 rounded-full hover:bg-gray-700 transition-colors">
                     Criar Nova História
                 </button>
             </div>
        </>
    );

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-5xl mx-auto min-h-[500px]">
            {error && <p className="text-center text-red-400 my-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
            {step === 'idea' && renderIdeaStep()}
            {step === 'script' && renderScriptStep()}
            {step === 'panels' && renderPanelsStep()}
        </div>
    );
};

export default ComicCreator;