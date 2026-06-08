import Stepper from './Stepper.jsx'

export default function Navbar({ step, onHome }) {
  const showStepper = step !== 'landing'

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-6">
      <div
        onClick={onHome}
        className="flex items-center gap-2 select-none cursor-pointer hover:opacity-75 transition-opacity"
      >
        <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="white" className="w-3.5 h-3.5">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8 12a4 4 0 01-3.464-2h6.928A4 4 0 018 12z"/>
          </svg>
        </div>
        <span className="font-semibold text-gray-900 text-sm">InterviewAI</span>
      </div>
      {showStepper && (
        <div className="ml-auto">
          <Stepper step={step} />
        </div>
      )}
    </nav>
  )
}
