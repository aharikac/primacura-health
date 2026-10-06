import React, { useState } from 'react';
import { ArrowLeft, Send, Loader2, Mail } from 'lucide-react';

export function ContactScreen({ onBack }: { onBack: () => void }) {
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
          <h1>Contact Us</h1>
          <p>Get in touch with the team.</p>
        </div>
      </header>

      <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
        <p style={{ margin: 0, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail size={18} color="#e63946" />
          Reach us directly at:
        </p>
        <a href="mailto:contactprimacura@gmail.com" style={{ color: '#e63946', fontWeight: 700, textDecoration: 'none', display: 'block', marginTop: '4px', marginLeft: '26px' }}>
          contactprimacura@gmail.com
        </a>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div>
          <label htmlFor="name" style={labelStyle}>Name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            placeholder="Your Name"
          />
        </div>

        <div>
          <label htmlFor="email" style={labelStyle}>Email Address</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
            <label htmlFor="message" style={{ ...labelStyle, marginBottom: 0 }}>Message</label>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: message.length >= 1000 ? '#e63946' : '#6b7280' }}>
              {message.length} / 1000
            </span>
          </div>
          <textarea
            id="message"
            required
            maxLength={1000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...inputStyle, resize: 'none' }}
            placeholder="How can we help you?"
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
            <><Loader2 size={20} className="spin" /> <span>Sending...</span></>
          ) : (
            <><Send size={20} /> <span>Send Message</span></>
          )}
        </button>

        {status === 'success' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
            Thank you! Your message has been sent successfully.
          </div>
        )}
        
        {status === 'error' && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
            Failed to send message. Please try again or email us directly.
          </div>
        )}
      </form>
    </main>
  );
}
