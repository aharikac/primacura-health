import React from 'react';
import { User, ShieldPlus, ArrowLeft, ListChecks, Mic, Speech, MapPin, Quote } from 'lucide-react';

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

      <div className="about-body">
        <section className="about-card">
          <div className="about-card-head">
            <span className="about-icon"><ShieldPlus size={20} strokeWidth={2.4} /></span>
            <h2>The Mission</h2>
          </div>
          <p>
            When a medical emergency strikes, panic often follows. PrimaCura Health was built to bridge the critical gap between an incident occurring and professional medical help arriving. By providing clear, step-by-step, voice-enabled first-aid protocols, this platform ensures that anyone can take immediate, life-saving action when seconds matter most.
          </p>
          <ul className="about-features">
            <li><ListChecks size={18} strokeWidth={2.4} />Step-by-step guides</li>
            <li><Mic size={18} strokeWidth={2.4} />Speak or type</li>
            <li><Speech size={18} strokeWidth={2.4} />Reads steps aloud</li>
            <li><MapPin size={18} strokeWidth={2.4} />Location for 911</li>
          </ul>
        </section>

        <section className="about-card about-card-dev">
          <div className="about-card-head">
            <span className="about-icon"><User size={20} strokeWidth={2.4} /></span>
            <h2>The Developer</h2>
          </div>
          <div className="about-dev-id">
            <span className="about-avatar" aria-hidden="true">HA</span>
            <div>
              <strong className="about-dev-name">Harika Appalla</strong>
              <span>Designer &amp; developer</span>
            </div>
          </div>
          <p>
            PrimaCura Health was designed and engineered by <strong className="about-dev-name">Harika Appalla</strong>, a 14-year-old 9th grader with a passion for using technology to make a tangible difference in people's lives.
          </p>
          <blockquote className="about-quote">
            <Quote size={22} strokeWidth={2.6} aria-hidden="true" />
            <p>I built this app hoping it will help someone in a moment of desperate need. Even if PrimaCura helps just one single person manage an emergency safely, I've achieved my goal.</p>
          </blockquote>
        </section>
      </div>

    </main>
  );
}
