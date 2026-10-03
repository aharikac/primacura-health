import React from 'react';
import { Heart, User, ShieldPlus, ArrowLeft } from 'lucide-react';

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
        <button 
        onClick={onBack}
        className="flex items-center gap-2 font-bold text-gray-900 hover:text-[#d33b32] mb-8 transition-colors"
        >
        <ArrowLeft size={20} strokeWidth={2.5} />
        Home
      </button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <Heart size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">About PrimaCura</h1>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">The First Care</p>
          </div>
        </div>

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
    </div>
  );
}