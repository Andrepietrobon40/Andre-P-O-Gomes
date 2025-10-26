import React from 'react';

const EraserIcon: React.FC<{className?: string}> = ({className = "h-5 w-5 text-white"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-1.5l-5.231 5.231m5.231-5.231L10.5 12m5.231 5.231l-5.231-5.231m0 0L10.5 12m3.75 4.5l-5.231-5.231M10.5 12l-5.231 5.231" />
    </svg>
);

export default EraserIcon;
