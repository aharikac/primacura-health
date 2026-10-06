import React from 'react';
import { User, ShieldPlus, ArrowLeft } from 'lucide-react';

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="about-screen">
      
      {/* Standardized Header using index.css classes */}
      <header className="inner-page-header">
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label="Back to home">
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            Home
          </button>
          
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">The First Care</span>
          </div>
        </div>

        <div className="header-title-row">
          <h1>About PrimaCura</h1>
          <p>The First Care mission and developer.</p>
        </div>
      </header>

      {/* Content Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <div className="space-y-8 text-lg text-gray-600 leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldPlus size={20} className="text-red-500" />
              The Mission
            </h2>
            <p>
              When a medical emergency strikes, panic often follows. PrimaCura Health was built to bridge the critical gap between an incident occurring and professional medical help arriving. By providing clear, step-by-step, voice-enabled first-aid protocols, this platform ensures that anyone can take immediate, life-saving action when seconds matter most.
            </p>
          </section>

          <section className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User size={20} className="text-red-500" />
              The Developer
            </h2>
            <p className="mb-4">
              PrimaCura Health was designed and engineered entirely by Harika Appalla, a 14-year-old 9th grader with a passion for using technology to make a tangible difference in people's lives. 
            </p>
            <p className="italic text-gray-700 border-l-4 border-red-500 pl-4">
              "I built this app hoping it will help someone in a moment of desperate need. Even if PrimaCura helps just one single person manage an emergency safely, my entire goal has been achieved."
            </p>
          </section>
        </div>
      </div>
      
    </main>
  );
}
