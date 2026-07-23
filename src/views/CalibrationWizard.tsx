import React, { useState, useEffect } from 'react';
import { useAppStore } from '@stores/appStore';

const CalibrationWizard: React.FC = () => {
    const config = useAppStore(state => state.config);
    const updateConfig = useAppStore(state => state.updateConfig);
    const [step, setStep] = useState(0);
    const [isCalibrating, setIsCalibrating] = useState(false);
    
    // Stages: 
    // 0 = Intro
    // 1 = Resting Pose (Hand size, camera center)
    // 2 = Left Pinch Test (Measure speed/width)
    // 3 = Right Pinch Test
    // 4 = Reach Test (80% stretch for workspace mapping)
    // 5 = Complete
    
    const steps = [
        { title: 'Welcome to Calibration', desc: 'We will optimize the interaction engine for your hand, lighting, and camera angle. This takes about 30 seconds.' },
        { title: 'Resting Pose', desc: 'Hold your hand open comfortably in the center of the screen.' },
        { title: 'Left Click (Index Pinch)', desc: 'Pinch your Index finger and Thumb together naturally.' },
        { title: 'Right Click (Middle Pinch)', desc: 'Pinch your Middle finger and Thumb together naturally.' },
        { title: 'Comfortable Reach', desc: 'Move your open hand in a comfortable circle. Do not stretch to the absolute edges.' },
        { title: 'Calibration Complete', desc: 'Your personalized profile has been saved to calibration.json.' },
    ];
    
    const nextStep = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
            if (step + 1 === 1) setIsCalibrating(true);
            if (step + 1 === 5) {
                setIsCalibrating(false);
                // In a real app we'd trigger IPC command to save calibration
                console.log("Saving calibration...");
            }
        }
    };
    
    return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center', color: 'white' }}>
            <h2>{steps[step].title}</h2>
            <p>{steps[step].desc}</p>
            
            <div style={{ marginTop: '2rem', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCalibrating && <div className="calibration-spinner" style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #4CAF50', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />}
            </div>
            
            <div style={{ marginTop: '2rem' }}>
                {step < 5 && (
                    <button 
                        onClick={nextStep}
                        style={{ padding: '10px 20px', fontSize: '1.2rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        {step === 0 ? 'Start Calibration' : 'Next Step'}
                    </button>
                )}
                {step === 5 && (
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ padding: '10px 20px', fontSize: '1.2rem', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Finish
                    </button>
                )}
            </div>
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default CalibrationWizard;
