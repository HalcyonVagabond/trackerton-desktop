import { useState, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';

const APP_VERSION = '0.1.0';
const STORAGE_KEY = 'trackerton-seen-version';

interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
  features: { icon: string; title: string; description: string }[];
}

const RELEASE_NOTES: ReleaseNote = {
  version: APP_VERSION,
  date: 'December 2025',
  highlights: [
    '🎉 Welcome to Trackerton!',
    'Your new favorite time tracking companion',
  ],
  features: [
    {
      icon: '🏢',
      title: 'Organize Everything',
      description: 'Create Organizations, Projects, and Tasks to structure your work exactly how you want.',
    },
    {
      icon: '⏱️',
      title: 'One-Click Tracking',
      description: 'Start and stop timers with a single click. Your time is automatically saved.',
    },
    {
      icon: '📊',
      title: 'Menu Bar Access',
      description: 'Click the Trackerton icon in your menu bar for quick timer controls without switching apps.',
    },
    {
      icon: '⏸️',
      title: 'Smart Auto-Pause',
      description: 'Step away from your computer? Trackerton can automatically pause your timer when you\'re idle.',
    },
    {
      icon: '🌙',
      title: 'Beautiful Themes',
      description: 'Choose between Light, Dark, or System theme. Find it in the settings gear icon.',
    },
    {
      icon: '🔒',
      title: 'Private & Offline',
      description: 'All your data stays on your machine. No accounts, no cloud, no tracking.',
    },
  ],
};

const TUTORIAL_STEPS = [
  {
    title: 'Create an Organization',
    description: 'Start by clicking the + button next to the organization dropdown to create your first organization (e.g., "Personal" or a client name).',
    icon: '🏢',
  },
  {
    title: 'Add a Project',
    description: 'With an organization selected, click "+ New" in the Projects section to create a project.',
    icon: '📁',
  },
  {
    title: 'Create Tasks',
    description: 'Expand a project and click "+ Add Task" to create tasks you want to track time on.',
    icon: '✅',
  },
  {
    title: 'Start Tracking!',
    description: 'Click the green "Start" button on any task to begin tracking. The timer appears at the top and in your menu bar.',
    icon: '▶️',
  },
];

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome, 1-4 = tutorial steps
  const totalSteps = TUTORIAL_STEPS.length + 1;
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? './logo-icon-light.png' : './logo-icon-dark.png';

  useEffect(() => {
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="welcome-modal-overlay" onClick={handleSkip}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        {currentStep === 0 ? (
          // Welcome / Release Notes Screen
          <div className="welcome-modal__content">
            <div className="welcome-modal__header">
              <img 
                src={logoSrc} 
                alt="Trackerton" 
                className="welcome-modal__logo"
              />
              <h1 className="welcome-modal__title">Welcome to Trackerton</h1>
              <p className="welcome-modal__version">v{RELEASE_NOTES.version} • {RELEASE_NOTES.date}</p>
            </div>

            <div className="welcome-modal__features">
              {RELEASE_NOTES.features.map((feature, index) => (
                <div key={index} className="welcome-modal__feature">
                  <span className="welcome-modal__feature-icon">{feature.icon}</span>
                  <div className="welcome-modal__feature-text">
                    <strong>{feature.title}</strong>
                    <span>{feature.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Tutorial Steps
          <div className="welcome-modal__content welcome-modal__content--tutorial">
            <div className="welcome-modal__tutorial-icon">
              {TUTORIAL_STEPS[currentStep - 1].icon}
            </div>
            <h2 className="welcome-modal__tutorial-title">
              {TUTORIAL_STEPS[currentStep - 1].title}
            </h2>
            <p className="welcome-modal__tutorial-desc">
              {TUTORIAL_STEPS[currentStep - 1].description}
            </p>
          </div>
        )}

        {/* Progress Dots */}
        <div className="welcome-modal__progress">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <button
              key={index}
              className={`welcome-modal__dot ${index === currentStep ? 'welcome-modal__dot--active' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="welcome-modal__actions">
          <button 
            className="welcome-modal__btn welcome-modal__btn--ghost"
            onClick={handleSkip}
          >
            Skip
          </button>
          <div className="welcome-modal__actions-right">
            {currentStep > 0 && (
              <button 
                className="welcome-modal__btn welcome-modal__btn--secondary"
                onClick={handlePrev}
              >
                Back
              </button>
            )}
            <button 
              className="welcome-modal__btn welcome-modal__btn--primary"
              onClick={handleNext}
            >
              {currentStep === totalSteps - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
