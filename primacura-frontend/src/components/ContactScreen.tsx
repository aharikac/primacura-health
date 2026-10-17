import React, { useState } from 'react';
import { ArrowLeft, Send, Loader2, Mail } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { MAX_EMAIL_CHARS, MAX_MESSAGE_CHARS, MAX_MESSAGE_WORDS, MAX_NAME_CHARS, countWords, limitWords } from '../lib/limits';

export function ContactScreen({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = name.trim().length > 0 && isEmailValid && message.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    setStatus('submitting');
    
    try {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${BACKEND_URL}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Contact submission failed:', error);
      setStatus('error');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    marginBottom: '16px',
    fontSize: '1rem',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '6px'
  };

  return (
    <main className="contact-screen" style={{ padding: '16px', overflowY: 'auto', maxHeight: '100%', boxSizing: 'border-box' }}>
      <header className="inner-page-header">
        <div className="header-top-row">
          <button className="nav-back-btn" onClick={onBack} aria-label={t('backToHome')}>
            <div className="nav-icon-circle">
              <ArrowLeft size={20} strokeWidth={2.8} color="#050505" />
            </div>
            {t('home')}
          </button>
          
          <div className="inner-brand">
            <span className="inner-brand-title">PrimaCura</span>
            <span className="inner-brand-slogan">{t('slogan')}</span>
          </div>
        </div>

        <div className="header-title-row">
          <h1>{t('contactTitle')}</h1>
          <p>{t('contactSub')}</p>
        </div>
      </header>

      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
        <p style={{ margin: 0, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={18} color="#e63946" />
          {t('reachUs')}
        </p>
        <a href="mailto:contactprimacura@gmail.com" style={{ color: '#e63946', fontWeight: 700, textDecoration: 'none', display: 'block', marginTop: '4px', marginLeft: '26px' }}>
          contactprimacura@gmail.com
        </a>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div>
          <label htmlFor="name" style={labelStyle}>{t('name')}</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            maxLength={MAX_NAME_CHARS}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_CHARS))}
            style={inputStyle}
            placeholder={t('yourName')}
          />
        </div>

        <div>
          <label htmlFor="email" style={labelStyle}>{t('emailAddress')}</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            maxLength={MAX_EMAIL_CHARS}
            onChange={(e) => setEmail(e.target.value.slice(0, MAX_EMAIL_CHARS))}
            style={inputStyle}
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <label htmlFor="message" style={{ ...labelStyle, marginBottom: 0 }}>{t('message')}</label>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: countWords(message) >= MAX_MESSAGE_WORDS ? '#e63946' : '#6b7280' }}>
              {countWords(message)} / {MAX_MESSAGE_WORDS} {t('words')}
            </span>
          </div>
          <textarea
            id="message"
            required
            maxLength={MAX_MESSAGE_CHARS}
            rows={6}
            value={message}
            onChange={(e) => setMessage(limitWords(e.target.value))}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder={t('howHelp')}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting' || !isFormValid}
          style={{
            width: '100%',
            backgroundColor: (status === 'submitting' || !isFormValid) ? '#9ca3af' : '#050505',
            color: '#ffffff',
            fontWeight: 800,
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            cursor: (status === 'submitting' || !isFormValid) ? 'not-allowed' : 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1rem',
            transition: 'background-color 0.2s'
          }}
        >
          {status === 'submitting' ? (
            <><Loader2 size={20} className="spin" /> <span>{t('sending')}</span></>
          ) : (
            <><Send size={20} /> <span>{t('sendMessage')}</span></>
          )}
        </button>

        {status === 'success' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
            {t('sentOk')}
          </div>
        )}
        
        {status === 'error' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
            {t('sendFailed')}
          </div>
        )}
      </form>
    </main>
  );
}
