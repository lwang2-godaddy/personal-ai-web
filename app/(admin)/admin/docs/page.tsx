'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api/client';

interface DocSection {
  id: string;
  title: string;
  icon: string;
  items: DocItem[];
}

interface DocItem {
  id: string;
  title: string;
  path: string;
  description?: string;
}

const WEB_DOCS: DocSection[] = [
  {
    id: 'web-overview',
    title: 'Overview',
    icon: '🌐',
    items: [
      { id: 'readme', title: 'Documentation Index', path: 'README.md', description: 'Quick links and project overview' },
      { id: 'architecture', title: 'Architecture', path: 'ARCHITECTURE.md', description: 'System architecture and data flow' },
    ],
  },
  {
    id: 'web-technical',
    title: 'Technical Reference',
    icon: '⚙️',
    items: [
      { id: 'api', title: 'API Reference', path: 'API_REFERENCE.md', description: '51+ API endpoints' },
      { id: 'database', title: 'Database Schema', path: 'DATABASE_SCHEMA.md', description: 'Firestore collections & models' },
      { id: 'services', title: 'Services', path: 'SERVICES.md', description: 'Business logic services' },
      { id: 'components', title: 'Components', path: 'COMPONENTS.md', description: '60+ UI components' },
    ],
  },
  {
    id: 'web-infrastructure',
    title: 'Infrastructure',
    icon: '🏗️',
    items: [
      { id: 'auth', title: 'Authentication', path: 'infrastructure/AUTHENTICATION.md', description: 'Firebase Auth & middleware' },
      { id: 'state', title: 'State Management', path: 'infrastructure/STATE_MANAGEMENT.md', description: 'Redux architecture' },
      { id: 'external', title: 'External Services', path: 'infrastructure/EXTERNAL_SERVICES.md', description: 'OpenAI, Pinecone, Firebase' },
      { id: 'deployment', title: 'Deployment', path: 'infrastructure/DEPLOYMENT.md', description: 'Vercel deployment' },
    ],
  },
  {
    id: 'web-features',
    title: 'Features',
    icon: '✨',
    items: [
      { id: 'dashboard', title: 'Dashboard', path: 'features/DASHBOARD.md', description: 'Stats and quick input' },
      { id: 'chat', title: 'Chat & RAG', path: 'features/CHAT_RAG.md', description: 'AI chat interface' },
      { id: 'circles', title: 'Circles', path: 'features/CIRCLES.md', description: 'Social circles' },
      { id: 'events', title: 'Events', path: 'features/EVENTS.md', description: 'Calendar & reminders' },
      { id: 'settings', title: 'Settings', path: 'features/SETTINGS.md', description: 'User preferences' },
      { id: 'admin', title: 'Admin', path: 'features/ADMIN.md', description: 'Admin dashboard' },
    ],
  },
];

const MOBILE_DOCS: DocSection[] = [
  {
    id: 'mobile-overview',
    title: 'Overview',
    icon: '📱',
    items: [
      { id: 'mobile-readme', title: 'Mobile App Guide', path: 'mobile/README.md', description: 'React Native app overview' },
      { id: 'mobile-architecture', title: 'Architecture', path: 'mobile/ARCHITECTURE.md', description: 'Mobile app architecture' },
    ],
  },
  {
    id: 'mobile-native',
    title: 'Native Features',
    icon: '🔧',
    items: [
      { id: 'mobile-healthkit', title: 'HealthKit & Google Fit', path: 'mobile/HEALTH_DATA.md', description: 'Health data collection' },
      { id: 'mobile-location', title: 'Background Location', path: 'mobile/LOCATION.md', description: 'GPS tracking' },
      { id: 'mobile-voice', title: 'Voice Recording', path: 'mobile/VOICE.md', description: 'Audio recording & TTS' },
    ],
  },
  {
    id: 'mobile-services',
    title: 'Services',
    icon: '🛠️',
    items: [
      { id: 'mobile-services-ref', title: 'Mobile Services', path: 'mobile/SERVICES.md', description: 'Business logic services' },
      { id: 'mobile-sync', title: 'Sync & Storage', path: 'mobile/SYNC.md', description: 'WatermelonDB & cloud sync' },
    ],
  },
  {
    id: 'mobile-build',
    title: 'Build & Deploy',
    icon: '🚀',
    items: [
      { id: 'mobile-build-ref', title: 'Build Guide', path: 'mobile/BUILD.md', description: 'iOS & Android builds' },
      { id: 'mobile-firebase', title: 'Firebase Functions', path: 'mobile/FIREBASE_FUNCTIONS.md', description: 'Cloud Functions' },
    ],
  },
];

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'web' | 'mobile'>('web');

  const loadDoc = async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get(`/api/admin/docs?path=${encodeURIComponent(path)}`);
      const data = await ApiClient.handleResponse(response);
      setDocContent(data.content);
      setSelectedDoc(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documentation');
    } finally {
      setIsLoading(false);
    }
  };

  const docs = activeTab === 'web' ? WEB_DOCS : MOBILE_DOCS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documentation</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive documentation for Personal AI Web and Mobile applications
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('web')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'web'
              ? 'bg-white text-red-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🌐 Web App
        </button>
        <button
          onClick={() => setActiveTab('mobile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'mobile'
              ? 'bg-white text-red-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📱 Mobile App
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0">
          <nav className="space-y-4">
            {docs.map((section) => (
              <div key={section.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <span>{section.icon}</span>
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => loadDoc(item.path)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedDoc === item.path
                            ? 'bg-red-50 text-red-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <div className="font-medium">{item.title}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 min-h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={() => selectedDoc && loadDoc(selectedDoc)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : selectedDoc ? (
              <div className="p-6">
                <article
                  className="prose prose-lg max-w-none text-gray-800 prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 prose-a:text-red-600 prose-code:text-red-700 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-th:text-gray-900 prose-td:text-gray-700 prose-blockquote:text-gray-600 prose-blockquote:border-red-300"
                  dangerouslySetInnerHTML={{ __html: docContent }}
                />
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select a document
                </h3>
                <p>Choose a topic from the sidebar to view documentation</p>

                {/* Quick Start Cards */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                  <button
                    onClick={() => loadDoc('README.md')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <div className="text-2xl mb-2">🚀</div>
                    <div className="font-medium text-gray-900">Getting Started</div>
                    <div className="text-sm text-gray-500">Quick overview and setup guide</div>
                  </button>
                  <button
                    onClick={() => loadDoc('ARCHITECTURE.md')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <div className="text-2xl mb-2">🏗️</div>
                    <div className="font-medium text-gray-900">Architecture</div>
                    <div className="text-sm text-gray-500">System design and data flow</div>
                  </button>
                  <button
                    onClick={() => loadDoc('API_REFERENCE.md')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <div className="text-2xl mb-2">🔌</div>
                    <div className="font-medium text-gray-900">API Reference</div>
                    <div className="text-sm text-gray-500">51+ API endpoints documentation</div>
                  </button>
                  <button
                    onClick={() => loadDoc('features/CHAT_RAG.md')}
                    className="p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                  >
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="font-medium text-gray-900">RAG System</div>
                    <div className="text-sm text-gray-500">AI chat and retrieval system</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
